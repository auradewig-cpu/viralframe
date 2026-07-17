import { SceneData } from '../types';

// SATU-SATUNYA sumber kebenaran validasi kualitas per-scene. Dipakai tiga jalur:
// - jsonParser.validateVideoJSON (validasi full-video setelah generate/paste)
// - sceneRegen.validateSceneData (regenerate satu scene)
// - sceneStatus.getSceneIssuesMap (badge Flagged/OK di SceneCard)
// Dulu logika ini terduplikasi 3x dengan wording sedikit berbeda dan pernah drift
// (ambang word-count 60% vs 85%, hasTimingInTextOverlay lupa di-wire). JANGAN menambah
// cek kualitas per-scene langsung di ketiga file itu — tambahkan di sini.

// Ambang minimum rasio script_narration terhadap max_words — samakan dengan target 85%-100%
// yang dijanjikan di instruksi GAYA BICARA & ARTIKULASI master prompt.
export const MIN_NARRATION_RATIO = 0.85;

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Cek apakah text_overlay mengandung pola timing seperti "(5s)" atau "(0:01-0:05)".
export function hasTimingInTextOverlay(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\(\s*\d+s\s*\)|\(\s*\d+:\d+/.test(text);
}

export function hasDialogueTag(aiReadyPrompt: string): boolean {
  return aiReadyPrompt.includes('[DIALOGUE:');
}

// Cek apakah isi tag [DIALOGUE: ...] berupa nama bahasa (valid) atau kalimat penuh (invalid).
// Kalau tidak ada tag sama sekali → return true (bukan urusan fungsi ini, serahkan ke hasDialogueTag).
// Invalid: isi > 30 karakter ATAU mengandung tanda '?'/'!' (ciri kalimat, bukan nama bahasa).
export function hasValidDialogueTagContent(aiReadyPrompt: string): boolean {
  const match = /\[DIALOGUE:\s*([^\]]*)\]/.exec(aiReadyPrompt);
  if (!match) return true;
  const content = match[1].trim();
  if (content.length > 30) return false;
  if (/[?!]/.test(content)) return false;
  return true;
}

// Untuk google_flow/veo3 — cek apakah script_narration disisipkan verbatim sebagai dialog
// terkutip di ai_ready_prompt (konvensi resmi Veo3), bukan lewat tag [DIALOGUE: ...].
export function hasEmbeddedDialogue(aiReadyPrompt: string, scriptNarration: string | null | undefined): boolean {
  if (!scriptNarration || !scriptNarration.trim()) return true;
  const firstFourWords = scriptNarration.trim().split(/\s+/).slice(0, 4).join(' ');
  if (!firstFourWords) return true;
  return aiReadyPrompt.includes(firstFourWords);
}

export interface SceneCheckContext {
  // Slug AI tool ('' kalau tidak diketahui) — menentukan aturan dialog (embedded vs tag).
  aiTool: string;
  charLimit: number;
  // '' / undefined = tidak ada karakter → cek anchor/foto karakter di-skip.
  characterAnchor?: string;
  characterRefFileName?: string;
  // Nama file yang WAJIB ada di reference_image scene ini (sudah di-trim).
  // undefined/null = tidak ada penugasan → cek di-skip.
  expectedLocationRefFile?: string | null;
  // Batas kata narasi — kalau undefined pakai scene.max_words (jalur full-video);
  // sceneRegen mengoper nilai recompute dari durasi supaya tidak percaya angka AI.
  maxWords?: number;
  hookType?: string;
}

// Cek kualitas satu scene — return daftar pesan masalah TANPA prefix "Scene N:"
// (konsumen menambahkan prefix sesuai konteks tampilannya masing-masing).
export function checkScene(scene: SceneData, ctx: SceneCheckContext): string[] {
  const warnings: string[] = [];
  const prompt = scene.ai_ready_prompt || '';

  if (prompt) {
    if (prompt.length > ctx.charLimit) {
      warnings.push(`panjang ai_ready_prompt (${prompt.length} chars) melebihi batas tool ${ctx.charLimit} chars.`);
    }
    if (ctx.characterAnchor && !prompt.startsWith(ctx.characterAnchor)) {
      warnings.push('ai_ready_prompt tidak diawali CHARACTER ANCHOR verbatim — konsistensi karakter antar scene berisiko rusak.');
    }
    if (ctx.characterRefFileName && !prompt.includes(ctx.characterRefFileName)) {
      warnings.push(`ai_ready_prompt tidak menyebut nama file foto karakter "${ctx.characterRefFileName}" — foto karakter mungkin diabaikan AI video tool.`);
    }
    if (ctx.aiTool === 'google_flow' || ctx.aiTool === 'veo3') {
      if (!hasEmbeddedDialogue(prompt, scene.script_narration)) {
        warnings.push('ai_ready_prompt tidak menyisipkan dialog terkutip dari script_narration — Veo3/Flow tidak akan tahu harus mengucapkan apa, berisiko default ke Bahasa Inggris atau dialog karangan sendiri.');
      }
    } else if (!hasDialogueTag(prompt)) {
      const isVisualShockNoNarration =
        ctx.hookType === 'visual_shock' &&
        scene.scene_number === 1 &&
        (!scene.script_narration || countWords(scene.script_narration) <= 5);
      if (!isVisualShockNoNarration) {
        warnings.push('ai_ready_prompt tidak menyertakan tag [DIALOGUE: ...] — AI video tool kemungkinan akan menghasilkan dialog berbahasa Inggris alih-alih bahasa yang diminta.');
      }
    } else if (!hasValidDialogueTagContent(prompt)) {
      warnings.push('Tag [DIALOGUE: ...] berisi kalimat penuh, bukan nama bahasa saja — WAJIB hanya nama bahasa (mis. "Bahasa Indonesia"). Berisiko membuat dialog video berulang/rusak di AI video tool.');
    }
  }

  const maxWords = ctx.maxWords ?? scene.max_words;
  if (scene.script_narration && maxWords > 0) {
    // Hitung kata AKTUAL, jangan percaya script_word_count yang dilaporkan AI sendiri.
    const actual = countWords(scene.script_narration);
    if (actual > maxWords) {
      warnings.push(`narasi aktual ${actual} kata, melebihi batas lipsync ${maxWords} kata — talent tidak akan sempat mengucapkannya.`);
    } else if (actual < Math.ceil(maxWords * MIN_NARRATION_RATIO)) {
      warnings.push(`narasi aktual ${actual} kata, jauh di bawah target 85% dari ${maxWords} kata — pacing akan terasa kosong.`);
    }
  }

  if (ctx.expectedLocationRefFile) {
    if (scene.reference_image?.file?.trim() !== ctx.expectedLocationRefFile) {
      warnings.push(`seharusnya pakai reference_image.file "${ctx.expectedLocationRefFile}" (ditugaskan via Referensi Lokasi/Produk), tapi hasilnya "${scene.reference_image?.file || '(kosong)'}" — foto referensi mungkin diabaikan AI video tool.`);
    }
  }

  if (hasTimingInTextOverlay(scene.text_overlay)) {
    warnings.push('text_overlay mengandung timing/timestamp (mis. "(5s)") — akan ikut tercetak sebagai teks kalau di-burn ke video. Durasi sudah tercakup di duration_seconds.');
  }

  return warnings;
}
