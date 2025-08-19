// Utilities to load and normalize swappable QA datasets from src/data/
// Supports JSON datasets and a built-in sample JS dataset

import { qaDataset as builtinDataset } from '../data/qaDataset.js';
import { getEmbeddingMeta } from '../services/embeddingService.js';

const LOCAL_STORAGE_KEY = 'qa_dataset_id';
const EMB_CACHE_PREFIX = 'qa_dataset_cache_';

// Cache for quantized/binary assets per dataset id
const QUANT_CACHE = new Map();

// Cache for loaded datasets: { [id]: { items: NormalizedQA[], hasEmbeddings: boolean } }
const DATASET_CACHE = new Map();

// Build an index of available JSON datasets using Vite's glob import
// Key: virtual path, Value: async loader () => module
const jsonModules = import.meta.glob('../data/*.json');

function pathToId(path) {
  // Example: '../data/qa_Klexikon-Prod-180825.json' -> 'qa_Klexikon-Prod-180825'
  const match = path.match(/([^\/]+)\.json$/);
  return match ? match[1] : path;
}

function idToNiceName(id) {
  // Replace underscores/dashes and add spaces, keep case
  return id
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();
}

export function listAvailableDatasets() {
  const list = [];
  // Built-in JS dataset entry
  list.push({ id: 'builtin-sample', name: 'Beispiel (integriertes QA-Set)', kind: 'builtin' });
  for (const path in jsonModules) {
    const id = pathToId(path);
    list.push({ id, name: idToNiceName(id), kind: 'json', path });
  }
  // Also expose datasets provided via compact quantized assets in /public/quant
  const klexId = 'qa_Klexikon-Prod-180825';
  if (!list.some(d => d.id === klexId)) {
    list.push({ id: klexId, name: idToNiceName(klexId), kind: 'quant' });
  }
  return list;
}

export function getSelectedDatasetId() {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || getDefaultDatasetId();
}

export function setSelectedDatasetId(id) {
  localStorage.setItem(LOCAL_STORAGE_KEY, id);
  // Invalidate cache for current selection to force reload on next access
}

export function getDefaultDatasetId() {
  const jsonIds = Object.keys(jsonModules).map(pathToId);
  if (jsonIds.length > 0) return jsonIds[0];
  // Prefer Klexikon quantized dataset if available in public/quant
  return 'qa_Klexikon-Prod-180825';
}

function normalizeRecord(rec) {
  return {
    question: rec.question || '',
    answer: rec.answer || '',
    url: rec.url || rec.wwwurl || null,
    category: rec.category || rec.subject || null,
    type: rec.type || null,
    difficulty: rec.difficulty || null,
    node_id: rec.node_id || rec.id || null,
    level: rec.level || null,
    embedding: Array.isArray(rec.embedding) ? rec.embedding : null,
    // keep original for potential exporting with extra fields preserved
    __raw: rec
  };
}

async function loadJsonDataset(path) {
  const mod = await jsonModules[path]();
  // Vite JSON import default-exports the parsed content
  const data = mod?.default || mod;
  if (!Array.isArray(data)) return [];
  return data.map(normalizeRecord);
}

async function loadBuiltinDataset() {
  return (builtinDataset || []).map(normalizeRecord);
}

// Try to load compact items JSON from /quant/<id>.items.json
async function loadQuantItemsById(id) {
  const base = quantBasePathForId(id);
  try {
    const resp = await fetch(`${base}.items.json`, { cache: 'force-cache' });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data)) return null;
    return data.map(normalizeRecord);
  } catch (e) {
    return null;
  }
}

