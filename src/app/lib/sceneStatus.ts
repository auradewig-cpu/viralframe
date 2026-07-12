import { VideoJSON, FormData } from '../types';
import { countWords } from './jsonParser';
import { checkPolicyCompliance, PolicyViolation } from './policyCheck';
import { getValidLocationRefs, getSceneLocationRef } from './locationRefs';

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
