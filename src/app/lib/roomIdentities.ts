// Preset identitas ruangan/area properti — dipakai UI (dropdown searchable di Step3Creative) dan
// lib/locationRefs.ts (promptHints diinject ke ai_ready_prompt/camera_direction scene ybs). Tambah
// identitas baru di sini saja, JANGAN hardcode daftar ini di tempat lain.
export interface RoomIdentityHints {
  camera?: string;
  lighting?: string;
  caution?: string;
}

export interface RoomIdentity {
  value: string;
  label: string;
  promptHints: RoomIdentityHints;
}

// Identitas universal — berlaku untuk SEMUA niche.
export const UNIVERSAL_IDENTITIES: RoomIdentity[] = [
  { value: 'produk', label: '🛍️ Produk', promptHints: {} },
  { value: 'custom', label: '✏️ Ketik manual', promptHints: {} },
];

// Identitas ruangan properti — HANYA ditampilkan untuk niche real_estate.
export const PROPERTY_ROOM_IDENTITIES: RoomIdentity[] = [
  { value: 'fasad', label: 'Fasad / Tampak Depan', promptHints: { camera: 'slow push-in / gentle orbit establishing shot, DILARANG whip-pan/fast reveal', lighting: 'natural daylight' } },
  { value: 'foyer', label: 'Foyer / Pintu Masuk', promptHints: {} },
  { value: 'void', label: 'Void', promptHints: {} },
  { value: 'ruang_tamu', label: 'Ruang Tamu', promptHints: {} },
  { value: 'ruang_keluarga', label: 'Ruang Keluarga', promptHints: {} },
  { value: 'dapur', label: 'Dapur', promptHints: {} },
  { value: 'ruang_makan', label: 'Ruang Makan', promptHints: {} },
  { value: 'kamar_tidur_utama', label: 'Kamar Tidur Utama', promptHints: { lighting: 'warm/hangat', camera: 'gerakan kamera tenang, tidak tergesa' } },
  { value: 'kamar_tidur_anak', label: 'Kamar Tidur Anak', promptHints: {} },
  { value: 'kamar_mandi', label: 'Kamar Mandi', promptHints: { caution: 'hindari refleksi kamera/kru di cermin; untuk mode faceless: no face reflection' } },
  { value: 'balkon_teras', label: 'Balkon / Teras', promptHints: {} },
  { value: 'taman', label: 'Taman', promptHints: { camera: 'wide shot', lighting: 'natural daylight' } },
  { value: 'carport_garasi', label: 'Carport / Garasi', promptHints: {} },
  { value: 'rooftop', label: 'Rooftop', promptHints: {} },
  { value: 'kolam_renang', label: 'Kolam Renang', promptHints: {} },
  { value: 'mushola', label: 'Mushola', promptHints: {} },
  { value: 'ruang_kerja', label: 'Ruang Kerja', promptHints: {} },
  { value: 'gudang', label: 'Gudang', promptHints: {} },
];

// Gabungan penuh — dipakai getRoomIdentity() untuk lookup lintas fungsi.
// Urutan: universal dulu (produk, custom), baru preset ruangan properti.
export const ROOM_IDENTITIES: RoomIdentity[] = [
  ...UNIVERSAL_IDENTITIES,
  ...PROPERTY_ROOM_IDENTITIES,
];

export function getRoomIdentity(value: string): RoomIdentity | undefined {
  return ROOM_IDENTITIES.find(r => r.value === value);
}
