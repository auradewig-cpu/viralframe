import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDimensions,
  buildPollinationsUrl,
  generateImageWithFallback,
  ImageGenError,
} from '../imageClient';
import type { ImageGenDeps, ImageGenOptions } from '../imageClient';

// ── Ratio→Dimensions ──────────────────────────────────────────

describe('getDimensions', () => {
  it('16:9 → 1280x720', () => {
    expect(getDimensions('16:9')).toEqual({ width: 1280, height: 720 });
  });

  it('9:16 → 720x1280', () => {
    expect(getDimensions('9:16')).toEqual({ width: 720, height: 1280 });
  });

  it('1:1 → 1024x1024', () => {
    expect(getDimensions('1:1')).toEqual({ width: 1024, height: 1024 });
  });

  it('unknown ratio falls back to 1024x1024', () => {
    expect(getDimensions('4:3')).toEqual({ width: 1024, height: 1024 });
  });
});

// ── Pollinations URL ──────────────────────────────────────────

describe('buildPollinationsUrl', () => {
  it('builds correct URL with encoded prompt and dimensions', () => {
    const url = buildPollinationsUrl('a cat wearing a hat', '16:9');
    expect(url).toContain(encodeURIComponent('a cat wearing a hat'));
    expect(url).toContain('width=1280');
    expect(url).toContain('height=720');
    expect(url).toContain('model=flux');
    expect(url).toContain('nologo=true');
  });

  it('encodes special characters in prompt', () => {
    const url = buildPollinationsUrl('hello & goodbye + more', '1:1');
    expect(url).toContain(encodeURIComponent('hello & goodbye + more'));
    expect(url).toContain('model=flux');
  });

  it('uses correct dimensions for 9:16 ratio', () => {
    const url = buildPollinationsUrl('test', '9:16');
    expect(url).toContain('width=720');
    expect(url).toContain('height=1280');
  });
});

// ── Skip provider logic & fallback ────────────────────────────

describe('generateImageWithFallback - skip logic', () => {
  beforeEach(() => {
    // Mock fetch for Pollinations/Gemini calls
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns ALL_FAILED when only Pollinations runs and it fails (puter disabled, no gemini key)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    try {
      await generateImageWithFallback('test prompt', { ratio: '1:1' }, {
        geminiApiKey: '',
        puterEnabled: false,
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ImageGenError);
      expect((e as ImageGenError).code).toBe('ALL_FAILED');
    }
  });

  it('skips Puter and Pollinations when inputImage is provided (only Gemini can handle it)', async () => {
    vi.stubGlobal('FileReader', class MockFileReader {
      result: string | null = null;
      onloadend: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh';
        if (this.onloadend) this.onloadend();
      }
    } as unknown as typeof FileReader);

    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    const geminiResponse = {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ inlineData: { mimeType: 'image/png', data: 'ZmFrZS1pbWFnZS1kYXRh' } }],
          },
        }],
      }),
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(geminiResponse);

    const result = await generateImageWithFallback('test prompt', { ratio: '1:1', inputImage: fakeBlob }, {
      geminiApiKey: 'test-key',
      puterEnabled: true,
    });
    expect(result).toBeInstanceOf(Blob);
  });

  it('returns ALL_FAILED when all providers that run fail', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    try {
      await generateImageWithFallback('test', { ratio: '1:1' }, {
        geminiApiKey: '',
        puterEnabled: false,
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ImageGenError);
      expect((e as ImageGenError).code).toBe('ALL_FAILED');
    }
  });

  it('falls through providers when first ones fail, eventually succeeds with Gemini', async () => {
    const geminiResponse = {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ inlineData: { mimeType: 'image/png', data: btoa('gemini-image') } }],
          },
        }],
      }),
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(geminiResponse);

    // Puter is not loaded (window.puter is undefined) — will throw, then Pollinations fetch
    // will be called (but we only mock one call = gemini after failed pollinations)
    // Actually, Puter will fail with "Puter.ai tidak tersedia" since window.puter is undefined.
    // Then Pollinations will call fetch (our mock) and succeed... but the mock returns gemini response.
    // Let me structure this differently.

    // Reset: Puter undefined → fail, Pollinations fetch → fail with HTTP 500, Gemini → succeed
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 }) // Pollinations fail
      .mockResolvedValueOnce(geminiResponse)              // Gemini success
    );

    // Puter will fail because window.puter.ai.txt2img is undefined
    const result = await generateImageWithFallback('test', { ratio: '1:1' }, {
      geminiApiKey: 'test-key',
      puterEnabled: true,
    });
    expect(result).toBeInstanceOf(Blob);
  });
});

