export interface ImageGenOptions {
  ratio: '16:9' | '9:16' | '1:1';
  inputImage?: Blob;
}

export type ImageGenErrorCode = 'NO_PROVIDER' | 'ALL_FAILED' | 'API_KEY_INVALID' | 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'UNSUPPORTED_INPUT' | 'UNKNOWN';

export class ImageGenError extends Error {
  constructor(public code: ImageGenErrorCode, message: string) {
    super(message);
  }
}

export type ImageProvider = 'puter' | 'pollinations' | 'gemini_image';
export type ProviderStatus = 'idle' | 'trying' | 'success' | 'failed';
export type OnImageProviderStatus = (provider: ImageProvider, status: ProviderStatus) => void;

const RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 1024, height: 1024 },
};

export function getDimensions(ratio: string): { width: number; height: number } {
  return RATIO_DIMENSIONS[ratio] || { width: 1024, height: 1024 };
}

export function buildPollinationsUrl(prompt: string, ratio: string): string {
  const dims = getDimensions(ratio);
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${dims.width}&height=${dims.height}&model=flux&nologo=true`;
}

// ── Lazy Puter loader ─────────────────────────────────────────
declare global {
  interface Window {
    puter?: {
      ai?: {
        txt2img: (prompt: string, opts?: Record<string, unknown>) => Promise<{ result?: Blob | { source?: string } }>;
      };
    };
  }
}

let puterLoadPromise: Promise<void> | null = null;

async function ensurePuterLoaded(): Promise<void> {
  if (typeof window !== 'undefined' && window.puter?.ai?.txt2img) return;
  if (puterLoadPromise) return puterLoadPromise;
  puterLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      puterLoadPromise = null;
      reject(new Error('Gagal memuat Puter.js. Periksa koneksi internet.'));
    };
    document.head.appendChild(script);
  });
  return puterLoadPromise;
}

// ── Timeout wrapper ────────────────────────────────────────────
async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ImageGenError('TIMEOUT', `Request melebihi batas waktu ${Math.round(timeoutMs / 1000)} detik.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Provider functions ─────────────────────────────────────────

async function callPuter(prompt: string, opts: ImageGenOptions): Promise<Blob> {
  await ensurePuterLoaded();
  if (!window.puter?.ai?.txt2img) throw new ImageGenError('UNKNOWN', 'Puter.ai tidak tersedia setelah script dimuat.');
  const result = await window.puter.ai.txt2img(prompt, { model: 'flux' });
  if (!result) throw new ImageGenError('UNKNOWN', 'Puter tidak mengembalikan hasil.');
  const blob = result.result instanceof Blob ? result.result : await fetch(result.result?.source || '').then(r => r.blob());
  if (!blob || blob.size === 0) throw new ImageGenError('UNKNOWN', 'Puter mengembalikan gambar kosong.');
  return blob;
}

async function callPollinations(prompt: string, ratio: string, signal?: AbortSignal): Promise<Blob> {
  const url = buildPollinationsUrl(prompt, ratio);
  const resp = await fetch(url, { signal });
  if (!resp.ok) throw new ImageGenError('UNKNOWN', `Pollinations error HTTP ${resp.status}`);
  const blob = await resp.blob();
  if (!blob || blob.size === 0) throw new ImageGenError('UNKNOWN', 'Pollinations mengembalikan gambar kosong.');
  return blob;
}

async function callGeminiImage(apiKey: string, prompt: string, opts: ImageGenOptions, signal?: AbortSignal): Promise<Blob> {
  const dims = getDimensions(opts.ratio);
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
  if (opts.inputImage) {
    const base64 = await blobToBase64(opts.inputImage);
    parts.push({ inlineData: { mimeType: opts.inputImage.type || 'image/png', data: base64.split(',')[1] || base64 } });
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal,
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['Image', 'Text'],
        temperature: 0.4,
      },
    }),
  });
  if (resp.status === 401 || resp.status === 403) throw new ImageGenError('API_KEY_INVALID', 'API key Gemini tidak valid.');
  if (resp.status === 429) throw new ImageGenError('QUOTA_EXCEEDED', 'Quota harian Gemini habis.');
  if (!resp.ok) throw new ImageGenError('UNKNOWN', `Gemini Image error HTTP ${resp.status}`);
  const data = await resp.json();
  const imageData = data?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData)?.inlineData;
  if (!imageData?.data) throw new ImageGenError('UNKNOWN', 'Gemini tidak mengembalikan data gambar.');
  const binary = atob(imageData.data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: imageData.mimeType || 'image/png' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageGenError('UNKNOWN', 'Gagal membaca file gambar.'));
    reader.readAsDataURL(blob);
  });
}

// ── Main function ──────────────────────────────────────────────

export interface ImageGenDeps {
  geminiApiKey: string;
  geminiImageModel?: string;
  puterEnabled?: boolean;
  onProviderStatus?: OnImageProviderStatus;
}

const NON_TRANSIENT_IMAGE: ImageGenErrorCode[] = ['API_KEY_INVALID', 'QUOTA_EXCEEDED', 'UNSUPPORTED_INPUT'];

export async function generateImageWithFallback(prompt: string, opts: ImageGenOptions, deps: ImageGenDeps): Promise<Blob> {
  const errors: ImageGenError[] = [];
  const notify = (provider: ImageProvider, status: ProviderStatus) => deps.onProviderStatus?.(provider, status);

  // 1. Puter — skip jika inputImage diberikan (Puter txt2img tidak menerima input gambar)
  if (deps.puterEnabled !== false && !opts.inputImage) {
    try {
      notify('puter', 'trying');
      const result = await withTimeout((signal) => callPuter(prompt, opts), 120_000);
      notify('puter', 'success');
      return result;
    } catch (e: unknown) {
      const err = e instanceof ImageGenError ? e : new ImageGenError('UNKNOWN', String(e));
      errors.push(err);
      notify('puter', 'failed');
      if (NON_TRANSIENT_IMAGE.includes(err.code)) return Promise.reject(err);
    }
  }

  // 2. Pollinations — skip jika inputImage diberikan (tidak mendukung)
  if (!opts.inputImage) {
    try {
      notify('pollinations', 'trying');
      const result = await withTimeout((signal) => callPollinations(prompt, opts.ratio, signal), 60_000);
      notify('pollinations', 'success');
      return result;
    } catch (e: unknown) {
      const err = e instanceof ImageGenError ? e : new ImageGenError('UNKNOWN', String(e));
      errors.push(err);
      notify('pollinations', 'failed');
      if (NON_TRANSIENT_IMAGE.includes(err.code)) return Promise.reject(err);
    }
  }

  // 3. Gemini Image — butuh API key
  if (deps.geminiApiKey) {
    try {
      notify('gemini_image', 'trying');
      const result = await withTimeout((signal) => callGeminiImage(deps.geminiApiKey, prompt, opts, signal), 90_000);
      notify('gemini_image', 'success');
      return result;
    } catch (e: unknown) {
      const err = e instanceof ImageGenError ? e : new ImageGenError('UNKNOWN', String(e));
      errors.push(err);
      notify('gemini_image', 'failed');
      if (NON_TRANSIENT_IMAGE.includes(err.code)) return Promise.reject(err);
    }
  }

  if (errors.length > 0) {
    const lastMsg = errors[errors.length - 1].message;
    throw new ImageGenError('ALL_FAILED', `Semua provider gagal. Error terakhir: ${lastMsg}`);
  }
  throw new ImageGenError('NO_PROVIDER', 'Tidak ada provider yang tersedia. Aktifkan Puter atau konfigurasi API key Gemini di Settings.');
}
