export interface ContentStyleConfig {
  value: string;
  label: string;
  description: string;
  structureDescription: string;
  getSceneRole: (index: number, total: number) => string;
  ctaIntensity: 'hard' | 'soft' | 'none';
  narrativeVoiceGuidance: string;
  viralElementEmphasis: string[];
}

export const CONTENT_STYLES: ContentStyleConfig[] = [
  {
    value: 'direct_response',
    label: '🛍️ Direct Response / Iklan (Default)',
    description: 'Format iklan klasik — Hook kuat, Body membangun minat, CTA keras di akhir. Cocok untuk affiliate/produk.',
    structureDescription: 'Scene 1 = Hook (pancing perhatian) → Scene tengah = Body (bangun minat & USP) → Scene terakhir = CTA (ajakan bertindak keras)',
    getSceneRole: (i, total) => i === 0 ? 'Hook' : i === total - 1 ? 'CTA' : 'Body',
    ctaIntensity: 'hard',
    narrativeVoiceGuidance: 'Gaya persuasif direct-response, USP ditegaskan minimal 2x, nada percaya diri menjual.',
    viralElementEmphasis: ['pattern_interrupt', 'social_proof', 'emotional_trigger', 'cliffhanger'],
  },
  {
    value: 'vlog_daily',
    label: '🎥 Vlog / Day-in-Life',
    description: 'Gaya vlog personal, cerita natural tanpa hard-sell. Cocok untuk personal branding, lifestyle.',
    structureDescription: 'Scene 1 = Opening (perkenalan momen/hari ini) → Scene tengah = Momen-momen berurutan (aktivitas natural) → Scene terakhir = Refleksi/Penutup santai (BUKAN CTA keras)',
    getSceneRole: (i, total) => i === 0 ? 'Opening' : i === total - 1 ? 'Closing' : `Momen ${i}`,
    ctaIntensity: 'none',
    narrativeVoiceGuidance: 'Gaya cerita personal seperti diary/vlog — "aku hari ini...", "jadi tadi...". Natural, tidak scripted, seperti ngobrol sama teman dekat. TIDAK ada nada menjual.',
    viralElementEmphasis: ['emotional_trigger', 'sensory_language', 'curiosity_gap'],
  },
  {
    value: 'tutorial_howto',
    label: '📚 Tutorial / How-To',
    description: 'Ajarkan 1 skill/cara spesifik. Format search-intent, keyword disebut di awal.',
    structureDescription: 'Scene 1 = Hook Masalah (sebut masalah/keyword yang dicari orang) → Scene tengah = Langkah 1..N (instruksional bernomor) → Scene terakhir = Hasil/Recap + ajakan follow untuk tips lain',
    getSceneRole: (i, total) => i === 0 ? 'Hook Masalah' : i === total - 1 ? 'Hasil & Recap' : `Langkah ${i}`,
    ctaIntensity: 'soft',
    narrativeVoiceGuidance: 'Gaya instruksional jelas, sebutkan keyword/topik di 1 detik pertama. Setiap langkah dijelaskan singkat dan actionable — "Langkah pertama, ...". Nada membantu, bukan menjual.',
    viralElementEmphasis: ['social_proof', 'sensory_language', 'micro_hooks'],
  },
  {
    value: 'storytime',
    label: '📖 Storytime',
    description: 'Cerita personal yang SANGAT spesifik, bukan generic. Membangun ketegangan menuju payoff.',
    structureDescription: 'Scene 1 = Setup (perkenalkan situasi spesifik) → Scene tengah = Ketegangan naik (detail yang bikin penasaran) → Scene terakhir = Klimaks/Payoff (twist atau resolusi memuaskan)',
    getSceneRole: (i, total) => i === 0 ? 'Setup' : i === total - 1 ? 'Klimaks' : `Ketegangan ${i}`,
    ctaIntensity: 'none',
    narrativeVoiceGuidance: 'WAJIB gunakan detail SANGAT SPESIFIK (bukan generic) — nama, waktu, tempat, angka konkret. Cerita generic tidak akan viral, detail spesifik yang bikin orang relate dan share. Nada storytelling natural, seperti cerita ke teman.',
    viralElementEmphasis: ['curiosity_gap', 'emotional_trigger', 'unexpected_twist'],
  },
  {
    value: 'listicle_countdown',
    label: '🔢 Listicle / Countdown',
    description: 'Format "Top N hal...". Tiap scene = 1 poin daftar.',
    structureDescription: 'Scene 1 = Intro (sebutkan total jumlah poin & topik) → Scene tengah = Poin 1..N (1 scene = 1 poin, angka disebut eksplisit) → Scene terakhir = Penutup/rangkuman',
    getSceneRole: (i, total) => i === 0 ? 'Intro' : i === total - 1 ? 'Penutup' : `Poin ${i}`,
    ctaIntensity: 'soft',
    narrativeVoiceGuidance: 'Sebutkan NOMOR poin secara eksplisit di setiap scene ("Nomor 1...", "yang kedua..."). Tiap poin harus punya value/insight jelas, bukan filler.',
    viralElementEmphasis: ['social_proof', 'micro_hooks', 'sensory_language'],
  },
  {
    value: 'before_after',
    label: '↔️ Before/After / Transformasi',
    description: 'Tunjukkan kondisi awal, proses, lalu hasil transformasi.',
    structureDescription: 'Scene 1 = Kondisi Awal (masalah/keadaan sebelum) → Scene tengah = Proses (langkah transformasi) → Scene terakhir = Reveal Hasil (kondisi sesudah, dramatis)',
    getSceneRole: (i, total) => i === 0 ? 'Kondisi Awal' : i === total - 1 ? 'Hasil Akhir' : `Proses ${i}`,
    ctaIntensity: 'soft',
    narrativeVoiceGuidance: 'Fokus pada KONTRAS visual antara sebelum dan sesudah. Nada membangun antisipasi menuju reveal. HINDARI klaim before/after yang melanggar POLICY COMPLIANCE (terutama fisik/kesehatan) — gunakan observasi netral, bukan klaim hasil instan.',
    viralElementEmphasis: ['pattern_interrupt', 'sensory_language', 'unexpected_twist'],
  },
  {
    value: 'pattern_break_twist',
    label: '😮 Pattern-Break / Twist Reveal',
    description: 'Mulai terlihat seperti 1 jenis konten, di tengah berubah jadi sesuatu yang tak terduga.',
    structureDescription: 'Scene 1 = Setup (tampak seperti format/genre lain) → Scene tengah = Twist Point (reveal tak terduga, ubah arah cerita) → Scene terakhir = Resolusi (jelaskan twist, tutup dengan kuat)',
    getSceneRole: (i, total) => i === 0 ? 'Setup' : i === total - 1 ? 'Resolusi' : `Twist ${i}`,
    ctaIntensity: 'soft',
    narrativeVoiceGuidance: 'Scene pembuka WAJIB terasa seperti genre/format lain (misal seperti mau curhat sedih, ternyata jadi promosi lucu) — kejutannya harus di STRUKTUR cerita, bukan cuma di visual. Nada berubah drastis dari sebelum ke sesudah twist.',
    viralElementEmphasis: ['pattern_interrupt', 'unexpected_twist', 'curiosity_gap'],
  },
  {
    value: 'series_episodic',
    label: '🔁 Series / Episodic',
    description: 'Bagian dari seri konten berkelanjutan, sengaja menggantung di akhir.',
    structureDescription: 'Scene 1 = Recap singkat/Hook → Scene tengah = Konten inti → Scene terakhir = Open Loop (menggantung sengaja, tease part berikutnya)',
    getSceneRole: (i, total) => i === 0 ? 'Hook/Recap' : i === total - 1 ? 'Open Loop' : `Konten ${i}`,
    ctaIntensity: 'soft',
    narrativeVoiceGuidance: 'Scene terakhir WAJIB diakhiri dengan open loop yang genuinely earned (bukan clickbait kosong) — beri alasan kuat untuk follow/nunggu part berikutnya. Sebutkan eksplisit "part 1 dari beberapa" kalau relevan.',
    viralElementEmphasis: ['cliffhanger', 'curiosity_gap', 'micro_hooks'],
  },
];

export function getSceneTypeSlug(contentStyleValue: string, index: number, total: number): string {
  const style = CONTENT_STYLES.find(cs => cs.value === contentStyleValue) || CONTENT_STYLES.find(cs => cs.value === 'direct_response')!;
  const role = style.getSceneRole(index, total);
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
