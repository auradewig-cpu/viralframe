import { VideoJSON, FormData } from '../types';
import { checkScene } from './sceneChecks';
import { checkPolicyCompliance, PolicyViolation } from './policyCheck';
import { getValidLocationRefs, getSceneLocationRef, getCharacterRefFileName } from './locationRefs';
import { AI_TOOLS } from './maps';

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
  const charLimit = AI_TOOLS.find(t => t.value === form.aiTool)?.charLimit || 400;
  const anchor = json.character_sheet?.used ? (json.character_sheet.description || '').trim() : '';

  (json.scenes || []).forEach(scene => {
    const expectedRef = validLocationRefs.length > 0 ? getSceneLocationRef(validLocationRefs, scene.scene_number) : null;
    // Cek kualitas terpusat — badge Flagged kini mencakup persis hal yang sama dengan
    // warning generate (termasuk charLimit & character anchor yang dulu tidak dicek di sini).
    checkScene(scene, {
      aiTool: form.aiTool,
      charLimit,
      characterAnchor: anchor,
      characterRefFileName,
      expectedLocationRefFile: expectedRef ? expectedRef.file.trim() : undefined,
      hookType: form.hookType,
    }).forEach(msg => addIssue(scene.scene_number, msg));

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
