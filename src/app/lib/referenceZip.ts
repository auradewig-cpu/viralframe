import JSZip from 'jszip';
import { FormData } from '../types';
import { ROOM_IDENTITIES } from './roomIdentities';

// Ekstraksi logic bagian "referensi" ZIP — dipakai Step1Business.tsx (Download Bahan pra-generate)
// DAN DirectPanel.tsx (Download Bahan Lengkap di output). JANGAN duplikasi logic ini di tempat lain.

export interface ReferenceFileEntry {
  file: string; // nama kanonik — satu-satunya nama yang boleh dibaca prompt/ZIP (lihat locationRefs.ts)
  sourceName: string; // kunci ke blob sesi (referenceFiles store), '' kalau tidak ada
  label: string; // "Karakter" atau label identitas ruangan/produk
  sceneLabel: string; // "semua scene" atau "scene N"
}

// Daftar entry referensi dari form — TIDAK bergantung pada apakah blob-nya tersedia di sesi.
export function getReferenceEntries(form: FormData): ReferenceFileEntry[] {
  const entries: ReferenceFileEntry[] = [];
  if (form.characterRefFile.trim()) {
    entries.push({
      file: form.characterRefFile.trim(),
      sourceName: form.characterRefSourceName || '',
      label: 'Karakter',
      sceneLabel: 'semua scene',
    });
  }
  form.locationRefs.forEach(ref => {
    if (!ref.identity) return;
    const identityLabel = ROOM_IDENTITIES.find(r => r.value === ref.identity)?.label || ref.identity;
    entries.push({
      file: ref.file,
      sourceName: ref.sourceName || '',
      label: identityLabel,
      sceneLabel: ref.sceneNumber === null ? 'semua scene' : `scene ${ref.sceneNumber}`,
    });
  });
  return entries;
}

export type ReferenceBlobLookup = (sourceName?: string) => Blob | undefined;

// Menambahkan bagian referensi ke sebuah JSZip yang sudah ada:
// - Kalau ADA entry yang blob-nya tersedia di sesi: taruh foto kanonik + bahan_mapping.txt di
//   `folder` (root kalau folder tidak diisi) — HANYA entry yang blob-nya tersedia.
// - Kalau TIDAK ADA satupun blob tersedia tapi ada entry (mis. dibuka dari History setelah reload):
//   taruh file referensi_DIBUTUHKAN.txt di root ZIP berisi daftar nama file kanonik yang harus
//   dilampirkan user + catatan upload ulang di Step 1.
// Return jumlah foto yang benar-benar disertakan.
export function addReferenceSectionToZip(zip: JSZip, form: FormData, getBlob: ReferenceBlobLookup, folder?: string): number {
  const entries = getReferenceEntries(form);
  const available = entries.filter(e => getBlob(e.sourceName));

  if (available.length === 0) {
    if (entries.length > 0) {
      const lines = entries.map(e => `${e.file} — ${e.label} — ${e.sceneLabel}`);
      zip.file('referensi_DIBUTUHKAN.txt', [
        'Foto referensi berikut dibutuhkan tapi tidak tersedia di sesi ini',
        '(biasanya karena dibuka dari History setelah reload browser).',
        'Upload ulang foto asli di Step 1 untuk menyertakan foto ini di ZIP.',
        '',
        ...lines,
      ].join('\n') + '\n');
    }
    return 0;
  }

  const target = folder ? zip.folder(folder) : zip;
  const mappingLines: string[] = [];
  available.forEach(e => {
    const blob = getBlob(e.sourceName)!;
    target?.file(e.file, blob);
    mappingLines.push(`${e.file} ← ${e.sourceName} — ${e.label} — ${e.sceneLabel}`);
  });
  target?.file('bahan_mapping.txt', mappingLines.join('\n') + '\n');
  return available.length;
}