function loadCachedEmbeddings(datasetId) {
  try {
    const raw = localStorage.getItem(EMB_CACHE_PREFIX + datasetId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Backward compat: old schema was Array<{key, embedding}>
    if (Array.isArray(parsed)) {
      return { providerId: 'unknown', dim: Array.isArray(parsed?.[0]?.embedding) ? parsed[0].embedding.length : undefined, items: parsed };
    }
    // New schema: { providerId, dim, items }
    if (parsed && Array.isArray(parsed.items)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveCachedEmbeddings(datasetId, items) {
  // Persist embeddings with provider metadata
  const meta = getEmbeddingMeta();
  const compactItems = items
    .filter(it => Array.isArray(it.embedding))
    .map(it => ({ key: buildItemKey(it), embedding: it.embedding }));
  const payload = { providerId: meta.providerId, dim: meta.dim, items: compactItems };
  try {
    localStorage.setItem(EMB_CACHE_PREFIX + datasetId, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to cache dataset embeddings:', e);
  }
}

function buildItemKey(it) {
  // Prefer stable node_id, fallback to question string
  return it.node_id || it.question;
}

function mergeCachedEmbeddings(datasetId, items) {
  const cached = loadCachedEmbeddings(datasetId);
  if (!cached) return items;
  const current = getEmbeddingMeta();
  // Only merge when provider and dimension match to avoid mixing vectors
  if (cached.providerId !== current.providerId || (cached.dim && cached.dim !== current.dim)) {
    return items;
  }
  const map = new Map(cached.items.map(e => [e.key, e.embedding]));
  return items.map(it => {
    if (Array.isArray(it.embedding)) return it;
    const key = buildItemKey(it);
    const emb = map.get(key);
    return emb ? { ...it, embedding: emb } : it;
  });
}

export async function loadDatasetById(id) {
  if (DATASET_CACHE.has(id)) {
    return DATASET_CACHE.get(id);
  }
  let items = [];
  if (id === 'builtin-sample') {
    items = await loadBuiltinDataset();
  } else {
    // Prefer compact items from /quant if available
    const quantItems = await loadQuantItemsById(id);
    if (Array.isArray(quantItems) && quantItems.length > 0) {
      items = quantItems;
    } else {
      // Fallback to bundled JSON via Vite glob
      const entry = Object.keys(jsonModules).find(p => pathToId(p) === id);
      if (entry) {
        items = await loadJsonDataset(entry);
      }
    }
  }
  // Try to merge cached embeddings from localStorage
  items = mergeCachedEmbeddings(id, items);
  const hasEmbeddings = items.length > 0 && items.some(it => Array.isArray(it.embedding));
  const value = { items, hasEmbeddings };
  DATASET_CACHE.set(id, value);
  return value;
}

export async function getActiveDataset() {
  const id = getSelectedDatasetId();
  return { id, ...(await loadDatasetById(id)) };
}

export async function getDatasetInfo(id = getSelectedDatasetId()) {
  const { items, hasEmbeddings } = await loadDatasetById(id);
  const categories = Array.from(new Set(items.map(it => it.category).filter(Boolean)));
  return {
    id,
    count: items.length,
    categories,
    hasEmbeddings
  };
}

export async function getActiveQAs() {
  const { items } = await getActiveDataset();
  return items;
}

// Precompute embeddings for active dataset and cache in localStorage
// embedFn: async (texts: string[]) => number[][]
export async function precomputeEmbeddingsForDataset(datasetId, embedFn, onProgress) {
  const { items } = await loadDatasetById(datasetId);
  const NO_EMB = items.filter(it => !Array.isArray(it.embedding));
  if (NO_EMB.length === 0) return { updated: 0, total: items.length };

  // Build texts to embed (question only for strict compatibility with runtime matching)
  // Track indices to safely skip empty questions without breaking alignment
  const toEmbed = NO_EMB
    .map((it, idx) => ({ idx, text: (it.question || '').trim() }))
    .filter(({ text }) => text.length > 0);

  // Concurrency, batching and retry options (defaults tuned for OpenAI)
  const DEFAULT_OPTIONS = {
    batchSize: 32,
    concurrency: 20,
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 8000
  };
  // Backward compatibility: allow onProgress to be options when embedFn provided earlier
  const maybeOptions = typeof onProgress === 'function' ? undefined : onProgress;
  const realOnProgress = typeof onProgress === 'function' ? onProgress : undefined;
  const options = { ...DEFAULT_OPTIONS, ...(maybeOptions || {}) };

  // Helper: sleep
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  // Helper: exponential backoff with jitter
  const backoffDelay = (attempt) => {
    const base = Math.min(options.maxDelayMs, options.initialDelayMs * Math.pow(2, attempt));
    const jitter = base * (0.5 + Math.random());
    return Math.min(options.maxDelayMs, Math.floor(jitter));
  };
  // Helper: identify retryable errors
  const isRetryable = (err) => {
    const status = err?.response?.status;
    if (!status) return true; // network/timeout
    if (status === 429) return true; // rate limited
    if (status >= 500 && status < 600) return true; // server errors
    return false;
  };
  // Wrapper to call embedFn with retries
  const embedWithRetry = async (texts, start, end) => {
    let lastErr;
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await embedFn(texts);
      } catch (e) {
        lastErr = e;
        if (attempt >= options.maxRetries || !isRetryable(e)) break;
        await sleep(backoffDelay(attempt));
      }
    }
    const msg = lastErr?.response?.data?.error || lastErr?.response?.data?.message || lastErr?.message || String(lastErr);
    throw new Error(`Embedding-API-Fehler nach Wiederholungen (Batch ${start + 1}-${end}): ${msg}`);
  };

  // Create batch tasks
  const batchSize = Math.max(1, options.batchSize);
  const tasks = [];
  for (let start = 0; start < toEmbed.length; start += batchSize) {
    const end = Math.min(start + batchSize, toEmbed.length);
    tasks.push({ start, end });
  }

  let progress = 0;
  let updatedCount = 0;
  if (realOnProgress) realOnProgress(0, toEmbed.length);

  let nextTaskIdx = 0;
  const runWorker = async () => {
    while (true) {
      const myTaskIdx = nextTaskIdx++;
      if (myTaskIdx >= tasks.length) break;
      const { start, end } = tasks[myTaskIdx];
      const batch = toEmbed.slice(start, end);
      const batchTexts = batch.map(b => b.text);
      const vecs = await embedWithRetry(batchTexts, start, end);
      for (let i = 0; i < vecs.length; i++) {
        const targetIdx = batch[i]?.idx;
        if (typeof targetIdx === 'number' && Array.isArray(vecs[i])) {
          NO_EMB[targetIdx].embedding = vecs[i];
          updatedCount++;
        }
      }
      progress += vecs.length;
      if (realOnProgress) realOnProgress(progress, toEmbed.length);
    }
  };

  const workerCount = Math.max(1, Math.min(options.concurrency || 1, tasks.length));
  const workers = Array.from({ length: workerCount }, () => runWorker());
  await Promise.all(workers);

  // Merge back embeddings into full items by key
  const embMap = new Map(NO_EMB.map(it => [buildItemKey(it), it.embedding]));
  const merged = items.map(it => Array.isArray(it.embedding) ? it : ({ ...it, embedding: embMap.get(buildItemKey(it)) || null }));

  // Save to local cache and in-memory cache
  saveCachedEmbeddings(datasetId, merged);
  DATASET_CACHE.set(datasetId, { items: merged, hasEmbeddings: true });
  return { updated: updatedCount, total: toEmbed.length };
}

// Utility to get dataset with embeddings for exporting
export async function getDatasetForExport(datasetId) {
  const { items } = await loadDatasetById(datasetId);
  // Rebuild records preserving original fields and attaching embedding
  return items.map(it => ({
    ...it.__raw,
    url: it.url ?? it.__raw?.url ?? it.__raw?.wwwurl,
    category: it.category ?? it.__raw?.category ?? it.__raw?.subject,
    embedding: Array.isArray(it.embedding) ? it.embedding : undefined
  }));
}

// Quantized asset loading
function quantBasePathForId(id) {
  // Files are written under public/quant/<datasetId>.* and served at /quant/*
  return `/quant/${id}`;
}

export async function getQuantAssetsForDataset(id) {
  if (QUANT_CACHE.has(id)) return QUANT_CACHE.get(id);
  const base = quantBasePathForId(id);
  try {
    const metaResp = await fetch(`${base}.meta.json`, { cache: 'force-cache' });
    if (!metaResp.ok) {
      const val = { available: false };
      QUANT_CACHE.set(id, val);
      return val;
    }
    const meta = await metaResp.json();
    const embUrl = `/quant/${meta.dataset_id}.embeddings.bin`;
    const compUrl = `/quant/${meta.dataset_id}.pca_components.bin`;
    const meanUrl = `/quant/${meta.dataset_id}.pca_mean.bin`;

    const [embBuf, compBuf, meanBuf] = await Promise.all([
      fetch(embUrl, { cache: 'force-cache' }).then(r => r.arrayBuffer()),
      fetch(compUrl, { cache: 'force-cache' }).then(r => r.arrayBuffer()),
      fetch(meanUrl, { cache: 'force-cache' }).then(r => r.arrayBuffer()),
    ]);

    const isInt8 = (meta.quant === 'int8');
    const embeddings = isInt8 ? new Int8Array(embBuf) : new Float32Array(embBuf);
    const components = new Float32Array(compBuf);
    const mean = new Float32Array(meanBuf);

    const value = {
      available: true,
      meta,
      embeddings,
      components,
      mean,
    };
    QUANT_CACHE.set(id, value);
    return value;
  } catch (e) {
    console.warn('Quant assets load failed for', id, e);
    const val = { available: false };
    QUANT_CACHE.set(id, val);
    return val;
  }
}

export async function getActiveQuantAssets() {
  const id = getSelectedDatasetId();
  return getQuantAssetsForDataset(id);
}
