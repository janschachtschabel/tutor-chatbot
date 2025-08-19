// LLM service for client-side API calls with multiple providers
import { SYSTEM_PROMPT } from '../data/qaDataset.js';
import {
  listAvailableDatasets as dl_list,
  getDatasetInfo as dl_info,
  getActiveQAs as dl_activeQAs,
  getSelectedDatasetId as dl_selectedId,
  setSelectedDatasetId as dl_setSelectedId,
  getActiveQuantAssets as dl_quant
} from '../lib/datasetLoader.js';
import { cosineSimilarity, getTextEmbedding, pcaProjectNormalize, quantizeInt8Normalized, dotInt8, cosineFromInt8Dot } from './embeddingService.js';

// LLM Provider configurations
export const LLM_PROVIDERS = {
  OPENAI: {
    id: 'openai',
    name: 'OpenAI',
    model: import.meta.env.VITE_OPENAI_API_MODEL || 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'VITE_OPENAI_API_KEY'
  },
  GWDG: {
    id: 'gwdg',
    name: 'GWDG Academic Cloud',
    model: import.meta.env.VITE_GWDG_API_MODEL || 'gpt-oss-120b',
    baseUrl: '/api/gwdg/v1',
    apiKeyEnv: 'VITE_GWDG_API_KEY'
  }
};

// QA Settings management
export function getQASettings() {
  const qaEnabled = localStorage.getItem('qa_enabled');
  const similarityThreshold = localStorage.getItem('qa_similarity_threshold');
  const datasetId = localStorage.getItem('qa_dataset_id');
  
  return {
    enabled: qaEnabled !== null ? JSON.parse(qaEnabled) : true, // Default: enabled
    similarityThreshold: similarityThreshold ? parseFloat(similarityThreshold) : 0.3, // Default: 0.3
    datasetId: datasetId || dl_selectedId()
  };
}

export function setQASettings(settings) {
  localStorage.setItem('qa_enabled', JSON.stringify(settings.enabled));
  localStorage.setItem('qa_similarity_threshold', settings.similarityThreshold.toString());
  if (settings.datasetId) {
    localStorage.setItem('qa_dataset_id', settings.datasetId);
    dl_setSelectedId(settings.datasetId);
  }
}

// Find best matching QA pair with configurable settings (embedding or string)
export async function findBestMatch(userQuestion) {
  const qaSettings = getQASettings();
  
  if (!qaSettings.enabled) {
    return null;
  }

  const items = await dl_activeQAs();
  if (!items || items.length === 0) return null;
  // Try fast quantized path if compact assets are available
  const quant = await dl_quant();
  if (quant?.available) {
    const queryVec = await getTextEmbedding(userQuestion);
    if (!queryVec) return null;
    const { meta, embeddings, components, mean } = quant;
    const d = meta.pca_dim;
    // Project + normalize
    const qProj = pcaProjectNormalize(queryVec, mean, components, d);
    if (!qProj) return null;
    let best = null;
    if (meta.quant === 'int8') {
      const q8 = quantizeInt8Normalized(qProj);
      const rows = meta.rows;
      for (let r = 0; r < rows; r++) {
        const start = r * d;
        const end = start + d;
        const dot = dotInt8(q8, embeddings.subarray(start, end));
        const sim = cosineFromInt8Dot(dot);
        const idx = meta.row_to_item_index[r];
        const item = items[idx];
        if (!item) continue;
        const cand = { ...item, similarity: sim };
        if (!best || cand.similarity > best.similarity) best = cand;
      }
    } else {
      // float32 compact
      const rows = meta.rows;
      const f32 = embeddings; // Float32Array of size rows*d, already L2-normalized
      for (let r = 0; r < rows; r++) {
        const start = r * d;
        const end = start + d;
        let dot = 0;
        for (let i = 0; i < d; i++) dot += qProj[i] * f32[start + i];
        const sim = dot; // both normalized
        const idx = meta.row_to_item_index[r];
        const item = items[idx];
        if (!item) continue;
        const cand = { ...item, similarity: sim };
        if (!best || cand.similarity > best.similarity) best = cand;
      }
    }
    if (best) {
      const threshold = qaSettings.similarityThreshold || 0.75;
      return best.similarity >= threshold ? best : null;
    }
  }

  // Fallback to legacy per-item float embeddings if present
  if (items.some(it => Array.isArray(it.embedding))) {
    const queryVec = await getTextEmbedding(userQuestion);
    if (!queryVec) return null;
    const qdim = Array.isArray(queryVec) ? queryVec.length : 0;
    const sims = items
      .filter(it => Array.isArray(it.embedding) && it.embedding.length === qdim)
      .map(it => ({ ...it, similarity: cosineSimilarity(queryVec, it.embedding) }));
    if (sims.length === 0) return null;
    const best = sims.reduce((a, b) => (b.similarity > a.similarity ? b : a));
    const threshold = qaSettings.similarityThreshold || 0.75; // cosine threshold
    return best.similarity >= threshold ? best : null;
  }
  
  // No embeddings available -> no QA match
  return null;
}

