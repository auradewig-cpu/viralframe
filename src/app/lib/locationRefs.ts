import { FormData, LocationRef } from '../types';
import { getRoomIdentity } from './roomIdentities';

// Resolusi Multi-Reference Image berbasis TEKS (short_video saja) — dipakai masterPrompt.ts,
// sceneRegen.ts, jsonParser.ts, sceneStatus.ts, dan Step3Creative.tsx supaya logic role/matching
// scene TIDAK diduplikasi di setiap file. JANGAN copy-paste logic ini, selalu import dari sini.
//
// KONTRAK PENTING (canonical rename, lihat lib/canonicalRefNames.ts + Step1Business.tsx):
// LocationRef.file adalah SATU-SATUNYA nama yang boleh dibaca modul ini (dan semua konsumennya) untuk
// prompt/validasi/ZIP — nilainya sudah nama KANONIK hasil identifikasi user. LocationRef.sourceName
// (nama file asli upload) HANYA dipakai UI Step1Business.tsx sebagai kunci ke blob sesi (preview +
// Download Bahan) — JANGAN PERNAH dibaca di sini atau di jalur compile prompt manapun.

export type LocationRefRole = 'environment' | 'product';

export interface ResolvedLocationRef {
  file: string;
  identity: string;
  keterangan: string;
  sceneNumber: number | null;
  role: LocationRefRole;
}

export function sanitizeRefText(text: string): string {
  return text.trim().replace(/"/g, '');
}

// role di-DERIVE dari sceneNumber: sceneNumber !== null (ditugaskan ke scene spesifik) → environment,
// null ("Semua scene") → product.
export function getEffectiveLocationRefs(form: FormData): ResolvedLocationRef[] {
  const raw: LocationRef[] = form.locationRefs;

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

// promptHints preset identitas ruangan (camera/lighting/caution) — diinject ke ai_ready_prompt/
// camera_direction scene ybs, di atas aturan CAMERA_REF_RULE umum untuk scene environment.
export function buildPromptHintsSentence(ref: ResolvedLocationRef): string {
  const identity = getRoomIdentity(ref.identity);
  if (!identity) return '';
  const { camera, lighting, caution } = identity.promptHints;
  const parts: string[] = [];
  if (camera) parts.push(`camera: ${camera}`);
  if (lighting) parts.push(`lighting: ${lighting}`);
  if (caution) parts.push(`caution: ${caution}`);
  return parts.join('; ');
}

// Nama file foto karakter yang WAJIB disebut di ai_ready_prompt — '' kalau tidak ada referensi
// karakter aktif (belum diisi, atau talentStyle 'product_only' di mana konsep karakter tidak berlaku).
// Dipakai buildCharacterBindingSentence DAN validasi (jsonParser/sceneStatus/sceneRegen) supaya kunci
// pengecekan "apakah ai_ready_prompt menyebut foto karakter" selalu konsisten satu sumber.
export function getCharacterRefFileName(form: FormData): string {
  if (form.talentStyle === 'product_only') return '';
  return form.characterRefFile.trim() ? sanitizeRefText(form.characterRefFile) : '';
}

// Kalimat pengikat SINGKAT untuk ai_ready_prompt — pola sama dengan buildBindingSentence (lokasi):
// tanpa kalimat ini, AI video tool (Google Flow dll) mengabaikan foto referensi karakter yang
// dilampirkan user karena namanya tidak pernah disebut di teks prompt. Dipakai masterPrompt.ts
// (generate awal), sceneRegen.ts (regenerate per-scene), dan autoRephrase.ts (rewrite policy) — JANGAN
// copy-paste string ini di tempat lain.
export function buildCharacterBindingSentence(form: FormData): string | null {
  const file = getCharacterRefFileName(form);
  if (!file) return null;
  if (form.talentStyle === 'faceless_pov') {
    return `hands match reference photo ${file} — same hands, skin tone, and accessories`;
  }
  return `character matches reference photo ${file} — same face, hair, and outfit`;
}
