import { FormData, VideoJSON, SceneData } from '../types';
import { PolicyViolation, checkPolicyCompliance } from './policyCheck';
import { NEGATIVE_PROMPT_BLOCK, CAMERA_REF_RULE, SPOKEN_NUMBER_RULE } from './negativePrompt';
import { ValidationResult } from './jsonParser';
import { validateSceneData, getSceneRegenExpectation, SceneRegenExpectation } from './sceneRegen';
import { parseJsonResponse } from './registry/shared';

// Tugas 3 — auto-rephrase: dipanggil saat scene/caption Flagged KARENA policy (bukan word-count).
// Beda dengan sceneRegen.ts (Tugas 1) yang menulis ulang SELURUH scene, di sini instruksinya
// membatasi AI untuk HANYA menulis ulang field teks yang melanggar, field lain disalin apa adanya.

function formatViolationsList(violations: PolicyViolation[]): string {
  return violations.map((v, i) => `${i + 1}. Field "${v.field}": kata "${v.match}" — kategori ${v.category}. Saran: ${v.suggestion}`).join('\n');
}

export function buildSceneRephrasePrompt(videoJSON: VideoJSON, sceneIndex: number, violations: PolicyViolation[], form: FormData, narrationWPM: number = 165): string {
  const scene = videoJSON.scenes[sceneIndex];
  const exp = getSceneRegenExpectation(videoJSON, sceneIndex, form, narrationWPM);

  return `Kamu adalah editor policy-compliance yang memperbaiki SATU scene video pendek yang melanggar
kebijakan konten. JANGAN menulis ulang seluruh scene — HANYA field yang disebutkan di daftar
pelanggaran di bawah. Field lain WAJIB disalin PERSIS apa adanya, karakter demi karakter.

INSTRUKSI KRITIS: Output kamu HANYA satu objek JSON scene tunggal (skema SceneData persis). Mulai
dengan { dan akhiri dengan }. Tidak ada teks lain, tidak ada markdown wrapper.

[DAFTAR PELANGGARAN YANG HARUS DIPERBAIKI]
${formatViolationsList(violations)}

ATURAN PERBAIKAN:
- Tulis ulang HANYA field yang disebutkan di daftar pelanggaran di atas (mis. script_narration,
  text_overlay, ai_ready_prompt) — ganti kata/frasa yang melanggar dengan alternatif policy-safe,
  PERTAHANKAN makna dan maksud kalimat.
- script_narration: jika diubah, jumlah kata WAJIB tetap dalam rentang 85%-100% dari max_words
  (${exp.maxWords} kata) — JANGAN sampai jadi terlalu pendek/panjang karena penggantian kata.
- ai_ready_prompt: jika diubah, WAJIB tetap diawali persis dengan character_sheet berikut (jika ada)
  dan tetap maksimal ${exp.charLimit} karakter:
  ${exp.characterAnchor ? `'${exp.characterAnchor}'` : '(tidak ada character_sheet untuk video ini)'}
${exp.characterBindingSentence ? `- ai_ready_prompt: jika diubah, WAJIB tetap menyertakan kalimat pengikat karakter: "${exp.characterBindingSentence}" — tanpa ini AI video tool mengabaikan foto referensi karakter.` : ''}
- scene_number (${exp.sceneNumber}), duration_seconds (${exp.durationSeconds}), dan max_words
  (${exp.maxWords}) TIDAK BOLEH berubah.
- Field lain yang TIDAK disebutkan di daftar pelanggaran WAJIB disalin apa adanya, tanpa perubahan.
${exp.locationRef?.role === 'environment' ? `- Kalau camera_direction ikut ditulis ulang, tetap patuhi aturan kamera scene ber-referensi lokasi (lihat blok di bawah).` : ''}
- Kalau script_narration ikut ditulis ulang, tetap patuhi aturan pengucapan angka (lihat blok di bawah).

${NEGATIVE_PROMPT_BLOCK}

${SPOKEN_NUMBER_RULE}
${exp.locationRef?.role === 'environment' ? `\n${CAMERA_REF_RULE}` : ''}

[SCENE JSON LENGKAP YANG HARUS DIPERBAIKI]
${JSON.stringify(scene, null, 2)}

GUARDRAIL: Output HANYA satu objek JSON scene tunggal, struktur identik dengan input. Mulai {, akhiri }.`;
}

