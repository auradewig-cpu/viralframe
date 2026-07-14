import { VideoJSON, FormData } from '../types';
import { countWords, hasDialogueTag, hasValidDialogueTagContent, hasEmbeddedDialogue, hasTimingInTextOverlay } from './jsonParser';
import { checkPolicyCompliance, PolicyViolation } from './policyCheck';
import { getValidLocationRefs, getSceneLocationRef, getCharacterRefFileName } from './locationRefs';

// "X koma Y" (mis. "empat koma lima miliar") adalah bentuk tulisan, belibet diucapkan — lihat
// SPOKEN_NUMBER_RULE di lib/negativePrompt.ts untuk aturan penuh yang dikirim ke AI. Deteksi ringan
// ini hanya warning (bukan error), tidak ada auto-fix — beda dari checkPolicyCompliance.
const SPOKEN_NUMBER_ISSUE_PATTERN = /\b(nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan)\s+koma\s+/i;

// Status per-scene SELALU derived — tidak pernah disimpan ke JSON output/history. Dihitung ulang
// dari videoJSON + form setiap kali dibutuhkan (badge Flagged/OK di SceneCard), supaya tetap akurat
// walau scene sudah diregenerate/di-rephrase (Tugas 1 & 3) tanpa perlu sinkronisasi status manual.
export function getSceneIssuesMap(json: VideoJSON, form: FormData): Record<number, string[]> {
  const map: Record<number, string[]> = {};

  const addIssue = (sceneNumber: number, issue: string) => {
    if (!map[sceneNumber]) map[sceneNumber] = [];
    map[sceneNumber].push(issue);
  };

  const validLocationRefs = getValidLocationRefs(form);
  const characterRefFileName = getCharacterRefFileName(form);

  (json.scenes || []).forEach(scene => {
    if (scene.script_narration && scene.max_words > 0) {
      const actual = countWords(scene.script_narration);
      if (actual > scene.max_words) {
        addIssue(scene.scene_number, `Narasi ${actual} kata, melebihi batas lipsync ${scene.max_words} kata.`);
      } else if (actual < Math.ceil(scene.max_words * 0.6)) {
        addIssue(scene.scene_number, `Narasi ${actual} kata, jauh di bawah target 85% dari ${scene.max_words} kata.`);
      }
    }
    if (validLocationRefs.length > 0) {
      const expectedRef = getSceneLocationRef(validLocationRefs, scene.scene_number);
      if (expectedRef && scene.reference_image?.file?.trim() !== expectedRef.file.trim()) {
        addIssue(scene.scene_number, `reference_image.file seharusnya "${expectedRef.file.trim()}" (ditugaskan via Referensi Lokasi/Produk), tapi hasilnya "${scene.reference_image?.file || '(kosong)'}".`);
      }
    }
    if (characterRefFileName && !(scene.ai_ready_prompt || '').includes(characterRefFileName)) {
      addIssue(scene.scene_number, `ai_ready_prompt tidak menyebut nama file foto karakter "${characterRefFileName}" — foto karakter mungkin diabaikan AI video tool.`);
    }
    if (scene.ai_ready_prompt && (form.aiTool === 'google_flow' || form.aiTool === 'veo3')) {
      if (!hasEmbeddedDialogue(scene.ai_ready_prompt, scene.script_narration)) {
        addIssue(scene.scene_number, 'ai_ready_prompt tidak menyisipkan dialog terkutip dari script_narration — Veo3/Flow tidak akan tahu harus mengucapkan apa, berisiko default ke Bahasa Inggris atau dialog karangan sendiri.');
      }
    } else if (scene.ai_ready_prompt && !hasDialogueTag(scene.ai_ready_prompt)) {
      const isVisualShockNoNarration =
        form.hookType === 'visual_shock' &&
        scene.scene_number === 1 &&
        (!scene.script_narration || countWords(scene.script_narration) <= 5);
      if (!isVisualShockNoNarration) {
        addIssue(scene.scene_number, 'ai_ready_prompt tidak menyertakan tag [DIALOGUE: ...] — AI video tool kemungkinan akan menghasilkan dialog berbahasa Inggris alih-alih bahasa yang diminta.');
      }
    } else if (scene.ai_ready_prompt && !hasValidDialogueTagContent(scene.ai_ready_prompt)) {
      addIssue(scene.scene_number, 'Tag [DIALOGUE: ...] berisi kalimat penuh, bukan nama bahasa saja — WAJIB hanya nama bahasa (mis. "Bahasa Indonesia"). Berisiko membuat dialog video berulang/rusak di AI video tool.');
    }
    if (hasTimingInTextOverlay(scene.text_overlay)) {
      addIssue(scene.scene_number, 'text_overlay mengandung timing/timestamp (mis. "(5s)") — akan ikut tercetak sebagai teks kalau di-burn ke video. Durasi sudah tercakup di duration_seconds.');
    }
    if (scene.script_narration && SPOKEN_NUMBER_ISSUE_PATTERN.test(scene.script_narration)) {
      addIssue(scene.scene_number, `Sebutan angka "X koma Y" sulit diucapkan — gunakan bentuk lisan (mis. "empat setengah miliar").`);
    }
  });

  checkPolicyCompliance(json, form.contentGoal).forEach(v => {
    if (v.sceneNumber === null) return; // pelanggaran level caption ditangani terpisah (lihat getCaptionIssues)
    addIssue(v.sceneNumber, `[${v.category}] "${v.match}" di ${v.field} — ${v.suggestion}`);
  });

  return map;
}

// Pelanggaran policy di caption_variations (sceneNumber === null di PolicyViolation) — dipakai
// Tugas 3 untuk badge/tombol perbaiki otomatis di bagian caption.
export function getCaptionIssues(json: VideoJSON, form: FormData): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  checkPolicyCompliance(json, form.contentGoal).forEach(v => {
    if (v.sceneNumber !== null) return;
    const match = /caption_variations\[(\d+)\]/.exec(v.field);
    const idx = match ? Number(match[1]) - 1 : 0;
    if (!map[idx]) map[idx] = [];
    map[idx].push(`[${v.category}] "${v.match}" — ${v.suggestion}`);
  });
  return map;
}

// Pelanggaran policy MENTAH (bukan string terformat) per scene — dipakai Tugas 3 untuk membedakan
// scene yang flagged KARENA policy (punya tombol "✨ Perbaiki otomatis") vs flagged hanya karena
// word-count (tidak ada yang bisa di-rephrase otomatis untuk itu).
export function getScenePolicyViolations(json: VideoJSON, form: FormData): Record<number, PolicyViolation[]> {
  const map: Record<number, PolicyViolation[]> = {};
  checkPolicyCompliance(json, form.contentGoal).forEach(v => {
    if (v.sceneNumber === null) return;
    if (!map[v.sceneNumber]) map[v.sceneNumber] = [];
    map[v.sceneNumber].push(v);
  });
  return map;
}

// Pelanggaran policy MENTAH per index caption_variations — pasangan dari getScenePolicyViolations.
export function getCaptionPolicyViolations(json: VideoJSON, form: FormData): Record<number, PolicyViolation[]> {
  const map: Record<number, PolicyViolation[]> = {};
  checkPolicyCompliance(json, form.contentGoal).forEach(v => {
    if (v.sceneNumber !== null) return;
    const match = /caption_variations\[(\d+)\]/.exec(v.field);
    const idx = match ? Number(match[1]) - 1 : 0;
    if (!map[idx]) map[idx] = [];
    map[idx].push(v);
  });
  return map;
}
