import { FormData, LocationRef } from '../types';

// Resolusi Multi-Reference Image berbasis TEKS (short_video saja) — dipakai masterPrompt.ts,
// sceneRegen.ts, jsonParser.ts, sceneStatus.ts, dan Step3Creative.tsx supaya logic role/matching
// scene TIDAK diduplikasi di setiap file. JANGAN copy-paste logic ini, selalu import dari sini.

export type LocationRefRole = 'environment' | 'product';

export interface ResolvedLocationRef {
  file: string;
  keterangan: string;
  sceneNumber: number | null;
  role: LocationRefRole;
}

export function sanitizeRefText(text: string): string {
  return text.trim().replace(/"/g, '');
}

// role di-DERIVE dari sceneNumber: sceneNumber !== null (ditugaskan ke scene spesifik) → environment,
// null ("Semua scene") → product. Backward compat: locationRefs kosong + referenceImageFilename lama
// terisi DAN referencePhotos ada (kondisi sama seperti perilaku lama) → diperlakukan sebagai satu ref
// product "Semua scene", supaya video lama tetap berperilaku identik.
export function getEffectiveLocationRefs(form: FormData): ResolvedLocationRef[] {
  const raw: LocationRef[] = form.locationRefs.length > 0
    ? form.locationRefs
    : (form.referencePhotos.length > 0 && form.referenceImageFilename.trim()
      ? [{ file: form.referenceImageFilename.trim(), keterangan: '', sceneNumber: null }]
      : []);

  return raw
    .filter(r => r.file.trim())
    .map(r => ({ ...r, role: (r.sceneNumber !== null ? 'environment' : 'product') as LocationRefRole }));
}

// Baris dengan sceneNumber melebihi sceneCount saat ini — invalid untuk compile prompt, tapi TIDAK
// pernah dihapus otomatis dari form (user mungkin menambah scene lagi nanti).
export function getInvalidLocationRefs(form: FormData): ResolvedLocationRef[] {
  return getEffectiveLocationRefs(form).filter(r => r.sceneNumber !== null && r.sceneNumber > form.sceneCount);
}

export function getValidLocationRefs(form: FormData): ResolvedLocationRef[] {
  return getEffectiveLocationRefs(form).filter(r => r.sceneNumber === null || r.sceneNumber <= form.sceneCount);
}

// Scene yang kebagian foto: sceneNumber cocok persis, atau ref "Semua scene" sebagai fallback kalau
// scene itu tidak punya ref spesifik.
export function getSceneLocationRef(refs: ResolvedLocationRef[], sceneNumber: number): ResolvedLocationRef | null {
  const specific = refs.find(r => r.sceneNumber === sceneNumber);
  if (specific) return specific;
  return refs.find(r => r.sceneNumber === null) || null;
}

export function buildReferenceImageInstruction(ref: ResolvedLocationRef): string {
  const file = sanitizeRefText(ref.file);
  if (ref.role === 'environment') {
    return `Match the attached photo "${file}" exactly — same architecture, colors, materials, windows, and proportions. Do not redesign the building/room.`;
  }
  return 'Match the attached reference image exactly. Keep original shape, color, and proportions. Must be consistent across all scenes. Do not redesign the product.';
}

export function buildReferenceImageJson(ref: ResolvedLocationRef): string {
  return `{ "file": "${sanitizeRefText(ref.file)}", "instruction": "${buildReferenceImageInstruction(ref)}" }`;
}

// Kalimat pengikat singkat untuk ai_ready_prompt — keterangan user = ENVIRONMENT/PRODUCT ANCHOR,
// pola sama dengan character anchor: fakta konkret dari user mengalahkan deskripsi generik AI.
export function buildBindingSentence(ref: ResolvedLocationRef): string {
  const file = sanitizeRefText(ref.file);
  const ket = sanitizeRefText(ref.keterangan);
  const label = ref.role === 'environment' ? 'location' : 'product';
  return ket ? `${label} matches reference photo ${file}: ${ket}` : `${label} matches reference photo ${file}`;
}
