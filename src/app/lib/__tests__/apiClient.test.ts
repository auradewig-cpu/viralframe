import { describe, it, expect } from 'vitest';
import { getOrderedProviders, ApiKeys } from '../apiClient';

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
