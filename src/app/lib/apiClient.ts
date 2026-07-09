import { VideoJSON } from '../types';
import { parseAiResponse } from './jsonParser';

const PROVIDER_CONFIGS = {
  gemini: {
    maxTokens: 32768,
    temperature: 0.3,
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 8192,
    temperature: 0.3,
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-r1',
    maxTokens: 32768,
    temperature: 0.3,
  },
};

export type ApiError = 'JSON_PARSE_ERROR' | 'MISSING_FIELDS' | 'SCENE_COUNT_MISMATCH' | 'API_KEY_INVALID' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' | 'TIMEOUT' | 'CONTEXT_LENGTH' | 'UNKNOWN';

export class ApiCallError extends Error {
  constructor(public code: ApiError, message: string) {
    super(message);
  }
}

async function callGemini(apiKey: string, prompt: string, model: string, signal?: AbortSignal): Promise<string> {
  const cfg = PROVIDER_CONFIGS.gemini;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const resp = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: cfg.temperature,
        maxOutputTokens: cfg.maxTokens,
      },
    }),
  });

  if (resp.status === 401 || resp.status === 403) throw new ApiCallError('API_KEY_INVALID', 'API key Gemini tidak valid.');
  if (resp.status === 429) throw new ApiCallError('QUOTA_EXCEEDED', 'Quota harian Gemini habis. Beralih ke Groq atau coba besok.');
  if (resp.status === 400) {
    const body = await resp.json().catch(() => ({}));
    const msg = body?.error?.message || '';
    if (msg.includes('context') || msg.includes('token')) throw new ApiCallError('CONTEXT_LENGTH', 'Terlalu banyak scene untuk satu request. Kurangi jumlah scene menjadi ≤15.');
    throw new ApiCallError('UNKNOWN', `Gemini error: ${msg}`);
  }
  if (!resp.ok) throw new ApiCallError('UNKNOWN', `Gemini error ${resp.status}`);

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ApiCallError('JSON_PARSE_ERROR', 'Gemini tidak menghasilkan teks.');
  return text;
}

async function callGroq(apiKey: string, prompt: string, signal?: AbortSignal, onQuotaHeaders?: (percent: number | null) => void): Promise<string> {
  const cfg = PROVIDER_CONFIGS.groq;
  const resp = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    signal,
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
    }),
  });

  const remaining = resp.headers.get('x-ratelimit-remaining-tokens');
  const limit = resp.headers.get('x-ratelimit-limit-tokens');
  if (remaining !== null && limit !== null && Number(limit) > 0) {
    onQuotaHeaders?.((Number(remaining) / Number(limit)) * 100);
  } else {
    onQuotaHeaders?.(null);
  }

  if (resp.status === 401 || resp.status === 403) throw new ApiCallError('API_KEY_INVALID', 'API key Groq tidak valid.');
  if (resp.status === 429) throw new ApiCallError('QUOTA_EXCEEDED', 'Quota Groq habis.');
  if (!resp.ok) throw new ApiCallError('UNKNOWN', `Groq error ${resp.status}`);

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new ApiCallError('JSON_PARSE_ERROR', 'Groq tidak menghasilkan teks.');
  return text;
}

async function callOpenRouter(apiKey: string, prompt: string, signal?: AbortSignal): Promise<string> {
  const cfg = PROVIDER_CONFIGS.openrouter;
  const resp = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    signal,
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
    }),
  });

  if (resp.status === 401 || resp.status === 403) throw new ApiCallError('API_KEY_INVALID', 'API key OpenRouter tidak valid.');
  if (resp.status === 429) throw new ApiCallError('QUOTA_EXCEEDED', 'Quota OpenRouter habis.');
  if (!resp.ok) throw new ApiCallError('UNKNOWN', `OpenRouter error ${resp.status}`);

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new ApiCallError('JSON_PARSE_ERROR', 'OpenRouter tidak menghasilkan teks.');
  return text;
}

async function callWithTimeout<T>(factory: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await factory(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export interface ApiKeys {
  gemini: string;
  groq: string;
  openrouter: string;
}

export type ProgressCallback = (msg: string) => void;

export async function generateWithFallback(
  prompt: string,
  keys: ApiKeys,
  onProgress: ProgressCallback,
  onGroqQuota?: (percent: number | null) => void,
  geminiModel: string = 'gemini-3.5-flash'
): Promise<VideoJSON> {
  const TIMEOUT = 90_000;

  if (keys.gemini) {
    try {
      onProgress('Memanggil Gemini Flash API...');
      const text = await callWithTimeout((signal) => callGemini(keys.gemini, prompt, geminiModel, signal), TIMEOUT);
      onProgress('Mengurai JSON dari respons Gemini...');
      const json = parseAiResponse(text);
      if (json) { onProgress('Menyiapkan Scene Cards...'); return json; }
      throw new ApiCallError('JSON_PARSE_ERROR', 'JSON tidak valid dari Gemini.');
    } catch (e: unknown) {
      const err = e as ApiCallError;
      onProgress(`Gemini gagal (${err.code || 'unknown'}), mencoba ulang...`);
      // retry once
      try {
        const text = await callWithTimeout((signal) => callGemini(keys.gemini, prompt, geminiModel, signal), TIMEOUT);
        const json = parseAiResponse(text);
        if (json) { onProgress('Menyiapkan Scene Cards...'); return json; }
      } catch {
        // fall through to groq
      }
    }
  }

  if (keys.groq) {
    try {
      onProgress('Beralih ke Groq Llama 3.3 70B...');
      const text = await callWithTimeout((signal) => callGroq(keys.groq, prompt, signal, onGroqQuota), TIMEOUT);
      onProgress('Mengurai JSON dari respons Groq...');
      const json = parseAiResponse(text);
      if (json) { onProgress('Menyiapkan Scene Cards...'); return json; }
      throw new ApiCallError('JSON_PARSE_ERROR', 'JSON tidak valid dari Groq.');
    } catch (e: unknown) {
      const err = e as ApiCallError;
      onProgress(`Groq gagal (${err.code || 'unknown'}), mencoba OpenRouter...`);
    }
  }

  if (keys.openrouter) {
    try {
      onProgress('Memanggil OpenRouter API...');
      const text = await callWithTimeout((signal) => callOpenRouter(keys.openrouter, prompt, signal), TIMEOUT);
      onProgress('Mengurai JSON dari respons OpenRouter...');
      const json = parseAiResponse(text);
      if (json) { onProgress('Menyiapkan Scene Cards...'); return json; }
      throw new ApiCallError('JSON_PARSE_ERROR', 'JSON tidak valid dari OpenRouter.');
    } catch (e: unknown) {
      const err = e as ApiCallError;
      throw new ApiCallError(err.code || 'UNKNOWN', `Semua provider gagal. OpenRouter (terakhir dicoba): ${err.message}`);
    }
  }

  throw new ApiCallError('API_KEY_INVALID', 'Tidak ada API key yang dikonfigurasi. Silakan konfigurasi API key di Settings.');
}
