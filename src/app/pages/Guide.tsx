import { useState } from 'react';

const sections = [
  {
    id: 'jenis-konten',
    title: '1. Jenis Konten',
    content: `ViralFrame Studio mendukung 4 jenis konten. Output masing-masing berbeda:

**📱 Short Video — Video Pendek Viral (Default)**
Output: JSON Scene Cards (narasi, prompt video per scene, visual description) untuk video 15–90 detik. Format TikTok/Reels/Shorts. Menghasilkan master prompt → dikirim ke AI (Direct API Mode) → output JSON per-scene → siap di-generate ke AI video tool.

**🎬 YouTube Long Form — Video Panjang**
Output: JSON chapter + segmen untuk video 5–30 menit. Form khusus: target durasi menit, jumlah chapter, channel style. Skema output punya chapters[], segmen per chapter, caption hook, dan production notes khusus long-form.

**🖼️ Thumbnail Pack — Paket Thumbnail**
Output: 3–5 konsep thumbnail dengan prompt gambar (siap di-paste ke Midjourney/DALL·E/Gen-3), psikologi CTR, teks overlay saran. Form khusus: topik, opsi wajah (with_face / no_face), jumlah konsep.

**📅 Content Calendar — Kalender Konten**
Output: Strategi positioning, pilar konten, jadwal hari + post, dan production prompt untuk setiap konten. Form khusus: platform, jumlah hari, posts per hari, insight akun.`,
  },
  {
    id: 'tujuan-konten',
    title: '2. Tujuan Konten',
    content: `Tujuan konten mempengaruhi seluruh tone narasi, CTA, dan struktur prompt:

**💰 Konversi — jualan/direct-response (Default)**
Perilaku standar. Hook kuat, Body bangun minat, CTA keras di akhir. Boleh bahasa jualan penuh.

**🌱 Growth Akun — kejar follow/save/share**
Akun masih baru, WAJIB kejar engagement (follow/save/share) TANPA bahasa jualan sama sekali.
DILARANG KERAS: kata "beli", "checkout", "keranjang", "link bio", "promo", "diskon", "harga", "order", "COD", atau ajakan transaksi apapun.
Format WAJIB value-first: edukasi jujur, rekomendasi netral, tips bermanfaat.
CTA otomatis dibatasi hanya ke follow_more, save_for_later, share_tag_friend, double_tap_agree, comment_keyword.
**Kenapa CTA jualan terkunci?** Aturan TikTok Affiliate 600 follower: akun dengan <600 follower TIDAK boleh memuat konten jualan langsung. Mode Growth membantu kamu tetap grow secara aman.

**💬 Engagement — komentar & interaksi**
Hook dan CTA diarahkan memancing komentar (pertanyaan terbuka, opini, ajakan vote). Bahasa jualan tetap boleh ringan.`,
  },
  {
    id: 'talent-style',
    title: '3. Talent Style',
    content: `Pilih bagaimana talent tampil di video:

**🧑 Karakter Terlihat — wajah & ekspresi tampil**
Talent/wajah tampil penuh di semua scene. Isi detail karakter: gender, usia, etnis, gaya pakaian, dan Ciri Fisik Khusus (misal: kemeja → button-up collared shirt, bedak → pressed powder). Bahasa Indonesia otomatis diterjemahkan ke English presisi di prompt — contoh: "kuku dicat merah" → "red-painted nails", "gelang emas" → "gold bracelet".

**✋ POV Faceless — tangan review produk, tanpa wajah**
Hanya tangan talent yang tampil, kamera first-person POV. Wajah TIDAK BOLEH tampil di scene manapun. Deskripsi tangan (hand description) WAJIB diisi.

**📦 Produk Saja — tanpa talent**
Produk ditampilkan langsung tanpa karakter. Visual anchor opsional.`,
  },
  {
    id: 'referensi-visual',
    title: '4. 🖼️ Referensi Visual (Pipeline Lengkap)',
    content: `Referensi Visual adalah sistem untuk memberi AI video tool foto-foto produk/lokasi yang harus di-match persis di setiap scene. Foto TIDAK dikirim ke AI generate — kamu upload di sini hanya untuk identifikasi, lalu lampirkan isi ZIP-nya langsung di AI video tool.

**Alur Inti:**

1️⃣ Upload — Nama file BEBAS. Format jpg/png/webp, maks 5MB per file, maks 15 file total.

2️⃣ Identifikasi — Sistem auto-guess scene dari pola "scene3_foto.jpg" → Scene 3. Kalau tidak ada angka, entry baru ditugaskan ke scene terkecil yang belum terisi. Pilih identitas ruangan (kamar tidur, dapur, fasad, dll.) dari daftar preset atau custom.

3️⃣ Penamaan Kanonik Otomatis — Setelah kamu pilih identitas + scene, sistem menamai ulang otomatis: karakter → "karakter.jpg", lokasi per-scene → "scene3_kamar_tidur.jpg", "Semua scene" → "produk_fasad.jpg". Nama inilah yang disebut di prompt AI.

4️⃣ ⬇️ Download Bahan (ZIP) — Tombol di Step 1 (Konteks Bisnis). ZIP berisi semua foto dengan NAMA KANONIK. Lampirkan isi ZIP langsung di AI video tool (Google Flow, Kling, Runway, dll.) saat generate video.

**🔑 Kenapa nama file harus persis?**
Di setiap ai_ready_prompt, ada kalimat binding seperti: 'location matches reference photo scene3_kamar_tidur.jpg: kamar utama luas 4x5 meter' — AI video tool mencocokkan nama file yang disebut di teks prompt dengan file yang kamu attach. Kalau namanya berbeda, binding tidak bekerja dan AI mengabaikan foto referensi — hasilnya produk/lokasi bisa berubah bentuk di setiap scene.

**📸 Penyimpanan Foto:**
Foto asli yang kamu upload disimpan di IndexedDB browser (database: viralframe-ref-images). Ketika kamu reload halaman, sistem otomatis mengembalikan foto dari IndexedDB ke tampilan preview (hydrate). Kamu bisa membersihkan semua foto tersimpan di Settings → Referensi Visual → Bersihkan Semua Foto Tersimpan. Operasi ini TIDAK mempengaruhi history/template yang sudah tersimpan.`,
  },
  {
    id: 'property-tour',
    title: '5. Gaya Konten Khusus: Property Tour',
    content: `Property Tour adalah gaya konten spesifik untuk niche properti/real estate — tur properti terpandu bersama agen.

**Struktur Scene:**
• Scene 1 = Hook Fasad — establishing shot fasad properti + hook angka mengejutkan/pertanyaan dalam 5 detik pertama narasi. BUKAN basa-bisi sapaan.
• Scene tengah = Tur Ruangan — 1 scene = 1 ruangan sesuai Referensi Lokasi/Produk. Urutan tur mengikuti locationRefs persis. Setiap narasi ruangan WAJIB menyebut minimal 1 fakta konkret (luas, jumlah kamar, material) — bukan pujian kosong.
• Scene terakhir = CTA Agen — rekap 1 kalimat + ajakan kontak/DM/site visit.

**Transisi:** Antar ruangan WAJIB bergaya walk-through berkelanjutan (whip-pan / walk-and-talk melewati pintu/lorong) supaya terasa satu kunjungan utuh, BUKAN cut terpisah-pisah.

**Karakter** (jika ada) berperan sebagai agen yang memandu, gaya selfie-vlog/walk-and-talk.

**Foto Referensi:** WAJIB upload foto per ruangan. Scene type akan otomatis menjadi "tour_kamar_tidur", "tour_dapur", dll. sesuai identitas yang kamu pilih.`,
  },
  {
    id: 'ciri-fisik-khusus',
    title: '6. Ciri Fisik Khusus & Terjemahan Bahasa',
    content: `Di Step 3 (Parameter Kreatif), ada field "Ciri Fisik Khusus" — kamu boleh menulis dalam Bahasa Indonesia. Sistem menerjemahkan ke English presisi di prompt.

**Contoh terjemahan yang WAJIB diikuti AI:**
• "kemeja" → "button-up collared shirt" (BUKAN "shirt" saja, BUKAN "t-shirt")
• "kaos" → "t-shirt"
• "kuku dicat merah" → "red-painted nails"
• "gelang emas" → "gold bracelet"
• "bedak" → "pressed powder"

**Mengapa tidak diterjemahkan harfiah?** AI video tool (Google Flow, Kling, Runway) bekerja dengan deskripsi visual English yang presisi. "Kemeja" bisa berarti banyak jenis atasan — "button-up collared shirt" tidak ambigu. Terjemahan Inggris yang presisi inilah yang akan di-copy verbatim ke awal SETIAP ai_ready_prompt di semua scene, memastikan konsistensi karakter antar scene.`,
  },
  {
    id: 'scene-cards',
    title: '7. Scene Cards — Output & Aksi',
    content: `Setelah AI selesai generate, setiap scene ditampilkan sebagai Scene Card dengan:

**Badge Status:**
• ✅ OK — Scene lolos semua validasi
• ⚠️ Flagged (N) — Ada N masalah (policy violation / caption mismatch / durasi tidak sesuai). Klik badge untuk lihat detail.

**Aksi per Scene:**
• 🔄 Regenerate — Generate ulang SATU scene tertentu saja melalui API, tanpa mengubah scene lain. Hasil baru langsung di-splice ke output.
• ✨ Perbaiki otomatis — Untuk scene yang melanggar policy compliance, AI otomatis me-rewrite HANYA field yang bermasalah (ai_ready_prompt / script_narration) tanpa regenerate seluruh scene.
• ⎘ Copy — Salin ai_ready_prompt ke clipboard. Indikator chars (contoh: 432/500 ✅/❌) menunjukkan apakah prompt muat batas karakter AI tool.

**⬇️ Download Bahan Lengkap (ZIP):**
Tombol di bagian bawah output. ZIP berisi:
• File JSON output
• File TXT master prompt
• Subfolder foto referensi (dengan nama kanonik)
Cocok untuk disimpan sebagai arsip atau dikirim ke tim produksi.

**Warna Scene:**
• 🟡 Amber = Scene pertama (Hook/Opening — tergantung gaya konten)
• 🔵 Cyan = Scene tengah (Body/Tur/Konten)
• 🟣 Ungu = Scene terakhir (CTA/Closing)`,
  },
  {
    id: 'tips-konsistensi',
    title: '8. Tips Konsistensi Hasil di AI Video Tool',
    content: `AI video tool (Google Flow, Kling, Runway, dll.) menghasilkan setiap scene secara independen — tanpa panduan, karakter/produk bisa berubah di setiap scene. Ikuti tips berikut:

**📎 Lampirkan foto dari ZIP:**
Saat generate scene di AI video tool, attach foto referensi yang sudah ada di ZIP Download Bahan. Nama file di ZIP sudah cocok dengan nama yang disebut di ai_ready_prompt — AI akan match secara otomatis.

**🎥 Gerakan kamera lambat untuk establishing shot:**
Untuk scene pertama (establishing lokasi/properti), gunakan camera movement lambat (slow pan / gentle dolly). Ini memberi AI waktu untuk "membaca" environment dengan stabil.

**🔤 Angka ditulis bentuk lisan:**
Angka dalam script_narration WAJIB ditulis dalam bentuk lisan/terucap, bukan numerik. Contoh:
• ✅ "seratus ribu rupiah" — bukan "Rp100.000"
• ✅ "hanya dua langkah" — bukan "hanya 2 langkah"
• ✅ "sudah terjual lebih dari sepuluh ribu" — bukan "10.000+"
Ini karena TTS/AI voice membaca teks apa adanya — "Rp100.000" akan dibaca kaku.

**🔄 Reference Frame (jika tool tidak support ref image):**
Untuk tool yang tidak support reference image (Veo 3, Sora):
1. Generate Scene 1
2. Screenshot/Download frame terbaik
3. Upload sebagai reference image/keyframe untuk Scene 2
4. Ulangi setiap scene — frame terakhir scene N jadi referensi scene N+1`,
  },
  {
    id: 'cara-generate',
    title: '9. Cara Generate (Direct vs Manual)',
    content: `**⚡ Direct API Mode (Direkomendasikan):**
App memanggil AI (Gemini → Groq → OpenRouter) secara otomatis dari browser. API key disimpan hanya di localStorage — tidak pernah dikirim ke server ViralFrame.
• Gemini: 250 request/hari gratis, model gemini-2.5-flash
• Groq: Fallback otomatis jika Gemini gagal/quota habis (Llama 3.3)
• OpenRouter: Fallback terakhir
• Setiap output melewati repair loop — 1x retry tertarget jika ada pelanggaran policy/validasi

**📋 Manual Prompt Mode (Fallback):**
App menghasilkan Master Prompt teks yang bisa kamu copy-paste ke ChatGPT, Claude, atau Gemini secara manual. Paste hasil JSON-nya kembali ke app. Validasi & policy check tetap berjalan sama seperti Direct Mode.

**Cara Setting API Key:**
Settings → API Configuration → Masukkan Gemini API Key (dari aistudio.google.com) atau Groq API Key (dari console.groq.com).`,
  },
  {
    id: 'image-engine',
    title: '11. Image Engine — Generate Gambar Langsung di App',
    content: `Image Engine memungkinkan generate gambar dari prompt langsung di browser tanpa perlu aplikasi eksternal. Dipakai oleh Thumbnail Pack (per konsep) dan Carousel IG (per slide).

**Chain Provider (urutan fallback):**
1. **Puter.js** — Gratis, User-Pays (panggilan pertama bisa popup login — itu normal, bukan error). Hanya dipakai untuk txt2img (tanpa input gambar). Bisa dimatikan di Settings → Image Engine. Kalau gagal, sistem otomatis pindah provider.
2. **Pollinations** — Gratis, tanpa API key. Tanpa input gambar.
3. **Gemini Image** — Butuh Gemini API key. Satu-satunya provider yang support input gambar (image+text→image).

Urutan bisa diatur di Settings → API Configuration → Urutan Fallback Provider.

**Generate Foto Karakter (Step 3):**
Di Parameter Kreatif → blok Karakter, tombol ✨ Generate Foto Karakter aktif untuk talentStyle visible_character dan faceless_pov.
• Klik → sistem merangkai prompt English dari parameter karakter + latar
• Jika ada foto produk di Referensi Visual (role product), otomatis dikirim sebagai input image — karakter digenerate memegang produk
• Preview muncul: Download / Generate Ulang / ✅ Pakai sebagai Referensi Karakter
• "Pakai" → foto disimpan sebagai karakter.png di sistem referensi, ikut Download Bahan (ZIP) dan binding prompt
• Hint: tanpa foto produk, karakter tetap bisa digenerate tapi tanpa memegang produk`,
  },
  {
    id: 'pipeline',
    title: '12. Pipeline Antar-Konten',
    content: `Pipeline memungkinkan output satu content type menjadi input content type lain. Prinsip: PREFILL + pindah + notice — BUKAN generate otomatis berantai. User tetap meninjau form lalu generate sendiri.

**Kalender Konten → Short Video (format video):**
Tombol "🎬 Buat video ini" di setiap post → konfirmasi → form Short Video terisi dengan topik, hook, caption draft dari kalender. Banner "📋 Brief dari pipeline aktif" muncul di atas form dengan tombol ✕ untuk menghapus.

**Kalender Konten → Carousel IG (format carousel/image):**
Tombol "🖼️ Buat carousel ini" → konfirmasi → form Carousel IG terisi.

**YouTube Long → Thumbnail Pack:**
Tombol "🖼️ Buat Thumbnail-nya" di metadata → pilih 1 dari 3 title_variants → prefill ke Thumbnail Pack.

**Short Video → Caption versi platform lain:**
Di output Scene Cards → bagian Captions → dropdown pilih platform target → tombol 🌐 Versi [Platform] → generate caption adapted via API. Hasil ditampilkan di bawah caption asli, tidak disimpan ke history (sesi saja).`,
  },
  {
    id: 'carousel-ig',
    title: '13. Carousel IG — Konten Slide-by-Slide',
    content: `Carousel IG adalah content type ke-5: slide carousel untuk Instagram Feed. Output: JSON dengan slide per halaman + prompt gambar siap generate.

**Struktur Slide Wajib:**
• Slide 1 = COVER — hook visual + cover_hook_text (maks 8 kata) yang bikin orang berhenti scroll
• Slide 2 s.d. slide sebelum terakhir = CONTENT — 1 ide per slide, bernilai edukatif
• Slide terakhir = CTA — ajakan sesuai contentGoal (growth → save/share jangan transaksi)

**🎨 Style Anchor — Kenapa Semua Slide Seragam:**
design_system.style_anchor = SATU kalimat English yang mendeskripsikan gaya visual seragam (style, palette, lighting, mood). SETIAP image_prompt.prompt_full WAJIB diawali style_anchor VERBATIM kata-per-kata sebelum deskripsi spesifik slide. Tanpa ini, tiap slide akan terlihat seperti desainer berbeda.

**Generate Gambar:**
• Per slide: tombol 🎨 Generate Gambar → loading/error/preview per slide + Download slide_<N>.png
• Generate Semua Slide: tombol → berurutan satu per satu (BUKAN paralel — hormati rate limit) dengan progress "Slide 3/6..." + tombol Batalkan antar slide

**Teks Tidak Dirender di Gambar:**
image_prompt.prompt_full TIDAK boleh menyertakan teks/tipografi di gambar. Gunakan layout_note sebagai panduan tata letak teks saat menyusun slide di Canva/CapCut.`,
  },
  {
    id: 'settings-baru',
    title: '14. Pengaturan Baru',
    content: `Beberapa pengaturan baru telah ditambahkan sejak versi awal:

**🎨 Image Engine (Settings → Image Engine):**
• Toggle Puter.js (User-Pays, bisa popup login)
• Dropdown model Gemini Image (default: gemini-3.1-flash-image)
• Urutan chain read-only

**🔄 Urutan Prioritas Provider Teks (Settings → API Configuration):**
• Daftar 3 provider dengan tombol ▲ ▼ untuk mengatur prioritas
• Provider tanpa API key otomatis dilewati
• Default: Gemini → Groq → OpenRouter
• Nilai korup (bukan permutasi valid 3 provider) otomatis direset ke default

**🖼️ Penyimpanan Foto Referensi (Settings → bawah):**
• Foto referensi (karakter, lokasi, produk) disimpan di IndexedDB browser
• Bisa dibersihkan dengan tombol "Bersihkan semua foto tersimpan"
• Foto di IndexedDB TIDAK ikut terhapus saat Reset Data Aplikasi (yang menghapus localStorage)`,
  },
  {
    id: 'disclosure',
    title: '15. Disclosure & Kepatuhan Platform',
    content: `Platform media sosial mewajibkan penanda konten buatan AI dan konten komersial. ViralFrame membantu memenuhinya secara otomatis:

**🤖 Label AI-generated Content:**
Di output Scene Cards → bagian Captions, ada pengingat statis: "Video hasil AI — jangan lupa aktifkan label 'AI-generated content' saat upload di TikTok/YouTube/Instagram (kewajiban platform, di luar caption)."

**💰 Penanda Komersial (Affiliate Disclosure):**
Jika contentGoal = Konversi, master prompt secara otomatis menginstruksikan AI untuk menyertakan penanda komersial yang wajar di setiap caption:
• Di akhir caption_text: "#ad", "#affiliate", atau frasa ringan seperti "yang dibeli lewat link ini mendukung channel"
• ATAU di hashtags: #ad atau #affiliate
Untuk Growth/Engagement: TIDAK perlu disclosure (tidak ada transaksi).

**✅ Policy Compliance:**
Semua output AI melewati policy linter yang mendeteksi klaim absolut, klaim medis, testimonial fiktif, dan (mode Growth) bahasa komersial.`,
  },
  {
    id: 'faq',
    title: '16. FAQ',
    content: `**Q: Kenapa AI tidak mengeluarkan JSON?**
A: AI kadang menambah teks sebelum/sesudah JSON. ViralFrame sudah memiliki auto-strip parser yang mengekstrak JSON secara otomatis. Jika gagal, coba regenerate sekali lagi.

**Q: Boleh pakai AI model mana saja?**
A: Direct API Mode mendukung Gemini (gemini-2.5-flash), Groq (Llama 3.3), dan OpenRouter. Manual Prompt Mode bisa dipakai dengan AI apapun yang mendukung prompt panjang.

**Q: API key aman?**
A: Ya. API key disimpan hanya di localStorage browser kamu. Tidak pernah dikirim ke server ViralFrame — hanya langsung ke penyedia API (Google/Groq/OpenRouter) saat generate.

**Q: Berapa scene yang disarankan?**
A: 4–6 scene untuk video 15–45 detik adalah sweet spot. Hook (1) + Body (2–4) + CTA (1). Lebih dari 10 scene bisa membuat video terlalu panjang.

**Q: Kenapa ada batas kata per scene?**
A: Lipsync — narasi harus muat dalam durasi scene. Scene 3 detik = maks ~8 kata (kecepatan 165 WPM). Jika narasi terlalu panjang, dubber/TTS akan terpotong atau terdengar terlalu cepat.

**Q: Data tersimpan di mana?**
A: Settings, riwayat generate, dan template kustom tersimpan di localStorage (key: viralframe-store). Foto referensi tersimpan di IndexedDB. Tidak ada backend server. Semua data bisa dibersihkan di Settings atau via tombol Reset Data Aplikasi di layar error.

**Q: Error render muncul terus setelah reload?**
A: Bisa jadi state persist korup. Buka layar error (app akan menampilkan ErrorBoundary) → klik "🗑️ Reset Data Aplikasi" → konfirmasi. History, template, dan settings akan terhapus, tapi foto IndexedDB tetap aman.`,
  },
];

