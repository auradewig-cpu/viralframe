const PROVIDER_CONFIGS = {
  gemini: {
    maxTokens: 32768,
    temperature: 0.3,
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    // Output JSON untuk 10-20 scene mudah melebihi 8K token — pakai batas maksimal model.
    maxTokens: 32768,
    temperature: 0.3,
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    // deepseek-chat (non-reasoning): jauh lebih cepat dari r1 dan tidak menggerus max_tokens dengan token reasoning.
    model: 'deepseek/deepseek-chat',
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
  const resp = await fetch(endpoint, {
    method: 'POST',
    // Key di header, bukan query string — menghindari bocor via log/referrer.
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: cfg.temperature,
        maxOutputTokens: cfg.maxTokens,
        // Structured output: Gemini dijamin mengembalikan JSON valid tanpa markdown fence.
        responseMimeType: 'application/json',
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
      response_format: { type: 'json_object' },
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
      response_format: { type: 'json_object' },
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
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiCallError('TIMEOUT', `Request melebihi batas waktu ${Math.round(timeoutMs / 1000)} detik.`);
    }
    if (e instanceof TypeError) {
      throw new ApiCallError('NETWORK_ERROR', 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Error yang tidak akan sembuh dengan retry ke provider yang sama.
const NON_TRANSIENT: ApiError[] = ['API_KEY_INVALID', 'QUOTA_EXCEEDED', 'CONTEXT_LENGTH'];

export interface ApiKeys {
  gemini: string;
  groq: string;
  openrouter: string;
}

export type ProviderName = 'gemini' | 'groq' | 'openrouter';
export type ProgressStage = 'calling' | 'parsing' | 'retrying' | 'failed' | 'success';

// Event progress TERSTRUKTUR — konsumen (useGenerationPipeline) membaca provider/stage langsung,
// BUKAN mem-parse substring message. message hanya untuk tampilan teks. Dulu status provider
// di-derive dari pencocokan string Indonesia dan diam-diam rusak saat label provider berubah.
export interface ProgressEvent {
  provider: ProviderName | null;
  stage: ProgressStage;
  message: string;
}

export type ProgressCallback = (event: ProgressEvent) => void;

// Pure function: filter providers by key availability, apply custom order.
// Diekspor untuk unit test.
export function getOrderedProviders(
  keys: ApiKeys,
  providerOrder: ('gemini' | 'groq' | 'openrouter')[]
): ('gemini' | 'groq' | 'openrouter')[] {
  const validOrder = providerOrder.filter(p => p === 'gemini' || p === 'groq' || p === 'openrouter');
  if (validOrder.length !== 3) return [];
  return validOrder.filter(p => !!keys[p]);
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini Flash',
  groq: 'Groq Llama 3.3 70B',
  openrouter: 'OpenRouter',
};

// apiClient generik terhadap content type — tidak tahu bentuk JSON output.
// Parsing teks mentah -> struktur data didelegasikan ke pemanggil (registry content type).
export async function generateWithFallback<T>(
  prompt: string,
  keys: ApiKeys,
  parseOutput: (text: string) => T | null,
  onProgress: ProgressCallback,
  onGroqQuota?: (percent: number | null) => void,
  geminiModel: string = 'gemini-3.5-flash',
  providerOrder?: ('gemini' | 'groq' | 'openrouter')[]
): Promise<T> {
  const TIMEOUT = 90_000;
  let lastError: ApiCallError | null = null;

  const order = getOrderedProviders(keys, providerOrder || ['gemini', 'groq', 'openrouter']);

  for (const provider of order) {
    const label = PROVIDER_LABELS[provider];
    const callProvider = (signal: AbortSignal) =>
      provider === 'gemini' ? callGemini(keys.gemini, prompt, geminiModel, signal)
        : provider === 'groq' ? callGroq(keys.groq, prompt, signal, onGroqQuota)
          : callOpenRouter(keys.openrouter, prompt, signal);
    try {
      onProgress({ provider, stage: 'calling', message: `Memanggil ${label} API...` });
      const text = await callWithTimeout(callProvider, TIMEOUT);
      onProgress({ provider, stage: 'parsing', message: `Mengurai JSON dari respons ${label}...` });
      const json = parseOutput(text);
      if (json) { onProgress({ provider, stage: 'success', message: 'Menyiapkan Scene Cards...' }); return json; }
      throw new ApiCallError('JSON_PARSE_ERROR', `JSON tidak valid dari ${label}.`);
    } catch (e: unknown) {
      const err = e instanceof ApiCallError ? e : new ApiCallError('UNKNOWN', String(e));
      lastError = err;
      // Provider PERTAMA di urutan user layak satu retry untuk error transient — dulu hardcode
      // Gemini, sekarang mengikuti providerOrder.
      if (provider === order[0] && !NON_TRANSIENT.includes(err.code)) {
        onProgress({ provider, stage: 'retrying', message: `${label} gagal (${err.code}), mencoba ulang...` });
        try {
          const text = await callWithTimeout(callProvider, TIMEOUT);
          const json = parseOutput(text);
          if (json) { onProgress({ provider, stage: 'success', message: 'Menyiapkan Scene Cards...' }); return json; }
          lastError = new ApiCallError('JSON_PARSE_ERROR', `JSON tidak valid dari ${label}.`);
        } catch (e2: unknown) {
          lastError = e2 instanceof ApiCallError ? e2 : lastError;
        }
        onProgress({ provider, stage: 'failed', message: `${label} gagal (${lastError.code}).` });
      } else {
        onProgress({ provider, stage: 'failed', message: `${label} gagal (${err.code}).` });
      }
      // NON_TRANSIENT hanya berarti "jangan retry provider yang SAMA" — provider
      // BERIKUTNYA tetap dicoba (quota Gemini habis justru alasan utama fallback ke Groq).
    }
  }

  if (lastError) {
    throw new ApiCallError(lastError.code, `Semua provider yang dikonfigurasi gagal. Error terakhir: ${lastError.message}`);
  }
  throw new ApiCallError('API_KEY_INVALID', 'Tidak ada API key yang dikonfigurasi. Silakan konfigurasi API key di Settings.');
}
