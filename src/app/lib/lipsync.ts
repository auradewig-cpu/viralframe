export interface LipsyncSpec {
  maxWords: number;
  pace: string;
  instruction: string;
}

export function getLipsyncSpec(durationSeconds: number): LipsyncSpec {
  if (durationSeconds <= 3) return { maxWords: 8, pace: 'ultra_fast', instruction: 'Narasi maks 8 kata, satu kalimat tunggal, tegas' };
  if (durationSeconds <= 5) return { maxWords: 16, pace: 'fast', instruction: 'Narasi maks 16 kata, 1–2 kalimat pendek' };
  if (durationSeconds <= 8) return { maxWords: 26, pace: 'normal', instruction: 'Narasi maks 26 kata, 2 kalimat' };
  if (durationSeconds <= 12) return { maxWords: 44, pace: 'medium', instruction: 'Narasi maks 44 kata, 2–3 kalimat' };
  if (durationSeconds <= 20) return { maxWords: 72, pace: 'relaxed', instruction: 'Narasi maks 72 kata, 3–4 kalimat' };
  return { maxWords: 108, pace: 'slow_dramatic', instruction: 'Narasi maks 108 kata, 4–5 kalimat' };
}