export function Guide() {
  const [openSection, setOpenSection] = useState<string | null>('jenis-konten');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 style={{ color: 'var(--vf-text-primary)' }}>📖 Panduan Penggunaan</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--vf-text-secondary)' }}>
          Panduan lengkap fitur aktual ViralFrame Studio.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <div key={section.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--vf-border)' }}>
            <button
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
              className="w-full text-left px-5 py-4 flex items-center justify-between"
              style={{ background: openSection === section.id ? 'var(--vf-bg-elevated)' : 'var(--vf-bg-secondary)' }}
            >
              <span className="font-semibold text-sm" style={{ color: 'var(--vf-text-primary)' }}>{section.title}</span>
              <span style={{ color: 'var(--vf-text-muted)' }}>{openSection === section.id ? '▲' : '▼'}</span>
            </button>
            {openSection === section.id && (
              <div className="px-5 py-4" style={{ background: 'var(--vf-bg-elevated)', borderTop: '1px solid var(--vf-border)' }}>
                {section.content.split('\n\n').map((para, i) => {
                  if (para.startsWith('**') && para.endsWith('**') && !para.includes('\n')) {
                    return <h4 key={i} className="font-semibold mt-3 mb-1 first:mt-0" style={{ color: 'var(--vf-text-primary)' }}>{para.replace(/\*\*/g, '')}</h4>;
                  }
                  const formatted = para.split('\n').map((line, j) => {
                    if (line.startsWith('**') && line.includes(':**')) {
                      const parts = line.split(':**');
                      return <p key={j} className="mb-1"><strong style={{ color: 'var(--vf-text-primary)' }}>{parts[0].replace(/\*\*/g, '')}:</strong><span style={{ color: 'var(--vf-text-secondary)' }}>{parts.slice(1).join(':**')}</span></p>;
                    }
                    if (line.startsWith('•') || line.match(/^\d+\./)) {
                      return <p key={j} className="mb-1 ml-2 text-sm" style={{ color: 'var(--vf-text-secondary)' }}>{line}</p>;
                    }
                    if (line.startsWith('→')) {
                      return <p key={j} className="mb-1 ml-4 text-sm" style={{ color: 'var(--vf-text-muted)' }}>{line}</p>;
                    }
                    return <p key={j} className="mb-1 text-sm" style={{ color: 'var(--vf-text-secondary)' }}>{line}</p>;
                  });
                  return <div key={i} className="mb-3">{formatted}</div>;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
