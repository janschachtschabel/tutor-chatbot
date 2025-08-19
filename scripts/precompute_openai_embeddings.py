#!/usr/bin/env python3
"""
Precompute OpenAI embeddings for QA JSON datasets, with optional PCA + Int8 quantization
to generate compact binary assets for the web app.

- Loads input JSON array of QA items (expects objects with a 'question' field)
- Computes embeddings using OpenAI 'text-embedding-3-small' (1536 dims)
- Uses asyncio with configurable concurrency and batch size
- Optionally applies PCA dimensionality reduction and L2 normalization, then Int8 quantization
- Can write either: (a) JSON with embedded float vectors (legacy), or (b) compact binary
  files + small meta.json for the app to load efficiently

Usage (Windows PowerShell example):
  $env:OPENAI_API_KEY = "<your-key>"
  # Compact binary (default): PCA 256D + Int8, writes to public/quant/<datasetId>.*
  python scripts/precompute_openai_embeddings.py \
    -i src/data/qa_Klexikon-Prod-180825.json \
    --out-dir public/quant \
    --pca-dim 256 --quantize

  # Legacy JSON export with float vectors injected:
  python scripts/precompute_openai_embeddings.py \
    -i src/data/qa_Klexikon-Prod-180825.json \
    -o src/data/qa_Klexikon-Prod-180825_embedding.json \
    --format json --no-quantize --no-pca

Alternatively set DEFAULT_INPUT_PATH at the top of this file and call without -i/-o.

Requires:
  pip install --upgrade openai numpy
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

try:
    from openai import AsyncOpenAI
    from openai import APIError
except Exception:  # pragma: no cover
    print("Missing dependency: openai. Install with: pip install --upgrade openai", file=sys.stderr)
    raise

try:
    import numpy as np
except Exception:
    print("Missing dependency: numpy. Install with: pip install --upgrade numpy", file=sys.stderr)
    raise

MODEL = "text-embedding-3-small"
EXPECTED_DIM = 1536

# Configure defaults here so you can run without CLI args
# Use repo-relative paths or absolute paths
DEFAULT_INPUT_PATH: Optional[str] = "src/data/qa_Klexikon-Prod-180825.json"
DEFAULT_OUTPUT_PATH: Optional[str] = None  # None => derive as <input>_embedding.json


@dataclass
class Options:
    batch_size: int = 32
    concurrency: int = 20
    max_retries: int = 5
    initial_delay_ms: int = 500
    max_delay_ms: int = 8000
    # compact export options
    format: str = "bin"  # 'bin' or 'json'
    out_dir: Optional[str] = "public/quant"
    dataset_id: Optional[str] = None
    pca_dim: Optional[int] = 256
    use_pca: bool = True
    quantize: bool = True


def backoff_delay_ms(attempt: int, initial_ms: int, max_ms: int) -> int:
    base = min(max_ms, int(initial_ms * (2 ** attempt)))
    jitter = base * (0.5 + os.urandom(1)[0] / 255.0)  # simple jitter using random byte
    return int(min(max_ms, jitter))


async def embed_batch_with_retry(client: AsyncOpenAI, texts: List[str], opts: Options,
                                 batch_range: Tuple[int, int]) -> List[List[float]]:
    last_err: Optional[Exception] = None
    for attempt in range(opts.max_retries + 1):
        try:
            resp = await client.embeddings.create(model=MODEL, input=texts)
            vecs = [d.embedding for d in resp.data]
            # Basic shape validation
            for v in vecs:
                if len(v) != EXPECTED_DIM:
                    raise RuntimeError(f"Embedding dim mismatch: got {len(v)} expected {EXPECTED_DIM}")
            return vecs
        except Exception as e:  # Includes APIError/RateLimitError/Network errors
            last_err = e
            # Determine retryable
            status = getattr(getattr(e, 'response', None), 'status_code', None) or getattr(e, 'status_code', None)
            retryable = (status is None) or (status == 429) or (500 <= int(status) < 600)
            if attempt >= opts.max_retries or not retryable:
                start, end = batch_range
                raise RuntimeError(f"Failed embedding batch {start+1}-{end} after retries: {e}") from e
            delay = backoff_delay_ms(attempt, opts.initial_delay_ms, opts.max_delay_ms) / 1000.0
            await asyncio.sleep(delay)
    assert last_err is not None
    raise last_err


async def process_dataset(input_path: str, output_path: Optional[str], opts: Options) -> str:
    # Read JSON
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Input JSON must be an array of QA objects")

    # Prepare items
    items: List[Dict[str, Any]] = data
    texts: List[Tuple[int, str]] = []  # (index, question)
    for i, obj in enumerate(items):
        q = (obj.get("question") or "").strip()
        if q:
            texts.append((i, q))

    if not texts:
        # Nothing to embed; just write out copy
        out_path = output_path or default_output_path(input_path)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        return out_path

    # Build batches
    batch_size = max(1, opts.batch_size)
    batches: List[List[Tuple[int, str]]] = [
        texts[i : i + batch_size] for i in range(0, len(texts), batch_size)
    ]

    # Async client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY env var is required")
    client = AsyncOpenAI(api_key=api_key)

    # Concurrency semaphore
    sem = asyncio.Semaphore(max(1, opts.concurrency))

    # Result map: index -> embedding
    results: Dict[int, List[float]] = {}

    async def worker(batch_idx: int, batch: List[Tuple[int, str]]):
        async with sem:
            start = batch_idx * batch_size
            end = min(start + len(batch), len(texts))
            batch_texts = [t for (_, t) in batch]
            vecs = await embed_batch_with_retry(client, batch_texts, opts, (start, end))
            for (item_idx, _), vec in zip(batch, vecs):
                results[item_idx] = vec

    tasks = [asyncio.create_task(worker(i, b)) for i, b in enumerate(batches)]

    # Simple progress reporting
    completed = 0
    total = len(batches)

    async def progress_monitor():
        nonlocal completed
        while completed < total:
            await asyncio.sleep(0.5)
            done = sum(1 for t in tasks if t.done())
            if done != completed:
                completed = done
                print(f"Progress: {completed}/{total} batches", flush=True)

    monitor_task = asyncio.create_task(progress_monitor())
    try:
        await asyncio.gather(*tasks)
    finally:
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass

    # Decide export path: legacy JSON vs compact binary
    if (opts.format or "bin").lower() == "json":
        # Inject embeddings back into items (legacy)
        missing = 0
        for i, obj in enumerate(items):
            if i in results:
                obj["embedding"] = results[i]
            else:
                if "embedding" not in obj:
                    missing += 1
        if missing:
            print(f"Warning: {missing} items had no embedding (likely empty 'question').", file=sys.stderr)

        out_path = output_path or default_output_path(input_path)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"Wrote {out_path}")
        return out_path
    else:
        return await write_compact_assets(input_path, items, results, opts)


def default_output_path(input_path: str) -> str:
    if input_path.lower().endswith(".json"):
        base = input_path[:-5]
        return f"{base}_embedding.json"
    return f"{input_path}_embedding.json"


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def derive_dataset_id(input_path: str, override: Optional[str]) -> str:
    if override:
        return override
    base = os.path.basename(input_path)
    if base.lower().endswith('.json'):
        base = base[:-5]
    return base


async def write_compact_assets(input_path: str, items: List[Dict[str, Any]], results: Dict[int, List[float]], opts: Options) -> str:
    # Build matrix from available results
    keys = sorted(results.keys())
    if not keys:
        raise RuntimeError("No embeddings computed; nothing to export in compact format.")
    N = len(keys)
    D0 = EXPECTED_DIM

    X = np.empty((N, D0), dtype=np.float32)
    row_to_item = np.empty((N,), dtype=np.int32)
    for r, idx in enumerate(keys):
        vec = results[idx]
        if len(vec) != D0:
            raise RuntimeError(f"Embedding dim mismatch at item {idx}: got {len(vec)} expected {D0}")
        X[r, :] = np.asarray(vec, dtype=np.float32)
        row_to_item[r] = idx

    # PCA config
    use_pca = bool(opts.use_pca)
    pca_dim = int(opts.pca_dim or 256)
    if not use_pca:
        # If PCA disabled, force full dimension
        pca_dim = D0

    # Center
    mu = X.mean(axis=0)
    Xc = X - mu

    # Project
    if use_pca:
        # SVD-based PCA: Xc = U S V^T, components = first d columns of V (shape D0 x d)
        # We use V^T (VT) returned by np.linalg.svd
        print(f"Fitting PCA to dim={pca_dim} (source={D0}, rows={N})...")
        # full_matrices=False yields shapes: U (N x D0), S (D0,), VT (D0 x D0)
        U, S, VT = np.linalg.svd(Xc, full_matrices=False)
        comps = VT[:pca_dim].T.astype(np.float32)  # (D0 x pca_dim)
        Xp = Xc @ comps  # (N x pca_dim)
    else:
        comps = np.eye(D0, pca_dim, dtype=np.float32)  # identity or truncation
        Xp = Xc @ comps

    # L2 normalize rows
    norms = np.linalg.norm(Xp, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    Xn = Xp / norms

    # Quantize (or keep float)
    quantize = bool(opts.quantize)
    if quantize:
        Xq = np.clip(np.rint(127.0 * Xn), -127, 127).astype(np.int8)
        emb_bytes = Xq.tobytes(order='C')
        quant_kind = 'int8'
    else:
        Xf = Xn.astype(np.float32)
        emb_bytes = Xf.tobytes(order='C')
        quant_kind = 'float32'

    # Prepare output paths
    dataset_id = derive_dataset_id(input_path, opts.dataset_id)
    out_dir = opts.out_dir or 'public/quant'
    ensure_dir(out_dir)
    base = os.path.join(out_dir, dataset_id)

    emb_path = base + ('.embeddings.bin')
    comp_path = base + ('.pca_components.bin')
    mean_path = base + ('.pca_mean.bin')
    meta_path = base + ('.meta.json')
    items_path = base + ('.items.json')

    # Write files
    with open(emb_path, 'wb') as f:
        f.write(emb_bytes)
    with open(comp_path, 'wb') as f:
        f.write(comps.astype(np.float32).tobytes(order='C'))
    with open(mean_path, 'wb') as f:
        f.write(mu.astype(np.float32).tobytes(order='C'))

    meta = {
        "version": 1,
        "providerId": "openai",
        "model": MODEL,
        "dataset_id": dataset_id,
        "source_dim": D0,
        "pca_dim": int(pca_dim),
        "quant": quant_kind,
        "rows": int(N),
        "files": {
            "embeddings": os.path.basename(emb_path),
            "pca_components": os.path.basename(comp_path),
            "pca_mean": os.path.basename(mean_path)
        },
        # map row -> item index in original JSON
        "row_to_item_index": [int(i) for i in row_to_item.tolist()],
    }
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False)

    # Also write a compact items JSON without embeddings for efficient client loading
    # Preserve original input order so that meta.row_to_item_index can reference items[idx]
    compact_items: List[Dict[str, Any]] = []
    for obj in items:
        rec: Dict[str, Any] = {
            "question": (obj.get("question") or "").strip(),
            "answer": (obj.get("answer") or "").strip(),
        }
        url = obj.get("url") or obj.get("wwwurl")
        if url:
            rec["url"] = url
        # Optional fields if present in source
        if obj.get("category") or obj.get("subject"):
            rec["category"] = obj.get("category") or obj.get("subject")
        if obj.get("type"):
            rec["type"] = obj.get("type")
        if obj.get("difficulty"):
            rec["difficulty"] = obj.get("difficulty")
        if obj.get("node_id") or obj.get("id"):
            rec["node_id"] = obj.get("node_id") or obj.get("id")
        if obj.get("level"):
            rec["level"] = obj.get("level")
        compact_items.append(rec)

    with open(items_path, 'w', encoding='utf-8') as f:
        json.dump(compact_items, f, ensure_ascii=False, separators=(",", ":"))  # minified

    print(f"Wrote compact assets under {out_dir}:\n  - {os.path.basename(emb_path)}\n  - {os.path.basename(comp_path)}\n  - {os.path.basename(mean_path)}\n  - {os.path.basename(meta_path)}\n  - {os.path.basename(items_path)}")
    # return meta path for reference
    return meta_path


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Precompute OpenAI embeddings for QA JSON dataset (with optional PCA + quantization)")
    p.add_argument("-i", "--input", default=DEFAULT_INPUT_PATH, help="Path to input JSON (array of QA items). Default: DEFAULT_INPUT_PATH in script")
    p.add_argument("-o", "--output", default=DEFAULT_OUTPUT_PATH, help="Path to output JSON (legacy float embeddings). Default: <input>_embedding.json or DEFAULT_OUTPUT_PATH if set")
    p.add_argument("-c", "--concurrency", type=int, default=20, help="Number of concurrent workers (default: 20)")
    p.add_argument("-b", "--batch-size", type=int, default=32, help="Batch size per request (default: 32)")
    p.add_argument("--max-retries", type=int, default=5, help="Max retries on 429/5xx (default: 5)")
    p.add_argument("--initial-delay-ms", type=int, default=500, help="Initial backoff delay ms (default: 500)")
    p.add_argument("--max-delay-ms", type=int, default=8000, help="Max backoff delay ms (default: 8000)")
    # compact options
    p.add_argument("--format", choices=["bin", "json"], default="bin", help="Export format: 'bin' for compact assets, 'json' to inject float embeddings into JSON (legacy)")
    p.add_argument("--out-dir", default="public/quant", help="Output directory for compact assets when --format=bin (default: public/quant)")
    p.add_argument("--dataset-id", default=None, help="Optional dataset ID to use for output file names (default: derived from input filename)")
    p.add_argument("--pca-dim", type=int, default=256, help="Target PCA dimension (default: 256)")
    p.add_argument("--no-pca", dest="use_pca", action="store_false", help="Disable PCA (uses full 1536D)")
    p.add_argument("--quantize", dest="quantize", action="store_true", help="Enable Int8 quantization (default)")
    p.add_argument("--no-quantize", dest="quantize", action="store_false", help="Disable quantization (keeps float32 in compact file)")
    p.set_defaults(use_pca=True, quantize=True)
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    if not args.input:
        if not DEFAULT_INPUT_PATH:
            print("Error: No input path provided and DEFAULT_INPUT_PATH is not set.", file=sys.stderr)
            return 1
        args.input = DEFAULT_INPUT_PATH
    opts = Options(
        batch_size=args.batch_size,
        concurrency=args.concurrency,
        max_retries=args.max_retries,
        initial_delay_ms=args.initial_delay_ms,
        max_delay_ms=args.max_delay_ms,
        format=args.format,
        out_dir=args.out_dir,
        dataset_id=args.dataset_id,
        pca_dim=args.pca_dim,
        use_pca=args.use_pca,
        quantize=args.quantize,
    )
    try:
        asyncio.run(process_dataset(args.input, args.output, opts))
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
