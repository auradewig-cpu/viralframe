export interface LipsyncSpec {
  maxWords: number;
  pace: string;
  instruction: string;
}

// Target WPM dikalibrasi untuk Bahasa Indonesia gaya cepat-tapi-jelas
// (presenter TikTok/reels yang lancar, bukan santai/formal, tapi juga bukan buru-buru sampai tidak jelas).
// Patokan Indonesia lebih rendah dari Inggris karena rata-rata suku kata per kata lebih banyak.
const TARGET_WPM = 165;

function getPaceLabel(durationSeconds: number): string {
  if (durationSeconds <= 3) return 'ultra_fast';
  if (durationSeconds <= 6) return 'fast';
  if (durationSeconds <= 12) return 'medium';
  if (durationSeconds <= 20) return 'relaxed';
  return 'slow_dramatic';
}

export function getLipsyncSpec(durationSeconds: number, targetWPM: number = TARGET_WPM): LipsyncSpec {
  // Sisihkan ~15% durasi untuk jeda natural/napas antar kalimat — tidak 100% durasi dipakai bicara terus-menerus.
  const effectiveSpeakingSeconds = durationSeconds * 0.85;
  const wpm = targetWPM > 0 ? targetWPM : TARGET_WPM;
  const maxWords = Math.max(3, Math.round((effectiveSpeakingSeconds / 60) * wpm));
  const pace = getPaceLabel(durationSeconds);
  const sentenceCount = maxWords <= 10 ? 1 : maxWords <= 25 ? 2 : maxWords <= 45 ? 3 : maxWords <= 70 ? 4 : 5;
  const instruction = `Narasi maks ${maxWords} kata, sekitar ${sentenceCount} kalimat pendek, dirancang untuk diucapkan cepat namun tetap jelas (~${wpm} kata/menit) — bukan buru-buru sampai tidak jelas.`;
  return { maxWords, pace, instruction };
}