// Generic LLM API call using axios like lernbegleiter
export async function callLLM(messages, provider, apiKey) {
  if (!apiKey) {
    throw new Error(`${provider.name} API Key ist erforderlich`);
  }

  try {
    const axios = (await import('axios')).default;
    
    // Add system prompt to prohibit LaTeX
    const systemPrompt = {
      role: "system",
      content: "Du bist ein hilfreicher Tutor-Assistent. Verwende Markdown für die Formatierung deiner Antworten. Verwende NIEMALS LaTeX-Syntax oder mathematische Formeln in LaTeX-Format. Nutze stattdessen einfache Textformatierung oder Unicode-Zeichen für mathematische Ausdrücke."
    };
    
    const messagesWithSystem = [systemPrompt, ...messages];
    
    const response = await axios.post(`${provider.baseUrl}/chat/completions`, {
      model: provider.model,
      messages: messagesWithSystem,
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log('API Response:', response.data);
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error('Fehler bei der API-Anfrage: ' + (error.response?.data?.error?.message || error.message));
  }
}

// Get API key for provider
export function getApiKeyForProvider(provider) {
  return import.meta.env[provider.apiKeyEnv];
}

// Get current provider from localStorage or default
export function getCurrentProvider() {
  const savedProviderId = localStorage.getItem('llm_provider');
  if (savedProviderId) {
    // Find provider by ID
    const provider = Object.values(LLM_PROVIDERS).find(p => p.id === savedProviderId);
    if (provider) {
      return provider;
    }
  }
  return LLM_PROVIDERS.OPENAI; // Default to OpenAI
}

// Save provider to localStorage
export function setCurrentProvider(providerId) {
  localStorage.setItem('llm_provider', providerId);
}

// Ensure assistant messages begin with the correct bold label
function enforceLabelPrefix(text, wantQALabel) {
  try {
    if (!text) return text;
    const qaLabel = '**[GEPRÜFTE ANTWORT AUF QA-BASIS]**';
    const aiLabel = '**[UNSICHERE ANTWORT AUF KI-BASIS]**';
    const trimmed = text.trimStart();
    const hasQALabel = trimmed.startsWith(qaLabel) || trimmed.startsWith('[GEPRÜFTE ANTWORT AUF QA-BASIS]');
    const hasAILabel = trimmed.startsWith(aiLabel) || trimmed.startsWith('[UNSICHERE ANTWORT AUF KI-BASIS]');
    if (wantQALabel) {
      return hasQALabel ? text : `${qaLabel}\n\n${text}`;
    } else {
      return hasAILabel ? text : `${aiLabel}\n\n${text}`;
    }
  } catch (e) {
    return text;
  }
}

// Main chat function with provider support
export async function processMessage(message, conversationHistory = []) {
  const provider = getCurrentProvider();
  const apiKey = getApiKeyForProvider(provider);
  
  if (!apiKey) {
    throw new Error(`${provider.name} API Key nicht gefunden. Bitte prüfen Sie die Umgebungsvariablen.`);
  }

  // Check for QA match first
  const qaMatch = await findBestMatch(message);
  
  let response;
  let isQABased = false;
  let sourceUrl = null;

  if (qaMatch) {
    // Use QA-based response
    isQABased = true;
    sourceUrl = qaMatch.url;
    
    const qaPrompt = `Basierend auf dieser QA-Information, beantworte die Frage "${message}":

Frage: ${qaMatch.question}
Antwort: ${qaMatch.answer}
URL: ${qaMatch.url}

Formatiere die Antwort in Markdown. Beginne die Antwort mit "**[GEPRÜFTE ANTWORT AUF QA-BASIS]**" und integriere die URL-Referenz natürlich in deine Antwort.

Wenn die bereitgestellte QA-Information die Nutzerfrage nicht vollständig oder nicht präzise beantwortet (z. B. fehlt eine konkrete Zahl, Definition, Bedingung, Einschränkung), dann füge NACH einem Absatz eine zweite, separat formatierte Ergänzung hinzu, beginnend mit:

"**[UNSICHERE ANTWORT AUF KI-BASIS]**"

Darin darfst du dein eigenes Weltwissen nutzen, um die Frage bestmöglich zu beantworten. Mache kenntlich, wenn Aussagen unsicher sind, vermeide Halluzinationen und nenne ggf. allgemeine Einordnungen oder Vorsichtshinweise. Vermeide Wiederholungen, konzentriere dich auf die fehlenden Informationen.`;

    response = await callLLM([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: qaPrompt }
    ], provider, apiKey);
    response = enforceLabelPrefix(response, true);
    
  } else {
    // Use AI-based response
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: `Bitte beginne deine Antwort mit "**[UNSICHERE ANTWORT AUF KI-BASIS]**" und formatiere in Markdown.\n\n${message}` }
    ];

    response = await callLLM(messages, provider, apiKey);
    response = enforceLabelPrefix(response, false);
  }

  return {
    message: response,
    isQABased,
    sourceUrl,
    provider: provider.name,
    model: provider.model,
    qaMatch: qaMatch ? {
      question: qaMatch.question,
      similarity: qaMatch.similarity,
      category: qaMatch.category,
      level: qaMatch.level,
      difficulty: qaMatch.difficulty
    } : null
  };
}

// Dataset helpers and info
export function listDatasets() {
  return dl_list();
}

export async function getQAInfo() {
  const info = await dl_info();
  const items = await dl_activeQAs();
  return {
    count: info.count,
    totalQuestions: info.count,
    categories: info.categories,
    sampleQuestions: items.slice(0, 5).map(qa => qa.question)
  };
}

export function selectDataset(id) {
  dl_setSelectedId(id);
  localStorage.setItem('qa_dataset_id', id);
}

