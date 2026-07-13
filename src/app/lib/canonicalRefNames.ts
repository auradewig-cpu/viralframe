// Canonical rename untuk Referensi Visual (short_video) — satu sumber kebenaran: identifikasi user
// (identitas + scene) MENENTUKAN nama file kanonik, yang sama persis dipakai di prompt (ref.file)
// DAN di isi ZIP Download Bahan. Dipakai HANYA oleh Step1Business.tsx — logic orkestrasi (kapan
// rename dipicu, anti-tabrakan lintas entry) tetap di komponen karena butuh state locationRefs penuh.

export type CanonicalNameInput =
  | { kind: 'character' }
  | { kind: 'location'; identity: string; keterangan: string; sceneNumber: number | null };

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Ekstensi dari nama file asli (prioritas) — fallback dari MIME blob, default 'jpg'.
export function inferExtension(sourceName?: string, blob?: Blob | null): string {
  if (sourceName) {
    const m = /\.([a-z0-9]+)$/i.exec(sourceName);
    if (m) return m[1].toLowerCase();
  }
  if (blob?.type && MIME_EXT[blob.type]) return MIME_EXT[blob.type];
  return 'jpg';
}

function slugify(text: string, maxLength: number): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength)
    .replace(/_+$/g, '');
}

function buildIdentitySlug(ref: { identity: string; keterangan: string }): string {
  if (ref.identity && ref.identity !== 'custom') return ref.identity;
  return slugify(ref.keterangan, 20) || 'ref';
}

// Aturan penamaan kanonik — lihat komentar TUGAS 2 di riwayat commit untuk detail per kasus:
// karakter -> karakter.<ext>; lokasi ber-scene -> scene<N>_<slug>.<ext>; "Semua scene" (product) ->
// produk_<slug>.<ext> atau produk.<ext> kalau slug kosong.
export function buildCanonicalName(ref: CanonicalNameInput, ext: string): string {
  const cleanExt = (ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  if (ref.kind === 'character') return `karakter.${cleanExt}`;

  const slug = buildIdentitySlug(ref);
  if (ref.sceneNumber !== null) return `scene${ref.sceneNumber}_${slug}.${cleanExt}`;
  return slug && slug !== 'ref' ? `produk_${slug}.${cleanExt}` : `produk.${cleanExt}`;
}

// Anti-tabrakan: kalau nama yang diinginkan sudah dipakai entry lain, suffix _2, _3, dst sebelum
// titik ekstensi. Dipanggil SEBELUM disimpan ke formData, supaya isDuplicateFile di Step1Business
// tidak pernah menolak hasil rename otomatis.
export function resolveUniqueCanonicalName(desired: string, takenNames: Set<string>): string {
  if (!takenNames.has(desired)) return desired;
  const dot = desired.lastIndexOf('.');
  const base = dot === -1 ? desired : desired.slice(0, dot);
  const ext = dot === -1 ? '' : desired.slice(dot);
  let i = 2;
  let candidate = `${base}_${i}${ext}`;
  while (takenNames.has(candidate)) {
    i++;
    candidate = `${base}_${i}${ext}`;
  }
  return candidate;
}
