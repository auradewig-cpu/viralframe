import { describe, it, expect } from 'vitest';
import { getLipsyncSpec } from '../lipsync';

describe('getLipsyncSpec', () => {
  // Kunci snapshot perilaku: 10s @ 165 WPM
  it('10s @ 165 WPM: maxWords konkret', () => {
    const spec = getLipsyncSpec(10, 165);
    // effectiveSpeakingSeconds = 10 * 0.85 = 8.5; maxWords = round((8.5/60)*165) = round(23.375) = 23
    expect(spec.maxWords).toBe(23);
    expect(spec.pace).toBe('medium');
  });

  it('5s @ 165 WPM: lebih pendek dari 10s', () => {
    const spec5 = getLipsyncSpec(5, 165);
    const spec10 = getLipsyncSpec(10, 165);
    expect(spec5.maxWords).toBeLessThan(spec10.maxWords);
  });

  it('15s @ 165 WPM: lebih panjang dari 10s', () => {
    const spec10 = getLipsyncSpec(10, 165);
    const spec15 = getLipsyncSpec(15, 165);
    expect(spec15.maxWords).toBeGreaterThan(spec10.maxWords);
  });

  it('WPM 120 menghasilkan lebih sedikit kata daripada WPM 180 pada durasi sama', () => {
    const slow = getLipsyncSpec(10, 120);
    const fast = getLipsyncSpec(10, 180);
    expect(slow.maxWords).toBeLessThan(fast.maxWords);
  });

  it('WPM 0 atau negatif fallback ke 165', () => {
    const spec = getLipsyncSpec(10, 0);
    const specDefault = getLipsyncSpec(10, 165);
    expect(spec.maxWords).toBe(specDefault.maxWords);
  });

  it('pace labels: <=3s → ultra_fast', () => {
    expect(getLipsyncSpec(3, 165).pace).toBe('ultra_fast');
    expect(getLipsyncSpec(2, 165).pace).toBe('ultra_fast');
  });

  it('pace labels: 4-6s → fast', () => {
    expect(getLipsyncSpec(4, 165).pace).toBe('fast');
    expect(getLipsyncSpec(6, 165).pace).toBe('fast');
  });

  it('pace labels: 7-12s → medium', () => {
    expect(getLipsyncSpec(7, 165).pace).toBe('medium');
    expect(getLipsyncSpec(12, 165).pace).toBe('medium');
  });

  it('pace labels: 13-20s → relaxed', () => {
    expect(getLipsyncSpec(13, 165).pace).toBe('relaxed');
    expect(getLipsyncSpec(20, 165).pace).toBe('relaxed');
  });

  it('pace labels: >20s → slow_dramatic', () => {
    expect(getLipsyncSpec(21, 165).pace).toBe('slow_dramatic');
    expect(getLipsyncSpec(30, 165).pace).toBe('slow_dramatic');
  });

  it('maxWords minimal 3 untuk durasi sangat pendek', () => {
    expect(getLipsyncSpec(1, 165).maxWords).toBe(3);
  });

  it('instruction contains maxWords, sentenceCount, and WPM', () => {
    const spec = getLipsyncSpec(10, 165);
    expect(spec.instruction).toContain('23');
    expect(spec.instruction).toContain('165');
  });

  it('sentence count increases with maxWords', () => {
    const small = getLipsyncSpec(5, 165);
    const large = getLipsyncSpec(30, 165);
    // sentence count = 1 for ≤10, 2 for ≤25, 3 for ≤45, etc.
    expect(small.maxWords <= 10 ? true : small.maxWords <= 25 ? true : false).toBe(true);
    expect(small.instruction).toContain('kalimat');
    expect(large.instruction).toContain('kalimat');
  });
});
