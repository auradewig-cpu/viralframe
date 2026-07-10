import { AI_TOOLS } from './maps';
import { VideoJSON } from '../types';

export function parseAiResponse(rawText: string): VideoJSON | null {
  // Step 1: try direct parse
  try { return JSON.parse(rawText) as VideoJSON; } catch {}

  // Step 2: auto-strip — find first { and last }
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(rawText.slice(start, end + 1)) as VideoJSON; } catch {}
  }

  return null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateVideoJSON(json: VideoJSON, expectedSceneCount: number, expectedCaptionCount: number = 1, expectedAiTool?: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Prioritaskan aiTool dari form (pasti slug valid) — AI kadang meng-echo label alih-alih slug.
  const aiTool = expectedAiTool || json.video_metadata?.ai_video_tool || '';
  const toolInfo = AI_TOOLS.find(t => t.value === aiTool);
  const charLimit = toolInfo?.charLimit || 400;

  if (!json.video_metadata) errors.push('Field "video_metadata" tidak ditemukan.');
  if (!json.global_style) errors.push('Field "global_style" tidak ditemukan.');
  if (!json.character_sheet) errors.push('Field "character_sheet" tidak ditemukan.');
  if (!json.scenes || !Array.isArray(json.scenes)) {
    errors.push('Field "scenes" tidak ditemukan atau bukan array.');
  } else {
    if (json.scenes.length !== expectedSceneCount) {
      errors.push(`Jumlah scene tidak sesuai. Diharapkan ${expectedSceneCount}, dapat ${json.scenes.length}.`);
    }
    const anchor = json.character_sheet?.used ? (json.character_sheet.description || '').trim() : '';
    json.scenes.forEach((scene, i) => {
      if (!scene.ai_ready_prompt) errors.push(`Scene ${i + 1}: field "ai_ready_prompt" kosong.`);
      else {
        if (scene.ai_ready_prompt.length > charLimit) {
          warnings.push(`Scene ${i + 1}: panjang prompt (${scene.ai_ready_prompt.length} chars) melebihi batas tool ${charLimit} chars.`);
        }
        if (anchor && !scene.ai_ready_prompt.startsWith(anchor)) {
          warnings.push(`Scene ${i + 1}: ai_ready_prompt tidak diawali CHARACTER ANCHOR verbatim — konsistensi karakter antar scene berisiko rusak.`);
        }
      }
      if (!scene.script_narration) {
        warnings.push(`Scene ${i + 1}: "script_narration" kosong.`);
      } else if (scene.max_words > 0) {
        // Hitung kata AKTUAL, jangan percaya script_word_count yang dilaporkan AI sendiri.
        const actual = countWords(scene.script_narration);
        if (actual > scene.max_words) {
          warnings.push(`Scene ${i + 1}: narasi aktual ${actual} kata, melebihi batas lipsync ${scene.max_words} kata — talent tidak akan sempat mengucapkannya.`);
        } else if (actual < Math.ceil(scene.max_words * 0.6)) {
          warnings.push(`Scene ${i + 1}: narasi aktual ${actual} kata, jauh di bawah target 85% dari ${scene.max_words} kata — pacing akan terasa kosong.`);
        }
      }
    });
  }
  if (!json.production_notes) {
    warnings.push('Field "production_notes" tidak ditemukan.');
  } else {
    const captionVariations = json.production_notes.caption_variations;
    if (!captionVariations || !Array.isArray(captionVariations) || captionVariations.length === 0) {
      errors.push('Field "caption_variations" kosong atau tidak ditemukan.');
    } else {
      if (captionVariations.length !== expectedCaptionCount) {
        warnings.push(`Jumlah variasi caption tidak sesuai. Diharapkan ${expectedCaptionCount}, dapat ${captionVariations.length}.`);
      }
      captionVariations.forEach((cv, i) => {
        if (!cv.caption_text) errors.push(`Variasi caption ${i + 1}: field "caption_text" kosong.`);
        if (!cv.hashtags || cv.hashtags.length < 1) {
          errors.push(`Variasi caption ${i + 1}: "hashtags" kosong.`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Repair loop: satu retry tertarget jauh lebih murah daripada regenerate penuh.
// Kirim JSON bermasalah + daftar pelanggaran, minta AI memperbaiki HANYA field yang bermasalah.
export function buildRepairPrompt(json: VideoJSON, problems: string[], expectedSceneCount: number, expectedCaptionCount: number, aiToolValue: string): string {
  const toolInfo = AI_TOOLS.find(t => t.value === aiToolValue);
  const charLimit = toolInfo?.charLimit || 400;
  return `Kamu sebelumnya menghasilkan JSON video berikut, tetapi validator menemukan masalah.

DAFTAR MASALAH YANG HARUS DIPERBAIKI:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ATURAN PERBAIKAN:
- Perbaiki HANYA field yang bermasalah di daftar atas. Field lain WAJIB disalin apa adanya tanpa perubahan.
- Total scene HARUS PERSIS ${expectedSceneCount}. Total caption_variations HARUS PERSIS ${expectedCaptionCount}.
- Setiap ai_ready_prompt maksimal ${charLimit} karakter dan (jika ada karakter) WAJIB diawali character_sheet.description verbatim.
- Setiap script_narration: jumlah kata aktual antara 85%–100% dari max_words scene tersebut.
- Semua klaim absolut/medis/testimonial di-rewrite menjadi observasi netral yang policy-safe.
- Output kamu HANYA JSON lengkap yang sudah diperbaiki, dengan struktur identik. Mulai dengan { dan akhiri dengan }. Tanpa penjelasan, tanpa markdown.

JSON YANG HARUS DIPERBAIKI:
${JSON.stringify(json, null, 2)}`;
}