describe('generateImageWithFallback - error aggregation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('aggregates errors when all providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    try {
      await generateImageWithFallback('test', { ratio: '1:1' }, {
        geminiApiKey: 'bad-key',
        puterEnabled: true,
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ImageGenError);
      expect((e as ImageGenError).code).toBe('ALL_FAILED');
      expect((e as ImageGenError).message).toContain('Semua provider gagal');
    }
  });
});

describe('buildPollinationsUrl - edge cases', () => {
  it('handles empty prompt', () => {
    const url = buildPollinationsUrl('', '1:1');
    expect(url).toContain('width=1024');
    expect(url).toContain('height=1024');
  });

  it('handles prompt with unicode', () => {
    const url = buildPollinationsUrl('café français 中文', '16:9');
    expect(url).toContain(encodeURIComponent('café français 中文'));
  });
});

// ── GeminiImageModel dari deps ─────────────────────────────────

describe('generateImageWithFallback - geminiImageModel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('memakai geminiImageModel dari deps di endpoint Gemini', async () => {
    const geminiResponse = {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ inlineData: { mimeType: 'image/png', data: btoa('test') } }] },
        }],
      }),
    };
    // Pollinations gagal, Gemini sukses — pastikan endpoint pakai model dari deps
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 500 }) // Pollinations
      .mockResolvedValueOnce(geminiResponse);              // Gemini

    await generateImageWithFallback('test', { ratio: '1:1' }, {
      geminiApiKey: 'test-key',
      geminiImageModel: 'gemini-3.1-flash-image',
      puterEnabled: false,
    });

    const geminiCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('generativelanguage.googleapis.com')
    );
    expect(geminiCall).toBeDefined();
    expect((geminiCall![0] as string)).toContain('gemini-3.1-flash-image');
  });

  it('menggunakan fallback default gemini-3.1-flash-image saat geminiImageModel tidak diberikan', async () => {
    const geminiResponse = {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ inlineData: { mimeType: 'image/png', data: btoa('test') } }] },
        }],
      }),
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce(geminiResponse);

    await generateImageWithFallback('test', { ratio: '1:1' }, {
      geminiApiKey: 'test-key',
      puterEnabled: false,
      // geminiImageModel tidak diisi
    });

    const geminiCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('generativelanguage.googleapis.com')
    );
    expect(geminiCall).toBeDefined();
    expect((geminiCall![0] as string)).toContain('gemini-3.1-flash-image');
  });
});

// ── Puter timeout ──────────────────────────────────────────────

describe('generateImageWithFallback - Puter timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    // Mock window.puter sehingga Puter "loaded" tapi txt2img tidak pernah settle
    const existing = (globalThis as Record<string, unknown>).window;
    Object.defineProperty(globalThis, 'window', {
      value: {
        ...(typeof existing === 'object' && existing ? (existing as Record<string, unknown>) : {}),
        puter: {
          ai: {
            txt2img: vi.fn().mockReturnValue(new Promise<never>(() => {})),
          },
        },
      },
      writable: true,
      configurable: true,
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, blob: async () => new Blob(['fake']) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Puter yang menggantung (120s timeout) jatuh ke Pollinations', async () => {
    // Puter akan timeout via Promise.race internal → harus lanjut ke Pollinations
    const promise = generateImageWithFallback('test', { ratio: '1:1' }, {
      geminiApiKey: '',
      puterEnabled: true,
    });

    // Majukan waktu melewati 120s timeout Puter + proses ke Pollinations
    await vi.advanceTimersByTimeAsync(121_000);
    // Majukan lagi untuk Pollinations fetch
    await vi.advanceTimersByTimeAsync(1_000);

    const result = await promise;
    expect(result).toBeInstanceOf(Blob);
    // Pastikan Pollinations dipanggil (Puter gagal timeout)
    const pollinationsCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('pollinations')
    );
    expect(pollinationsCall).toBeDefined();
  });
});
