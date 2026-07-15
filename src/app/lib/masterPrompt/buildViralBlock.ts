import { CompileContext } from './context';
import { NEGATIVE_PROMPT_BLOCK } from '../negativePrompt';

export function buildViralBlock(ctx: CompileContext): string {
  const { form, effectiveStyle, hasLocation } = ctx;
  return `

[BLOK 4: ATURAN VIRAL & KONSISTENSI]

VIRAL ELEMENTS (minimal 4 dari 8):
□ Pattern interrupt — sesuatu tak terduga dalam 0–2 detik pertama
□ Curiosity gap — penonton harus ingin tahu kelanjutannya
□ Emotional trigger — minimal 1 emosi kuat
□ Social proof — angka atau bukti nyata
□ Micro-hooks — alasan baru setiap 3–5 detik untuk tidak swipe
□ Cliffhanger — akhir body scene menarik ke scene berikutnya
□ Sensory language — deskripsi yang bisa "dirasakan"
□ Unexpected twist — 1 momen mengejutkan

PENEKANAN UNTUK GAYA "${effectiveStyle.label}": Prioritaskan elemen viral berikut dari daftar di atas: ${effectiveStyle.viralElementEmphasis.join(', ')}.

KONSISTENSI WAJIB:
- Color temperature identik semua scene
- Karakter identik (penampilan tidak berubah)
- Semua scene menampilkan properti/lokasi yang SAMA dari sudut pandang berbeda — jangan ganti lokasi secara acak${hasLocation ? `. Gunakan variasi shot dari properti yang sama: Scene Hook: exterior shot properti. Scene Body: interior room shots dari properti yang sama. Scene CTA: karakter di depan/dalam properti dengan signage/detail yang sama. Referensi visual environment: ${form.locationDescription}` : ''}
- Satu voice narasi, USP ditegaskan 2x
- Musik satu tema, SFX satu palet mood
- Eskalasi mengikuti STRUKTUR gaya konten yang dipilih (lihat GAYA KONTEN & STRUKTUR di Blok 3) — JANGAN paksakan pola Hook→Body→CTA kalau gaya konten yang dipilih tidak memakai pola itu.
- Transisi: whip pan / zoom punch / hard cut + audio cue

POLICY COMPLIANCE — WAJIB untuk Google Flow & Veo3:
Setiap ai_ready_prompt dan script_narration harus lolos filter kebijakan berikut:

FORBIDDEN PATTERNS — JANGAN pernah gunakan:
✗ Klaim absolut: "terbaik", "nomor 1", "paling xxx", "jamin 100%", "dijamin", "pasti"
✗ Klaim medis/kesehatan: "sembuh total", "menyembuhkan", "terbukti klinis", "efek samping", "obat", "terapi"
✗ Before/After transformasi hasil: "sebelum pakai X → setelah pakai X jadi Y" (terutama fisik/kesehatan)
✗ Testimonial fiktif yang terlihat seperti nyata: "saya pakai dan langsung..."
✗ Klaim performa tanpa bukti: "meningkatkan X dalam Y hari", "instant results"
✗ Kata kasar, konten dewasa, kekerasan, diskriminasi
✗ Ajakan berbahaya: "coba sendiri", "berbahaya jika tidak dibeli"

WAJIB rewrite klaim jadi observasi netral:
- BUKAN: "Krim ini menghilangkan kerutan dalam 3 hari"
- TAPI: "Krim ini diformulasikan untuk merawat kulit"
- BUKAN: "Produk terlaris nomor 1 di Indonesia"
- TAPI: "Produk yang banyak dipilih konsumen Indonesia"
- BUKAN: "Jamin uang kembali 100%"
- TAPI: "Kebijakan retur tersedia untuk kenyamanan belanja"

REWRITE TEST: Sebelum menulis ai_ready_prompt, tanyakan: "Apakah prompt ini akan ditolak Google Flow?" Jika ya, rewrite.

---

${NEGATIVE_PROMPT_BLOCK}`;
}
