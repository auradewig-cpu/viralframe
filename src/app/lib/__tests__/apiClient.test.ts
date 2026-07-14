import { describe, it, expect, vi, afterEach } from 'vitest';
import { getOrderedProviders, generateWithFallback, ApiKeys } from '../apiClient';

function makeKeys(overrides?: Partial<ApiKeys>): ApiKeys {
  return {
    gemini: 'gemini-key',
    groq: 'groq-key',
    openrouter: 'openrouter-key',
    ...overrides,
  };
}

describe('getOrderedProviders', () => {
  it('returns providers in given order', () => {
    const keys = makeKeys();
    const result = getOrderedProviders(keys, ['groq', 'openrouter', 'gemini']);
    expect(result).toEqual(['groq', 'openrouter', 'gemini']);
  });

  it('returns providers in reverse order', () => {
    const keys = makeKeys();
    const result = getOrderedProviders(keys, ['openrouter', 'groq', 'gemini']);
    expect(result).toEqual(['openrouter', 'groq', 'gemini']);
  });

  it('filters out providers without API keys', () => {
    const keys = makeKeys({ groq: '' });
    const result = getOrderedProviders(keys, ['gemini', 'groq', 'openrouter']);
    expect(result).toEqual(['gemini', 'openrouter']);
  });

  it('returns empty array when no keys configured', () => {
    const keys = makeKeys({ gemini: '', groq: '', openrouter: '' });
    const result = getOrderedProviders(keys, ['gemini', 'groq', 'openrouter']);
    expect(result).toEqual([]);
  });

  it('returns empty array for corrupt order (missing providers)', () => {
    const keys = makeKeys();
    const result = getOrderedProviders(keys, ['gemini', 'groq'] as ('gemini' | 'groq' | 'openrouter')[]);
    expect(result).toEqual([]);
  });

  it('returns empty array for corrupt order (extra providers)', () => {
    const keys = makeKeys();
    const result = getOrderedProviders(keys, ['gemini', 'groq', 'openrouter', 'gemini'] as ('gemini' | 'groq' | 'openrouter')[]);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty order', () => {
    const keys = makeKeys();
    const result = getOrderedProviders(keys, []);
    expect(result).toEqual([]);
  });
});

describe('generateWithFallback — fallback pada error non-transient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Regresi yang pernah terjadi: NON_TRANSIENT (mis. QUOTA_EXCEEDED di Gemini) mem-break
  // SELURUH chain sehingga Groq tidak pernah dicoba — padahal quota habis justru alasan
  // utama fallback. Test ini mengunci perilaku benar: provider berikutnya TETAP dicoba.
  it('Gemini QUOTA_EXCEEDED tetap lanjut ke Groq (bukan berhenti total)', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('generativelanguage.googleapis.com')) {
        return new Response('{}', { status: 429 });
      }
      if (u.includes('api.groq.com')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
      }
      throw new Error(`URL tak terduga: ${u}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback<{ ok: boolean }>(
      'prompt', makeKeys(),
      (t) => { try { return JSON.parse(t); } catch { return null; } },
      () => {},
    );
    expect(result).toEqual({ ok: true });
    // Gemini dipanggil sekali (429, tanpa retry karena non-transient), lalu Groq.
    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls.filter(u => u.includes('generativelanguage')).length).toBe(1);
    expect(urls.some(u => u.includes('api.groq.com'))).toBe(true);
  });

  it('API_KEY_INVALID di provider pertama tetap mencoba provider berikutnya', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.groq.com')) {
        return new Response('{}', { status: 401 });
      }
      if (u.includes('openrouter.ai')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":1}' } }] }), { status: 200 });
      }
      throw new Error(`URL tak terduga: ${u}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback<{ ok: number }>(
      'prompt', makeKeys({ gemini: '' }),
      (t) => { try { return JSON.parse(t); } catch { return null; } },
      () => {},
      undefined, undefined,
      ['groq', 'openrouter', 'gemini'],
    );
    expect(result).toEqual({ ok: 1 });
    expect(fetchMock.mock.calls.some(c => String(c[0]).includes('openrouter.ai'))).toBe(true);
  });
});
