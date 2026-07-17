export interface ImageGenOptions {
  ratio: '16:9' | '9:16' | '1:1' | '4:5';
  inputImage?: Blob;
}

export type ImageGenErrorCode = 'NO_PROVIDER' | 'ALL_FAILED' | 'API_KEY_INVALID' | 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'UNSUPPORTED_INPUT' | 'UNKNOWN';

export class ImageGenError extends Error {
  constructor(public code: ImageGenErrorCode, message: string) {
    super(message);
  }
}

export type ImageProvider = 'puter' | 'pollinations' | 'gemini_image';
export type ProviderStatus = 'idle' | 'trying' | 'success' | 'failed' | 'skipped';
export type OnImageProviderStatus = (provider: ImageProvider, status: ProviderStatus) => void;

// Circuit breaker level modul — Puter tidak dicoba ulang selama 10 menit setelah gagal.
// `puterEverFailed` bersifat permanen hingga sukses: setelah pernah gagal, timeout diturunkan jadi 30s.
let puterSkipUntil = 0;
let puterEverFailed = false;
const PUTER_COOLDOWN_MS = 10 * 60 * 1000;
const PUTER_TIMEOUT_FIRST_MS = 120_000;
const PUTER_TIMEOUT_RETRY_MS = 30_000;

export function _resetPuterBreakerForTest(): void { puterSkipUntil = 0; puterEverFailed = false; }
function isPuterSkipped(): boolean { return Date.now() < puterSkipUntil; }
function markPuterFailed(): void { puterSkipUntil = Date.now() + PUTER_COOLDOWN_MS; puterEverFailed = true; }
function markPuterSuccess(): void { puterSkipUntil = 0; puterEverFailed = false; }
function getPuterTimeout(): number { return puterEverFailed ? PUTER_TIMEOUT_RETRY_MS : PUTER_TIMEOUT_FIRST_MS; }

const RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
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

async function callPuter(prompt: string, opts: ImageGenOptions, timeoutMs: number): Promise<Blob> {
  await ensurePuterLoaded();
  if (!window.puter?.ai?.txt2img) throw new ImageGenError('UNKNOWN', 'Puter.ai tidak tersedia setelah script dimuat.');
  const result = await Promise.race<{ result?: Blob | { source?: string } }>([
    window.puter.ai.txt2img(prompt, { model: 'flux' }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new ImageGenError('TIMEOUT', `Puter timeout ${Math.round(timeoutMs / 1000)}s.`)), timeoutMs)),
  ]);
  if (!result) throw new ImageGenError('UNKNOWN', 'Puter tidak mengembalikan hasil.');
  let blob: Blob;
  if (result.result instanceof Blob) {
    blob = result.result;
  } else {
    // Tanpa guard ini, source kosong membuat fetch('') mengambil index.html sendiri —
    // blob non-kosong yang lolos validasi dan dipakai sebagai "gambar".
    const source = result.result?.source;
    if (!source) throw new ImageGenError('UNKNOWN', 'Puter tidak mengembalikan URL gambar.');
    blob = await fetch(source).then(r => r.blob());
  }
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

