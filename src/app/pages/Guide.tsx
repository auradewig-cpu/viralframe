import { useState } from 'react';

const sections = [
  {
    id: 'cara-kerja',
    title: '1. Cara Kerja ViralFrame Studio',
    content: `ViralFrame Studio adalah AI Video Scene Generator yang bekerja dalam 3 tahap:

**Tahap 1 — Form Input:**
Kamu mengisi form 3 langkah yang mengumpulkan semua parameter video — niche bisnis, deskripsi produk, platform distribusi, AI tool yang digunakan, jumlah scene, durasi, karakter, gaya visual, hingga CTA.

**Tahap 2 — AI Generate:**
• **Direct API Mode** (Direkomendasikan): App memanggil Google Gemini API (atau Groq sebagai fallback) secara otomatis dari browser. Output JSON per scene langsung muncul di dalam app sebagai Scene Cards.
• **Manual Prompt Mode** (Fallback): App menghasilkan Master Prompt teks yang bisa kamu copy-paste ke ChatGPT, Claude, atau Gemini secara manual.

**Tahap 3 — Scene Cards:**
Setiap scene ditampilkan sebagai card dengan: narasi, prompt video (siap di-paste ke AI video tool), visual brief, dan Reference Frame Guide untuk menjaga konsistensi antar scene.`,
  },
  {
    id: 'api-key',
    title: '2. Cara Mendapatkan API Key Gratis',
    content: `**Google Gemini API Key (Direkomendasikan):**
1. Kunjungi https://ai.google.dev
2. Klik "Get API Key" → Sign in dengan Google account
3. Buat API key baru → Copy
4. Paste di ViralFrame → Settings → API Configuration → Gemini API Key
5. Tidak perlu kartu kredit. Gratis selamanya dengan limit harian.

**Limit Gratis Gemini:** 250 request/hari · 1.000.000 token/hari
→ Setara ~85 generate video 20-scene per hari!

**Groq API Key (Backup Otomatis):**
1. Kunjungi https://console.groq.com
2. Sign up gratis → Settings → API Keys → Create API Key
3. Paste di ViralFrame → Settings → Groq API Key

Groq digunakan sebagai fallback otomatis jika Gemini gagal atau quota habis.`,
  },
  {
    id: 'isi-form',
    title: '3. Cara Mengisi Form',
    content: `**Step 1 — Konteks Bisnis:**
• **Jenis Bisnis**: Pilih niche yang paling sesuai. Niche menentukan psikografis dan pain point yang diinjeksikan ke prompt.
• **Deskripsi Produk**: Semakin detail semakin baik. Sebutkan nama produk, harga, keunggulan, bukti sosial, dan target pain point.
• **USP**: Satu keunggulan TERBESAR. AI akan menegaskan ini minimal 2x dalam video.
• **Platform**: Platform pertama yang dipilih = Platform Primer yang mempengaruhi format dan behavior.

**Step 2 — Spesifikasi Video:**
• **AI Tool**: Pilih tool yang akan kamu pakai untuk generate video. Setiap tool punya batas karakter prompt yang berbeda.
• **Jumlah Scene**: Scene 1 = Hook, Scene terakhir = CTA, scene di antaranya = Body.
• **Durasi Scene**: Durasi menentukan batas kata narasi. Scene 3 detik = maks 8 kata!

**Step 3 — Parameter Kreatif:**
• **Hook**: "Auto" biasanya bagus. Coba "Shocking Fact" atau "Pain Point Attack" untuk produk konsumer.
• **CTA**: Sesuaikan dengan tujuan campaign. "Link di Bio" untuk traffic, "Komen KEYWORD" untuk engagement.
• **Karakter**: Semakin detail karakter → semakin konsisten tampilannya antar scene.`,
  },
  {
    id: 'scene-cards',
    title: '4. Memahami Scene Cards',
    content: `Setiap Scene Card berisi:

**📝 Script Narasi:** Teks yang dibacakan/dubbing. Sudah dihitung masuk dalam durasi scene (lipsync).

**🎥 Prompt Video:** Teks siap di-paste ke AI video tool. Tombol ⎘ Copy untuk copy langsung. Cek indikator chars (misal: 432/500 ✅).

**🎬 Visual Brief:** Deskripsi scene dalam Bahasa Indonesia untuk membantu kamu memahami dan brief team. Termasuk kamera, audio, dan transisi.

**🔗 Reference Frame Guide:** Panduan step-by-step cara menjaga konsistensi karakter dari scene ke scene berikutnya. Berbeda per AI tool.

**Badge Warna Scene:**
• 🟡 Amber = HOOK
• 🔵 Cyan = BODY
• 🟣 Ungu = CTA`,
  },
  {
    id: 'generate-scene',
    title: '5. Cara Generate Video Per Scene',
    content: `**Google Veo 3 / OpenAI Sora (Tidak support Reference Image):**
→ Copy prompt setiap scene, paste ke platform. Konsistensi dijaga via deskripsi karakter identik.

**Kling AI 2.0:**
1. Generate Scene 1, pilih frame terbaik
2. Klik "..." → "Save Frame"
3. Klik "Image to Video" → Upload frame Scene 1 sebagai Start Frame
4. Paste prompt Scene 2 → Generate

**Runway Gen-4:**
1. Generate Scene 1, download hasilnya
2. Pilih "Gen-4" → klik "Reference Image"
3. Upload frame Scene 1 → Paste prompt Scene 2 → Generate

**Luma Dream Machine:**
1. Generate Scene 1, ambil frame terakhir
2. Klik "Keyframe" atau "Image to Video"
3. Upload frame → Paste prompt → Generate

**Pika Labs 2.0:**
1. Generate Scene 1, download frame
2. Klik "+" → "Upload Image" → Upload frame Scene 1
3. Paste prompt Scene 2 → Generate`,
  },
  {
    id: 'gabung-scene',
    title: '6. Cara Menggabungkan Scene Menjadi Video Utuh',
    content: `**Tools yang Direkomendasikan:**
• **CapCut** (Gratis, mudah) — Import semua clip, susun urutan, tambah teks overlay
• **DaVinci Resolve** (Gratis, profesional) — Color grading, audio mix
• **Adobe Premiere** (Berbayar) — Full control

**Tips Color Grading:**
• Gunakan LUT yang sama untuk semua scene (rekomendasi ada di Production Notes)
• Pastikan color temperature konsisten — scene siang tidak dicampur malam
• Vibrance +15–20 untuk konten TikTok/Reels

**Tips Audio Mix:**
• Musik: -12dB to -15dB (background)
• Narasi: -3dB to -6dB (foreground)
• SFX: -8dB to -10dB
• Pastikan bass cut di narasi untuk clarity`,
  },
  {
    id: 'tips-viral',
    title: '7. Tips Viral 2025',
    content: `**1. 3-Second Rule yang Sebenarnya:**
Hook kamu harus memaksa penonton BERHENTI scroll dalam 1.5 detik pertama — bukan 3 detik. Gunakan gerakan mendadak, teks mengejutkan, atau suara tak terduga di frame pertama.

**2. Watch Time > Likes:**
Algoritma TikTok dan Reels 2025 sangat memprioritaskan completion rate dan re-watch rate. Buat ending yang membuat penonton ingin menonton ulang dari awal.

**3. Micro-Hooks Setiap 3 Detik:**
Setiap 3 detik, berikan alasan baru untuk tetap menonton. Pertanyaan tersirat, informasi mengejutkan, atau perubahan visual mendadak.

**4. Social Proof dengan Angka Spesifik:**
"10.000+" lebih kuat dari "ribuan". "98% berhasil" lebih kuat dari "hampir semua berhasil". Angka spesifik = otoritas.

**5. CTA yang Jelas dan Urgency:**
Penonton perlu tahu PERSIS apa yang harus dilakukan. "Klik link di bio" lebih lemah dari "Klik link di bio SEKARANG — stok terbatas!". Tambahkan urgency nyata.

**8 Elemen Viral yang Digunakan ViralFrame:**
1. Pattern Interrupt (sesuatu tak terduga di 0–2 detik)
2. Curiosity Gap (penonton harus ingin tahu kelanjutannya)
3. Emotional Trigger (minimal 1 emosi kuat)
4. Social Proof (angka atau bukti nyata)
5. Micro-Hooks (alasan baru setiap 3–5 detik)
6. Cliffhanger (akhir body scene menarik ke scene berikutnya)
7. Sensory Language (deskripsi yang bisa "dirasakan")
8. Unexpected Twist (1 momen mengejutkan)`,
  },
  {
    id: 'faq',
    title: '8. FAQ',
    content: `**Q: Kenapa AI tidak mengeluarkan JSON?**
A: AI kadang menambah teks sebelum/sesudah JSON. ViralFrame sudah memiliki auto-strip yang mengekstrak JSON secara otomatis. Jika gagal, coba regenerate sekali lagi.

**Q: Boleh pakai AI model mana saja?**
A: Direct API Mode mendukung Gemini 2.5 Flash, Groq Llama 3.3, dan OpenRouter. Manual Prompt Mode bisa dipakai dengan AI apapun yang mendukung prompt panjang.

**Q: API key aman?**
A: Ya. API key disimpan hanya di localStorage browser kamu. Tidak pernah dikirim ke server ViralFrame — hanya langsung ke Google/Groq saat generate.

**Q: Berapa scene yang disarankan?**
A: 4–6 scene untuk video 15–45 detik adalah sweet spot. Hook (1) + Body (2–4) + CTA (1). Lebih dari 10 scene bisa membuat video terlalu panjang.

**Q: Kenapa ada batas kata per scene?**
A: Ini untuk lipsync — narasi harus muat dalam durasi scene. Scene 3 detik = maksimal 8 kata. Jika narasi terlalu panjang, dubber/TTS akan terpotong atau terdengar terlalu cepat.

**Q: Apa itu Reference Frame?**
A: AI video tool generate setiap scene secara independen. Tanpa referensi, karakter bisa berubah penampilan antar scene. Reference Frame = screenshot frame terakhir scene sebelumnya yang di-upload ke AI tool sebagai panduan konsistensi.`,
  },
];

export function Guide() {
  const [openSection, setOpenSection] = useState<string | null>('cara-kerja');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 style={{ color: 'var(--vf-text-primary)' }}>📖 Panduan Penggunaan</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--vf-text-secondary)' }}>
          Panduan lengkap untuk memaksimalkan ViralFrame Studio.
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
