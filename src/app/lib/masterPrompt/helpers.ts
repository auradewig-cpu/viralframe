import { FormData } from '../../types';
import { getLipsyncSpec } from '../lipsync';

export function getSceneDurations(form: FormData): number[] {
  if (form.durationMode === 'uniform') {
    return Array(form.sceneCount).fill(form.uniformDuration);
  }
  const durations = [...form.sceneDurations];
  while (durations.length < form.sceneCount) durations.push(form.uniformDuration);
  return durations.slice(0, form.sceneCount);
}

export function buildCharacterBlock(form: FormData): string {
  if (form.talentStyle === 'faceless_pov') {
    return `POV Faceless — hanya tangan talent yang tampil, TIDAK ADA wajah sama sekali. Deskripsi tangan: ${form.handDescription || 'tidak ditentukan'}`;
  }
  if (!form.useCharacter) {
    return `Tidak ada karakter. Visual anchor: ${form.visualAnchor || 'tidak ditentukan'}`;
  }
  if (form.characterGender === 'duo') {
    return `Duo characters: ${form.characterAge}-year-old ${form.characterEthnicity} male and ${form.characterAge}-year-old ${form.characterEthnicity} female, both in ${form.characterStyle}, ${form.characterTraits}. Both characters MUST appear together in all scenes unless scene type requires solo shot.`;
  }
  const gender = form.characterGender === 'male' ? 'male' : 'female';
  return `${form.characterAge}-year-old ${form.characterEthnicity} ${gender}, ${form.characterStyle}, ${form.characterTraits}`;
}

export const EXPR_MAP: Record<string, string> = {
  auto: 'expressive',
  excited_joyful: 'excited and joyful',
  confident_authoritative: 'confident and authoritative',
  surprised_amazed: 'surprised and amazed',
  warm_friendly: 'warm and friendly',
  urgent_intense: 'urgent and intense',
  empathetic_relatable: 'empathetic and relatable',
  playful_humorous: 'playful and humorous',
  mysterious_dramatic: 'mysterious and dramatic',
  curious_investigative: 'curious and investigative',
};

export const ETHNICITY_FEATURES: Record<string, string> = {
  'Asia Tenggara': 'Southeast Asian features',
  'Asia Timur': 'East Asian features',
  'Asia Selatan': 'South Asian features',
  'Kaukasia': 'Caucasian features',
  'Afrika': 'African features',
  'Latin': 'Latino features',
  'Timur Tengah': 'Middle Eastern features',
  'Mixed': 'Mixed features',
};

export const BAHASA_LABEL: Record<string, string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
  id_en: 'Bahasa Indonesia',
  en_id: 'English',
};

export function buildCharacterAnchor(form: FormData): string {
  if (form.talentStyle === 'faceless_pov') {
    return `POV first-person shot, only talent's hand visible, no face visible, no reflection showing face. Hand: ${form.handDescription || 'tidak ditentukan'}`;
  }
  if (!form.useCharacter) return '';
  const features = ETHNICITY_FEATURES[form.characterEthnicity] || form.characterEthnicity;
  const expr = EXPR_MAP[form.expression] || 'expressive';
  const traits = form.characterTraits ? `, ${form.characterTraits}` : '';
  if (form.characterGender === 'duo') {
    return `Duo characters: ${form.characterAge}-year-old ${features} male and ${form.characterAge}-year-old ${features} female, both in ${form.characterStyle} style${traits}, ${expr} expression`;
  }
  const gender = form.characterGender === 'male' ? 'male' : 'female';
  return `${form.characterAge}-year-old ${features} ${gender}, ${form.characterStyle} style${traits}, ${expr} expression`;
}

export function buildLangInstruction(language: string): string {
  if (language === 'id') return 'BAHASA: script_narration HARUS dalam Bahasa Indonesia. script_subtitle = null.';
  if (language === 'en') return 'BAHASA: script_narration HARUS dalam English. script_subtitle = null.';
  if (language === 'id_en') return 'BAHASA: script_narration dalam Bahasa Indonesia, script_subtitle dalam English.';
  if (language === 'en_id') return 'BAHASA: script_narration dalam English, script_subtitle dalam Bahasa Indonesia.';
  return '';
}

export function buildContentGoalBlock(contentGoal: string): string {
  if (contentGoal === 'growth') {
    return `TUJUAN KONTEN: 🌱 GROWTH AKUN — akun masih baru, WAJIB kejar follow/save/share, TANPA bahasa jualan sama sekali.
WAJIB DIPATUHI di SEMUA script_narration, ai_ready_prompt, text_overlay, dan caption_variations:
✗ DILARANG KERAS kata/frasa komersial: "beli", "checkout", "keranjang", "link bio", "promo", "diskon", "harga", "order", "cod", "COD", "gratis ongkir", atau ajakan transaksi apapun.
✓ Format WAJIB value-first: edukasi jujur, rekomendasi/review netral, tips bermanfaat — BUKAN pitch jualan.
✓ Hook WAJIB diorientasikan ke rasa ingin SAVE (menyimpan info) atau FOLLOW (ingin konten berikutnya), bukan ke urgensi beli.
✓ Caption TANPA hashtag jualan (dilarang: #tiktokshop, #racuntiktokshop, #jualan, #promo, #diskon, dsb.) — ganti dengan hashtag niche/edukasi yang relevan dengan topik konten.
✓ CTA HANYA boleh berupa ajakan follow/save/share/comment (lihat CTA TYPE di bawah) — TIDAK ADA CTA transaksi.`;
  }
  if (contentGoal === 'engagement') {
    return `TUJUAN KONTEN: 💬 ENGAGEMENT — prioritaskan komentar & interaksi. Hook dan CTA diarahkan memancing penonton berkomentar (pertanyaan terbuka, opini, ajakan "vote di komentar"). Bahasa jualan tetap boleh ringan sesuai gaya konten, tapi fokus utama adalah memancing diskusi.`;
  }
  return `TUJUAN KONTEN: 💰 KONVERSI — perilaku standar sesuai GAYA KONTEN dan INTENSITAS CTA di bawah.`;
}

export function buildAdvancedBlocks(form: FormData): string {
  let blocks = '';
  if (form.requiredKeywords.length > 0) blocks += `KATA KUNCI WAJIB: ${form.requiredKeywords.join(', ')}\n`;
  if (form.blacklistWords.length > 0) blocks += `KATA DILARANG: ${form.blacklistWords.join(', ')}\n`;
  if (form.referenceStyle) blocks += `GAYA REFERENSI: ${form.referenceStyle}\n`;
  if (form.brandColor) blocks += `Brand color dominant: ${form.brandColor}\n`;
  if (form.avoidColor) blocks += `Warna yang dihindari: ${form.avoidColor}\n`;
  if (form.textOverlay) blocks += `Sertakan text overlay per scene\n`;
  if (form.subtitleStyle !== 'None') blocks += `Subtitle style: ${form.subtitleStyle}\n`;
  if (form.locationDescription) blocks += `DESKRIPSI LOKASI/PROPERTI: ${form.locationDescription}\n`;
  if (form.pipelineBrief) blocks += `\nBRIEF DARI PIPELINE (konteks perencanaan, WAJIB dijadikan dasar topik/hook/narasi):\n${form.pipelineBrief}\n`;
  return blocks;
}