export function validateSceneRephrase(scene: SceneData, expectation: SceneRegenExpectation, videoJSON: VideoJSON, form: FormData): ValidationResult {
  const base = validateSceneData(scene, expectation);
  // Re-scan scene HASIL rephrase untuk pelanggaran yang tersisa — bungkus dalam videoJSON tiruan
  // beranggotakan satu scene supaya bisa pakai checkPolicyCompliance apa adanya (tanpa duplikasi logic).
  const remaining = checkPolicyCompliance({ ...videoJSON, scenes: [scene] } as VideoJSON, form.contentGoal)
    .filter(v => v.sceneNumber === scene.scene_number);
  const warnings = [...base.warnings];
  remaining.forEach(v => warnings.push(`Masih melanggar: [${v.category}] "${v.match}" di ${v.field} — ${v.suggestion}`));
  return { valid: base.valid, errors: base.errors, warnings };
}

export function parseSceneRephraseResponse(rawText: string): SceneData | null {
  return parseJsonResponse<SceneData>(rawText);
}

// ==================== CAPTION REPHRASE ====================

export interface CaptionVariation {
  caption_text: string;
  hashtags: string[];
}

export function buildCaptionRephrasePrompt(videoJSON: VideoJSON, captionIndex: number, violations: PolicyViolation[], form: FormData): string {
  const cv = videoJSON.production_notes.caption_variations[captionIndex];
  return `Kamu adalah editor policy-compliance yang memperbaiki SATU variasi caption video yang
melanggar kebijakan konten. Output kamu HANYA satu objek JSON { "caption_text": "...", "hashtags":
[...] }. Mulai dengan { dan akhiri dengan }. Tidak ada teks lain, tidak ada markdown wrapper.

[DAFTAR PELANGGARAN YANG HARUS DIPERBAIKI]
${formatViolationsList(violations)}

ATURAN PERBAIKAN:
- Tulis ulang caption_text dan/atau hashtags yang melanggar dengan alternatif policy-safe,
  PERTAHANKAN makna, nada, dan panjang kira-kira sama.
- Jumlah hashtags WAJIB tetap PERSIS ${cv.hashtags.length} item, semua diawali #.
- Bagian caption_text/hashtags yang TIDAK melanggar boleh disalin apa adanya.

[CAPTION VARIATION JSON YANG HARUS DIPERBAIKI]
${JSON.stringify(cv, null, 2)}

GUARDRAIL: Output HANYA satu objek JSON { "caption_text": "...", "hashtags": [...] }. Mulai {, akhiri }.`;
}

export function validateCaptionRephrase(cv: CaptionVariation, expectedHashtagCount: number, videoJSON: VideoJSON, captionIndex: number, form: FormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!cv.caption_text) errors.push('caption_text kosong.');
  if (!cv.hashtags || cv.hashtags.length !== expectedHashtagCount) {
    errors.push(`Jumlah hashtags harus PERSIS ${expectedHashtagCount}, dapat ${cv.hashtags?.length ?? 0}.`);
  }

  const fakeJson: VideoJSON = {
    ...videoJSON,
    scenes: [],
    production_notes: { ...videoJSON.production_notes, caption_variations: [cv] },
  };
  const remaining = checkPolicyCompliance(fakeJson, form.contentGoal).filter(v => v.field === 'caption_variations[1]');
  remaining.forEach(v => warnings.push(`Masih melanggar: [${v.category}] "${v.match}" — ${v.suggestion}`));

  return { valid: errors.length === 0, errors, warnings };
}

export function parseCaptionRephraseResponse(rawText: string): CaptionVariation | null {
  return parseJsonResponse<CaptionVariation>(rawText);
}
