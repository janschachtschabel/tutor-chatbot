// OpenAI Embedding utilities
// Provides batch embedding and cosine similarity helpers

import axios from 'axios';

// OpenAI Embeddings (primary and only provider)
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_DIM = 1536;

export function getEmbeddingMeta() {
  return { providerId: 'openai', model: OPENAI_EMBEDDING_MODEL, dim: OPENAI_DIM };
}

export async function embedTextsOpenAI(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const apiKey = import.meta.env?.VITE_OPENAI_API_KEY || (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY);
  if (!apiKey) throw new Error('Kein OpenAI API-Schlüssel verfügbar für Embeddings.');
  const response = await axios.post('/api/openai/v1/embeddings', {
    model: OPENAI_EMBEDDING_MODEL,
    input: texts
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });
  return response.data.data.map(d => d.embedding);
}

// Main embedding function - now uses OpenAI exclusively
export async function getTextEmbedding(text) {
  const [vec] = await embedTextsOpenAI([text]);
  return vec;
}

export function cosineSimilarity(a, b) {
  if (!a || !b) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] || 0;
    const bi = b[i] || 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  return (na && nb) ? (dot / (Math.sqrt(na) * Math.sqrt(nb))) : 0;
}

// --- PCA + Quantization helpers for compact assets ---

// Project a 1536D vector into PCA space and L2-normalize it.
// components is a Float32Array of shape (source_dim x pca_dim) in row-major, mean is Float32Array of length source_dim
export function pcaProjectNormalize(vec, mean, components, pcaDim) {
  const D0 = mean.length;
  if (!vec || vec.length !== D0) return null;
  const out = new Float32Array(pcaDim);
  // y_j = sum_i (x_i - mu_i) * C[i,j]
  for (let j = 0; j < pcaDim; j++) {
    let sum = 0;
    let offset = j; // index into components: i*pcaDim + j
    for (let i = 0; i < D0; i++, offset += pcaDim) {
      sum += (vec[i] - mean[i]) * components[offset];
    }
    out[j] = sum;
  }
  // L2 normalize
  let norm = 0;
  for (let j = 0; j < pcaDim; j++) norm += out[j] * out[j];
  norm = Math.sqrt(norm) || 1;
  for (let j = 0; j < pcaDim; j++) out[j] = out[j] / norm;
  return out;
}

export function quantizeInt8Normalized(vecNorm) {
  const q = new Int8Array(vecNorm.length);
  for (let i = 0; i < vecNorm.length; i++) {
    let v = Math.round(127 * vecNorm[i]);
    if (v < -127) v = -127; else if (v > 127) v = 127;
    q[i] = v;
  }
  return q;
}

export function dotInt8(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function cosineFromInt8Dot(dot) {
  const scale = 127 * 127;
  return dot / scale;
}