async function callGeminiImage(apiKey: string, model: string, prompt: string, opts: ImageGenOptions, signal?: AbortSignal): Promise<Blob> {
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
  if (opts.inputImage) {
    const base64 = await blobToBase64(opts.inputImage);
    parts.push({ inlineData: { mimeType: opts.inputImage.type || 'image/png', data: base64.split(',')[1] || base64 } });
  }
  const effectiveModel = model || 'gemini-3.1-flash-image';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent`;
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
  // Dipanggil TEPAT SEBELUM sistem mencoba ulang TANPA foto input (Gemini gagal padahal
  // opts.inputImage awalnya ada) — supaya pemanggil bisa memberi tahu user hasilnya nanti
  // digenerate tanpa foto produk sebagai acuan.
  onInputImageDropped?: () => void;
}

const NON_TRANSIENT_IMAGE: ImageGenErrorCode[] = ['API_KEY_INVALID', 'QUOTA_EXCEEDED', 'UNSUPPORTED_INPUT'];

// Puter lalu Pollinations — keduanya TIDAK mendukung inputImage. Dipakai dua kali: sebagai chain
// awal saat tidak ada inputImage sejak awal, dan sebagai fallback saat Gemini gagal padahal
// inputImage awalnya ada (lihat generateImageWithFallback). `opts` yang dioper ke sini WAJIB
// sudah tanpa inputImage (dijamin oleh caller).
async function tryPuterThenPollinations(
  prompt: string,
  opts: ImageGenOptions,
  deps: ImageGenDeps,
  notify: (provider: ImageProvider, status: ProviderStatus) => void,
  errors: ImageGenError[],
): Promise<Blob | undefined> {
  // 1. Puter
  if (deps.puterEnabled !== false) {
    if (isPuterSkipped()) {
      notify('puter', 'skipped');
      errors.push(new ImageGenError('TIMEOUT', 'Puter dilewati (gagal sebelumnya — coba lagi nanti atau nonaktifkan di Settings).'));
    } else {
      try {
        notify('puter', 'trying');
        const result = await callPuter(prompt, opts, getPuterTimeout());
        markPuterSuccess();
        notify('puter', 'success');
        return result;
      } catch (e: unknown) {
        const err = e instanceof ImageGenError ? e : new ImageGenError('UNKNOWN', String(e));
        markPuterFailed();
        errors.push(err);
        notify('puter', 'failed');
        if (NON_TRANSIENT_IMAGE.includes(err.code)) throw err;
      }
    }
  }

  // 2. Pollinations
  try {
    notify('pollinations', 'trying');
    const result = await withTimeout((signal) => callPollinations(prompt, opts.ratio, signal), 60_000);
    notify('pollinations', 'success');
    return result;
  } catch (e: unknown) {
    const err = e instanceof ImageGenError ? e : new ImageGenError('UNKNOWN', String(e));
    errors.push(err);
    notify('pollinations', 'failed');
    if (NON_TRANSIENT_IMAGE.includes(err.code)) throw err;
  }

  return undefined;
}

export async function generateImageWithFallback(prompt: string, opts: ImageGenOptions, deps: ImageGenDeps): Promise<Blob> {
  const errors: ImageGenError[] = [];
  const notify = (provider: ImageProvider, status: ProviderStatus) => deps.onProviderStatus?.(provider, status);

  // 1+2. Puter & Pollinations — skip sepenuhnya kalau ada inputImage (keduanya tidak mendukung gambar input)
  if (!opts.inputImage) {
    try {
      const result = await tryPuterThenPollinations(prompt, opts, deps, notify, errors);
      if (result) return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // 3. Gemini Image — satu-satunya provider yang mendukung inputImage — butuh API key
  if (deps.geminiApiKey) {
    try {
      notify('gemini_image', 'trying');
      const result = await withTimeout((signal) => callGeminiImage(deps.geminiApiKey, deps.geminiImageModel || 'gemini-3.1-flash-image', prompt, opts, signal), 90_000);
      notify('gemini_image', 'success');
      return result;
    } catch (e: unknown) {
      const err = e instanceof ImageGenError ? e : new ImageGenError('UNKNOWN', String(e));
      errors.push(err);
      notify('gemini_image', 'failed');

      if (opts.inputImage) {
        // Gemini gagal (apa pun alasannya) padahal ada foto input — daripada gagal total, coba
        // lagi TANPA foto lewat Puter/Pollinations supaya user tetap dapat hasil (tanpa acuan produk).
        deps.onInputImageDropped?.();
        try {
          const fallbackResult = await tryPuterThenPollinations(prompt, { ...opts, inputImage: undefined }, deps, notify, errors);
          if (fallbackResult) return fallbackResult;
        } catch (fallbackErr) {
          return Promise.reject(fallbackErr);
        }
      } else if (NON_TRANSIENT_IMAGE.includes(err.code)) {
        return Promise.reject(err);
      }
    }
  }

  if (errors.length > 0) {
    if (opts.inputImage) {
      // errors[0] = percobaan Gemini (dengan foto), sisanya = fallback Puter/Pollinations (tanpa foto).
      const geminiErr = errors[0];
      const fallbackErr = errors[errors.length - 1];
      throw new ImageGenError('ALL_FAILED', `Semua provider gagal. Gemini (dengan foto produk): ${geminiErr.message} — Provider cadangan (tanpa foto): ${fallbackErr.message}`);
    }
    const lastMsg = errors[errors.length - 1].message;
    throw new ImageGenError('ALL_FAILED', `Semua provider gagal. Error terakhir: ${lastMsg}`);
  }
  throw new ImageGenError('NO_PROVIDER', 'Tidak ada provider yang tersedia. Aktifkan Puter atau konfigurasi API key Gemini di Settings.');
}
