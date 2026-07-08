# ViralFrame Studio — PRD v5.1
### AI Video Prompt Generator · Direct API Integration · Scene-Ready Output
### Codebase-Synced Edition · Production-Ready · Verified Complete

> **Dokumen ini adalah sinkronisasi PRD v5.0 dengan kode aktual setelah implementasi penuh.**
> v5.1 memperbaiki 15+ ketidaksesuaian antara PRD v5.0 dan codebase real:
> tabel AI Tools kehilangan entri `google_flow`, localStorage keys mengacu nama `vf_` lawas,
> nama file tech stack tidak sesuai (masterPromptCompiler.ts → masterPrompt.ts, dll),
> Tailwind CSS v3 → v4, React Hook Form tidak dipakai (Zod saja),
> template Master Prompt kurang AUDIO/DIALOG directive dan POLICY COMPLIANCE block,
> posisi field `ai_ready_prompt` di JSON schema (kini di awal, bukan akhir scene),
> timeout API 60s → 90s, loading state skeleton → progress bar + lampu provider,
> badge provider di output header, referencePhotos di-strip dari history,
> dan error handling QuotaExceeded (tanpa toast system).
> Dokumen ini adalah sumber kebenaran tunggal untuk kode saat ini.

---

## CHANGELOG v3.0 → v4.0 → v5.0 → v5.1

### v3.0 → v4.0
| # | Area | Kondisi di v3.0 | Perubahan di v4.0 |
|---|------|-----------------|-------------------|
| 1 | **Mode Operasi** | Hanya Manual Mode | Ditambahkan **Direct API Mode** via Gemini/Groq |
| 2 | **Output Panel** | 4 tab statis | Scene Cards Output per scene dengan copy button |
| 3 | **API Configuration** | Tidak ada | Seksi API di `/settings`: key, provider, test |
| 4 | **API Provider** | Tidak ada | Gemini 2.5 Flash + Groq Llama 3.3 + OpenRouter |
| 5 | **Konsistensi Visual** | Narasi saja | Reference Frame System step-by-step per tool |
| 6 | **Scene Card UI** | Tidak ada | Spec lengkap: narasi, prompt, brief, sound, ref frame |
| 7 | **Error Handling API** | Tidak ada | Retry, fallback, timeout, quota, parse error |
| 8 | **Keamanan API Key** | Tidak ada | localStorage only, tidak keluar dari browser |
| 9 | **Definisi Produk** | "Tidak generate JSON" | Direct API Mode generate JSON langsung |
| 10 | **Roadmap** | Direct API di v1.4 | Dipercepat ke v1.1 sebagai fitur inti |
| 11 | **Tech Stack** | Tidak ada API spec | Spec lengkap: fetch wrapper, retry, JSON parser |
| 12 | **Halaman /settings** | Preferensi saja | Diperluas dengan API Configuration UI |

### v4.0 → v5.0 (Evaluasi & Perbaikan Final)
| # | Area | Gap di v4.0 | Perbaikan di v5.0 |
|---|------|-------------|-------------------|
| 1 | **Token Limit API** | `maxTokens: 8192` — tidak cukup untuk 10–20 scene | Dinaikkan ke `32768` untuk Gemini, ditambahkan panduan estimasi token per scene |
| 2 | **CORS Blocking** | Tidak dibahas — API call langsung dari browser akan diblokir CORS untuk beberapa endpoint | Ditambahkan spec: Gemini mendukung browser call langsung (tidak perlu proxy). Groq dan OpenRouter juga mendukung. Dicatat di Seksi 5.3 |
| 3 | **Temperature untuk JSON** | `temperature: 0.7` — terlalu tinggi untuk output JSON terstruktur, berisiko format acak | Diturunkan ke `0.3` untuk semua provider. Penjelasan ditambahkan di Seksi 5.4 |
| 4 | **Duo Karakter — Spec Inject** | Sub-form pilihan "Duo (Pria + Wanita)" tidak ada spec cara inject ke prompt | Ditambahkan spec inject Duo di Seksi 3.13 |
| 5 | **OpenRouter di localStorage** | `vf_api_openrouter` tidak ada di tabel localStorage tech stack | Ditambahkan di Seksi 13 |
| 6 | **Contoh Output JSON** | v4.0 tidak menyertakan contoh JSON output lengkap | Ditambahkan kembali di Seksi 9 (dari v3.0, diperbarui untuk konsistensi v5.0) |
| 7 | **Mode Selector di Form** | Step form (Seksi 3) tidak menyebutkan kapan/di mana mode dipilih dalam wizard | Diperjelas: Mode Selector adalah **Step 0** sebelum form, atau dikonfigurasi di Settings |
| 8 | **Halaman /templates** | Disebutkan di navigasi tapi tidak ada spesifikasi UI halaman | Ditambahkan Seksi UI /templates di Seksi 10.3 |
| 9 | **Font Fallback** | Typography tidak mendefinisikan fallback jika font tidak ter-load | Ditambahkan fallback stack di Seksi 12.2 |
| 10 | **Seksi /guide Referensi** | Seksi 2 navigasi menyebut `/guide` sebagai "Seksi 10" tapi isinya ada di Seksi 11 | Referensi dikoreksi — konsisten di seluruh dokumen |
| 11 | **Estimasi Token per Generate** | Tidak ada panduan berapa token yang dibutuhkan per generate | Ditambahkan tabel estimasi di Seksi 5.1 |
| 12 | **ZIP Download Spec** | Tidak ada spec isi file ZIP per scene | Ditambahkan spec di Seksi 4.2 |

### v5.0 → v5.1 (Codebase Sync)

| # | Area | Gap di v5.0 | Perbaikan di v5.1 |
|---|------|-------------|-------------------|
| 1 | **AI Tools** | `google_flow` tidak ada di tabel AI Tools dan format spec | Ditambahkan sebagai tool pertama (500 chars, ✅ ref image) |
| 2 | **localStorage keys** | PRD menyebut key `vf_history`, `vf_api_gemini`, dll. — tidak sesuai kode (pakai zustand persist key `viralframe-store`) | Semua referensi localStorage diperbarui |
| 3 | **Tech Stack file names** | `masterPromptCompiler.ts`, `lipsyncCalculator.ts`, dll. — tidak ada di codebase | Diperbarui: `masterPrompt.ts`, `lipsync.ts`, `maps.ts`, `validation.ts`, `jsonParser.ts` |
| 4 | **Tailwind CSS** | Disebut v3 | Diperbarui ke v4 |
| 5 | **React Hook Form** | Disebut di tech stack | Dihapus — form pakai Zustand + Zod langsung |
| 6 | **Master Prompt template** | Tidak ada AUDIO/DIALOG directive, POLICY COMPLIANCE block, atau simplified ai_ready_prompt schema | Ditambahkan di template |
| 7 | **Posisi ai_ready_prompt** | Di akhir object scene (setelah cliffhanger_to_next) | Dipindah ke posisi 5 (setelah speech_pace, sebelum script_narration) — mencegah AI skip field |
| 8 | **API Timeout** | 60 detik | Dinaikkan ke 90 detik |
| 9 | **Loading State UI** | Skeleton cards | Progress bar 0–100% + 3 lampu provider (Gemini/Groq/OpenRouter) + teks progress real-time |
| 10 | **Error UX** | Toast auto-dismiss 5 detik | Inline banner merah, non-blocking — tidak ada toast system |
| 11 | **Character Consistency Score** | Disebut di Scene Card | Di form Step 3 (bukan Scene Card) |
| 12 | **Output Header** | Tidak ada badge provider | Menampilkan "Digenerate via [provider]" |
| 13 | **History** | `referencePhotos` tidak disebut | Sekarang referencePhotos (base64) dihapus dari history — cegah QuotaExceededError |
| 14 | **Quota di Settings** | Ada teks "Sisa quota hari ini" di mockup UI | Dihapus — tidak diimplementasikan |
| 15 | **Platform Baru** | Tidak ada Shopee Video | Ditambahkan `shopee_video` ke PLATFORMS (9:16, 15-60s) + PLATFORM_BEHAVIOR entry |
| 16 | **CTA Baru** | Tidak ada Klik Keranjang Kuning | Ditambahkan `klik_keranjang_kuning` ke CTA_TYPES |
| 17 | **Hashtag Variations** | Hanya 1 set hashtag statis dari AI | `generateHashtagVariations()` — 5 seeded shuffle kombinasi + tombol copy per variasi di DirectPanel |
| 18 | **Caption Variations** | `caption_first_line` + `hashtag_strategy` (field terpisah) | Diganti `caption_variations[]` — AI generate N variasi (caption text + 5 hashtag combos), dropdown di Step 3 (1-5), validasi di jsonParser, rendering per variasi di DirectPanel |
| 15 | **Badge Ref Image** | "✅ Mendukung Reference Image" | Dipendekkan jadi "✅ Ref Image" |

---

## 1. DEFINISI PRODUK

**Nama:** ViralFrame Studio
**Platform:** Web App — berjalan di `localhost` (Node.js/Vite, tanpa server eksternal)
**Pengguna:** Personal — content creator, affiliate marketer, agen properti, dsb.

### 1.1 Apa yang Dilakukan Software Ini?

ViralFrame Studio adalah **AI Video Scene Generator** — sebuah form terstruktur yang mengumpulkan parameter video dari user, lalu secara otomatis memanggil AI API untuk menghasilkan **prompt video siap pakai per scene**, lengkap dengan narasi, visual direction, dan prompt yang bisa langsung di-paste ke AI video generator pilihan user.

Software ini beroperasi dalam **dua mode yang bisa dipilih user:**

**Mode 1 — Direct API Mode (Direkomendasikan):**
App memanggil Google Gemini API (atau Groq) langsung dari browser. User tidak perlu membuka tab lain. Output JSON per scene muncul otomatis di dalam app, ditampilkan sebagai Scene Cards yang siap di-copy.

**Mode 2 — Manual Prompt Mode (Fallback):**
App menghasilkan Master Prompt teks yang bisa di-copy dan di-paste ke ChatGPT, Claude, Gemini, atau AI lain secara manual. Mode ini tetap tersedia untuk user yang tidak ingin mengkonfigurasi API key, atau sebagai backup jika API tidak tersedia.

### 1.2 Definisi Output Per Mode

```
DIRECT API MODE:
Input Form → [Gemini/Groq API dipanggil otomatis] → Scene Cards

Setiap Scene Card berisi:
├── Nomor scene + tipe (Hook/Body/CTA)
├── Durasi + pace + max kata
├── Script narasi (siap dubbing)
├── Script subtitle (jika bilingual)
├── Prompt video untuk AI tool pilihan (tombol ⎘ Copy)
├── Visual brief (deskripsi scene dalam Bahasa Indonesia)
├── Camera direction
├── Sound design
├── Transition ke scene berikutnya
├── Reference Frame Guide (cara menjaga konsistensi dari scene sebelumnya)
└── Viral element yang aktif di scene ini

MANUAL PROMPT MODE:
Input Form → Master Prompt teks → User copy → Paste ke AI eksternal
→ AI eksternal hasilkan JSON → User paste JSON ke Tab Validate
→ Scene Cards muncul setelah validasi
```

### 1.3 Alur Kerja Lengkap

```
╔══════════════════════════════════════════════════════════════╗
║                    VIRALFRAME STUDIO                         ║
║                    (localhost app)                           ║
║                                                              ║
║  [STEP 1] User isi form parameter video (3 step wizard)      ║
║           ↓                                                  ║
║  [STEP 2] User pilih mode output:                            ║
║           ○ Direct API Mode   ○ Manual Prompt Mode           ║
║           ↓                                                  ║
║  [STEP 3] Klik "⚡ Generate"                                 ║
╚══════════════════════════════════════════════════════════════╝
         │                              │
         │ Direct API Mode              │ Manual Prompt Mode
         ↓                              ↓
╔═══════════════════╗        ╔══════════════════════╗
║  Gemini/Groq API  ║        ║   Master Prompt teks  ║
║  dipanggil dalam  ║        ║   tampil di Output    ║
║  app (otomatis)   ║        ║   Panel Tab 1         ║
╚═══════════════════╝        ╚══════════════════════╝
         │                              │
         ↓                              ↓ (user paste manual)
╔═══════════════════╗        ╔══════════════════════╗
║  JSON per scene   ║        ║  AI Eksternal         ║
║  langsung muncul  ║        ║  (ChatGPT/Claude/     ║
║  sebagai Scene    ║        ║   Gemini) hasilkan    ║
║  Cards di app     ║        ║   JSON                ║
╚═══════════════════╝        ╚══════════════════════╝
         │                              │
         └──────────────┬───────────────┘
                        ↓
╔══════════════════════════════════════════════════════════════╗
║                    SCENE CARDS OUTPUT                        ║
║                                                              ║
║  Scene 1 [Hook]    Scene 2 [Body]    Scene 3 [CTA]          ║
║  ┌─────────────┐   ┌─────────────┐  ┌─────────────┐        ║
║  │ Narasi      │   │ Narasi      │  │ Narasi      │        ║
║  │ Prompt      │   │ Prompt      │  │ Prompt      │        ║
║  │ [⎘ Copy]   │   │ [⎘ Copy]   │  │ [⎘ Copy]   │        ║
║  │ Ref Frame   │   │ Ref Frame   │  │ Ref Frame   │        ║
║  └─────────────┘   └─────────────┘  └─────────────┘        ║
╚══════════════════════════════════════════════════════════════╝
         │
         ↓ (user copy prompt per scene, paste ke AI video tool)
╔══════════════════════════════════════════════════════════════╗
║           AI VIDEO GENERATOR (Veo3 / Kling / Runway / dll.) ║
║                                                              ║
║  Scene 1 → generate clip → simpan frame terakhir            ║
║  Scene 2 → upload frame Scene 1 sebagai referensi           ║
║  Scene 3 → upload frame Scene 2 sebagai referensi           ║
║  ...                                                         ║
║  Gabung semua scene → VIDEO VIRAL UTUH YANG KONSISTEN        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 2. ARSITEKTUR INFORMASI & NAVIGASI

```
localhost:5173/
├── /             → Home — Form Generator (3-step wizard) + Output Panel
├── /history      → Riwayat generate + load ulang parameter + lihat scene cards lama
├── /templates    → Template preset bawaan + template custom user (spesifikasi UI di Seksi 11.3)
├── /settings     → Preferensi default + Konfigurasi API (spesifikasi UI di Seksi 8)
└── /guide        → Panduan lengkap penggunaan (outline konten di Seksi 12)
```

---

## 3. FORM — PARAMETER INPUT (LENGKAP)

### Urutan Lengkap Wizard

```
STEP 0 (Opsional — Skip jika sudah diset di /settings):
Mode Selector — Direct API Mode atau Manual Prompt Mode

STEP 1: Konteks Bisnis & Video
STEP 2: Spesifikasi Video
STEP 3: Parameter Kreatif → [⚡ Generate]
```

> **Catatan Mode Selector:** Jika user sudah mengkonfigurasi API key di `/settings` dan memilih Default Mode = "Direct API", Step 0 di-skip otomatis dan app langsung ke Step 1. Jika belum ada konfigurasi, Step 0 muncul sebagai layar pertama sebelum form. User juga bisa mengubah mode kapan saja melalui tombol kecil di pojok kanan atas header form.

Setiap step punya tombol **[Lanjut →]** dan **[← Kembali]**.
Step 3 diakhiri tombol **[⚡ Generate]**.

---

### STEP 1: KONTEKS BISNIS & VIDEO

#### 3.1 Jenis Bisnis / Niche
**Tipe:** Dropdown wajib

| Value | Label |
|-------|-------|
| `affiliate_product` | 🛒 Affiliate Video Product |
| `real_estate` | 🏠 Agen Properti |
| `web_builder` | 💻 Web Builder / Jasa Website |
| `fashion_beauty` | 💄 Fashion & Beauty |
| `food_beverage` | 🍜 Kuliner & F&B |
| `education_course` | 📚 Edukasi & Online Course |
| `health_wellness` | 🏋️ Kesehatan & Wellness |
| `travel_tourism` | ✈️ Travel & Wisata |
| `finance_investment` | 💰 Finance & Investasi |
| `saas_app` | 📱 SaaS / Aplikasi Digital |
| `personal_brand` | 🎤 Personal Branding |
| `dropship_ecommerce` | 📦 Dropship / E-Commerce |
| `local_service` | 🔧 Jasa Lokal (salon, laundry, dsb.) |
| `event_organizer` | 🎪 Event & Entertainment |

#### 3.2 Deskripsi Produk / Layanan
**Tipe:** Textarea (max 500 karakter)
**Label:** "Ceritakan produkmu secara spesifik"
**Placeholder:**
```
Contoh: Sepatu lari wanita anti-slip "RunFast Pro", harga Rp299.000,
cocok untuk gym dan outdoor. Sudah terjual 10.000+ pasang.
Keunggulan: sol anti-licin, material breathable, tersedia 8 warna.
Target pain point: kaki pegal dan mudah terpeleset saat olahraga.
```
**UI Note:** Tampilkan character counter. Semakin detail → narasi lebih spesifik.
**Validasi:** Minimum 30 karakter.

#### 3.3 Unique Selling Point (USP)
**Tipe:** Text input (max 150 karakter)
**Label:** "Apa 1 keunggulan terbesar produk/layananmu?"
**Placeholder:** "Contoh: Satu-satunya sepatu lari lokal bersertifikat anti-licin SNI"
**Fungsi:** AI akan menjadikan USP ini sebagai pesan inti yang ditegaskan minimal 2x dalam video.

#### 3.4 Target Audiens
**Tipe:** Multi-checkbox

| Value | Label |
|-------|-------|
| `gen_z` | Gen Z (17–25 th) |
| `millennial` | Millennial (26–40 th) |
| `gen_x` | Gen X (41–55 th) |
| `male` | Pria |
| `female` | Wanita |
| `parent` | Orang Tua |
| `entrepreneur` | Pengusaha / Freelancer |
| `student` | Pelajar / Mahasiswa |
| `professional` | Profesional / Karyawan |
| `homemaker` | Ibu Rumah Tangga |

#### 3.5 Platform Distribusi Video
**Tipe:** Multi-checkbox
**UI Note:** Platform pertama yang dicentang = platform **primer**. Tampilkan badge "PRIMER".

| Value | Label | Rasio Default | Durasi Optimal |
|-------|-------|---------------|----------------|
| `tiktok` | TikTok | 9:16 | 15–60s |
| `instagram_reels` | Instagram Reels | 9:16 | 15–90s |
| `youtube_shorts` | YouTube Shorts | 9:16 | 15–60s |
| `facebook_reels` | Facebook Reels | 9:16 | 15–60s |
| `xiaohongshu` | Xiaohongshu / RedNote | 9:16 atau 3:4 | 15–60s |
| `shopee_video` | Shopee Video | 9:16 | 15–60s |

---

### STEP 2: SPESIFIKASI VIDEO

#### 3.6 AI Video Tool yang Digunakan
**Tipe:** Dropdown wajib

| Value | Label | Batas Karakter Prompt | Mendukung Ref Image |
|-------|-------|----------------------|---------------------|
| `google_flow` | Google Flow | 500 chars | ✅ |
| `veo3` | Google Veo 3 | 500 chars | ❌ |
| `kling_ai` | Kling AI 2.0 | 400 chars | ✅ |
| `minimax_hailuo` | Minimax Video / Hailuo | 350 chars | ✅ |
| `runway_gen4` | Runway Gen-4 | 300 chars | ✅ |
| `luma_dream` | Luma Dream Machine | 300 chars | ✅ |
| `pika_labs` | Pika Labs 2.0 | 250 chars | ✅ |
| `sora` | OpenAI Sora | 600 chars | ❌ |
| `bytedance_jianying` | Bytedance Jianying / MagicVideo | 400 chars | ✅ |
| `wan21` | Wan 2.1 (Alibaba) | 400 chars | ✅ |
| `cogvideox` | CogVideoX | 350 chars | ❌ |

**UI Note:** Tampilkan badge "✅ Ref Image" di sebelah pilihan yang support. Badge ini relevan untuk panduan konsistensi antar scene.

#### 3.7 Jumlah Scene
**Tipe:** Number input (range 2–20)
**Keterangan otomatis:**
- Scene 1 = Hook
- Scene terakhir = CTA
- Scene di antara = Body (total − 2)

#### 3.8 Durasi Per Scene
**Tipe:** Toggle — Mode A (seragam) atau Mode B (manual per scene)

**Mode A:** Input tunggal "Durasi setiap scene: `[__]` detik" (2–30 detik)

**Mode B:** Tabel input per scene, total durasi dihitung real-time.

**Tabel Lipsync — Sumber Kebenaran Tunggal:**

| Durasi Scene | Max Kata (ID) | Pace Label | Instruksi ke AI |
|-------------|---------------|------------|-----------------|
| 2–3 detik | 8 kata | `ultra_fast` | Narasi maks 8 kata, satu kalimat tunggal, tegas |
| 4–5 detik | 16 kata | `fast` | Narasi maks 16 kata, 1–2 kalimat pendek |
| 6–8 detik | 26 kata | `normal` | Narasi maks 26 kata, 2 kalimat |
| 9–12 detik | 44 kata | `medium` | Narasi maks 44 kata, 2–3 kalimat |
| 13–20 detik | 72 kata | `relaxed` | Narasi maks 72 kata, 3–4 kalimat |
| 21–30 detik | 108 kata | `slow_dramatic` | Narasi maks 108 kata, 4–5 kalimat |

#### 3.9 Format Rasio Video
**Tipe:** Dropdown (auto-suggest berdasarkan platform primer)

| Value | Label |
|-------|-------|
| `9:16` | 9:16 Vertikal ← Default TikTok/Reels |
| `16:9` | 16:9 Landscape |
| `1:1` | 1:1 Square |
| `4:5` | 4:5 Portrait |
| `3:4` | 3:4 Portrait |

#### 3.10 Bahasa Narasi
**Tipe:** Dropdown

| Value | Label | `script_narration` | `script_subtitle` |
|-------|-------|-------------------|-------------------|
| `id` | Bahasa Indonesia | Bahasa Indonesia | null |
| `en` | English | English | null |
| `id_en` | Bilingual — narasi ID, subtitle EN | Bahasa Indonesia | English |
| `en_id` | Bilingual — narasi EN, subtitle ID | English | Bahasa Indonesia |

---

### STEP 3: PARAMETER KREATIF

#### 3.11 Tipe Hook (Scene 1)
**Tipe:** Dropdown

| Value | Label | Mekanisme Psikologis |
|-------|-------|---------------------|
| `auto` | ✨ Auto — AI pilihkan terkuat | — |
| `shock_fact` | 😱 Shocking Fact | Cognitive disruption |
| `open_question` | ❓ Open Question | Curiosity gap |
| `bold_claim` | 🔥 Bold Claim | Challenge belief |
| `before_after_teaser` | ↔️ Before/After Teaser | Transformation desire |
| `pain_point_attack` | 💢 Pain Point Attack | Empathy + urgency |
| `secret_reveal` | 🤫 Secret / Forbidden Info | Curiosity + exclusivity |
| `pattern_interrupt` | ⚡ Pattern Interrupt | Attention hijack |
| `social_proof_number` | ⭐ Social Proof + Angka | Authority + FOMO |
| `controversy` | 🌶️ Controversial Take | Debate trigger |
| `fomo` | ⏰ FOMO / Urgency | Loss aversion |
| `story_in_progress` | 🎬 Story in Progress | Narrative pull |
| `visual_shock` | 👁️ Visual Shock — Tanpa narasi | Pure attention hijack |

#### 3.12 Call to Action (CTA — Scene Terakhir)
**Tipe:** Dropdown

| Value | Label |
|-------|-------|
| `auto` | ✨ Auto — AI pilihkan terkuat |
| `link_bio` | 🔗 Klik Link di Bio |
| `dm_whatsapp` | 💬 DM / Chat WA Sekarang |
| `comment_keyword` | 💬 Komen [KEYWORD] |
| `follow_more` | 👣 Follow untuk Konten Berikutnya |
| `share_tag_friend` | 📤 Share & Tag Teman |
| `visit_website` | 🌐 Kunjungi Website / Toko |
| `limited_urgency` | ⏳ Stok Terbatas / Waktu Terbatas |
| `free_trial_grab` | 🎁 Ambil Uji Coba Gratis |
| `save_for_later` | 🔖 Simpan Video Ini |
| `double_tap_agree` | ❤️ Double Tap Kalau Setuju |
| `klik_keranjang_kuning` | 🛒 Klik Keranjang Kuning |

**Jika `comment_keyword`:** Tampilkan sub-input "Masukkan keyword:" — nilai disimpan sebagai `cta_keyword`.

#### 3.13 Karakter dalam Video
**Tipe:** Radio button

- ○ **Tanpa Karakter** — Produk, B-roll, teks motion, animasi
- ○ **Gunakan Karakter** — Muncul sub-form

**Jika "Tanpa Karakter":**
Input opsional "Visual Anchor" — elemen visual yang harus konsisten di semua scene.
Contoh: "tangan model dengan nail art merah", "produk selalu pojok kanan bawah".

**Sub-form Karakter:**

| Field | Tipe | Pilihan |
|-------|------|---------|
| Jenis Kelamin | Radio | Pria / Wanita / Duo |
| Usia | Number (wajib) | 18–65 tahun |
| Ras / Etnik | Dropdown | Asia Tenggara · Asia Timur · Asia Selatan · Kaukasia · Afrika · Latin · Timur Tengah · Mixed |
| Style Penampilan | Dropdown | Kasual Modern · Profesional · Trendy/Streetwear · Tradisional · Sporty · Glamour |
| Ciri Fisik Khusus | Text (opsional) | "rambut pendek hitam", "berkacamata" |

**Spec Inject per Pilihan Jenis Kelamin:**

- **Pria:** `"[Usia]-year-old [Etnik] male, [Style appearance], [Ciri fisik]"`
- **Wanita:** `"[Usia]-year-old [Etnik] female, [Style appearance], [Ciri fisik]"`
- **Duo (Pria + Wanita):** Jika "Duo" dipilih, usia dan etnik berlaku untuk keduanya kecuali user mengisi ciri fisik yang membedakan. Inject sebagai:
  `"Duo characters: [Usia]-year-old [Etnik] male and [Usia]-year-old [Etnik] female, both in [Style appearance], [Ciri fisik]. Both characters MUST appear together in all scenes unless scene type requires solo shot."` — UI menampilkan hint: "Untuk Duo, ciri fisik bisa diisi dua deskripsi dipisah koma: 'pria rambut pendek, wanita hijab hitam'."

#### 3.14 Ekspresi & Emosi Karakter
**Tipe:** Dropdown *(aktif jika ada karakter)*

| Value | Label | Deskripsi untuk AI |
|-------|-------|-------------------|
| `auto` | ✨ Auto | Sesuaikan dengan niche dan hook |
| `excited_joyful` | 😄 Excited & Joyful | Bright eyes, wide smile, energetic gestures |
| `confident_authoritative` | 😎 Confident & Authoritative | Steady eye contact, controlled nod, power pose |
| `surprised_amazed` | 😮 Surprised & Amazed | Wide eyes, mouth slightly open, hands raised |
| `warm_friendly` | 🤗 Warm & Friendly | Soft smile, relaxed posture, welcoming gestures |
| `urgent_intense` | 😤 Urgent & Intense | Focused gaze, fast gestures, leaning forward |
| `empathetic_relatable` | 🥺 Empathetic & Relatable | Gentle expression, slight head tilt |
| `playful_humorous` | 😂 Playful & Humorous | Smirk, exaggerated reactions |
| `mysterious_dramatic` | 🎭 Mysterious & Dramatic | Subdued expression, slow deliberate movement |
| `curious_investigative` | 🤔 Curious & Investigative | Raised eyebrow, chin touch, scanning gesture |

#### 3.15 Gaya Visual / Sinematografi
**Tipe:** Dropdown

| Value | Label | Deskripsi Sinematografi untuk Prompt |
|-------|-------|--------------------------------------|
| `auto` | ✨ Auto | AI sesuaikan |
| `ugc_authentic` | 📱 UGC / Authentic | Shaky handheld, natural window light, no color grade, subtle film grain |
| `cinematic_film` | 🎬 Cinematic Film | Shallow depth of field, anamorphic flare, motivated key lighting |
| `minimalist_clean` | ⬜ Minimalist & Clean | Static tripod, overexposed whites, minimal shadow, negative space |
| `bold_colorful` | 🌈 Bold & Colorful | High saturation, complementary color blocking, wide lens |
| `dark_moody` | 🌑 Dark & Moody | Low-key lighting, strong rim light, deep shadows |
| `retro_vintage` | 📷 Retro / Vintage | 16mm grain, warm orange-teal grade, vignette, light leaks |
| `hyper_realistic` | 🔬 Hyper-Realistic | Ultra-sharp, studio three-point lighting, commercial ad quality |
| `motion_graphic` | ✨ Motion Graphic | Animated typography, flat design, vector graphic style |
| `split_screen` | 🔀 Split Screen | Hard vertical split, contrasting color grades |
| `pov_first_person` | 👁️ POV / First Person | Wide angle, slight lens distortion, eye-level immersive |
| `documentary` | 🎥 Documentary Style | Interview framing, natural ambient light, handheld zoom |
| `aesthetic_editorial` | 🖼️ Aesthetic / Editorial | Perfect composition, fashion lighting, deliberate art direction |

#### 3.16 Backsound / Musik
**Tipe:** Dropdown

| Value | Label | BPM Range |
|-------|-------|-----------|
| `auto` | ✨ Auto | — |
| `trending_tiktok` | 🔥 Trending TikTok Sound | 100–140 |
| `upbeat_energetic` | ⚡ Upbeat & Energetic | 120–150 |
| `cinematic_epic` | 🎬 Cinematic & Epic | 60–90 |
| `soft_emotional` | 💖 Soft & Emotional | 70–90 |
| `corporate_clean` | 👔 Corporate & Clean | 90–110 |
| `lofi_chill` | 🌙 Lo-Fi & Chill | 70–90 |
| `hip_hop_trap` | 🎤 Hip-Hop / Trap | 130–160 |
| `futuristic_tech` | 🤖 Futuristic / Tech | 110–130 |
| `nature_organic` | 🌿 Nature & Organic | 60–80 |
| `traditional_cultural` | 🎶 Tradisional / Kultural | varies |
| `no_music_ambient` | 🔇 Tanpa Musik / Ambient | — |

#### 3.17 Tone Narasi / Gaya Bahasa
**Tipe:** Dropdown

| Value | Label |
|-------|-------|
| `auto` | ✨ Auto |
| `conversational` | 💬 Kasual & Ngobrol |
| `authoritative` | 🏛️ Otoritatif & Expert |
| `storytelling` | 📖 Storytelling / Narasi |
| `hype_energy` | 🔥 Hype & Energik |
| `educational` | 📚 Edukatif & Informatif |
| `emotional_touching` | 💝 Emosional & Menyentuh |
| `humorous_witty` | 😄 Humor & Relatable |
| `luxury_premium` | 💎 Luxury / Premium |
| `scarcity_urgency` | ⏰ Kelangkaan & Urgensi |

#### 3.18 Advanced Settings *(Collapsible Panel — Opsional)*

| Field | Tipe | Instruksi yang Di-inject ke Prompt |
|-------|------|-------------------------------------|
| Kata kunci wajib muncul | Tags input | "Kata-kata berikut WAJIB muncul dalam narasi minimal sekali: [KEYWORDS]." |
| Kata yang harus dihindari | Tags input | "Kata-kata berikut DILARANG muncul di mana pun dalam narasi: [BLACKLIST]." |
| Reference style | Text input | "Gaya visual dan narasi mengacu pada: [REFERENCE]." |
| Subtitle style | Dropdown (None / Bold Caption / Minimal / Karaoke Style) | Gaya subtitle di semua scene |
| Text overlay | Toggle ON/OFF | Jika ON: sertakan saran teks overlay per scene |
| Brand color dominant | Color picker (hex) | Panduan palette warna dalam global_style |
| Warna yang dihindari | Color picker (hex) | Warna yang tidak boleh dipakai di kostum/background/elemen utama |

---

## 4. MODE SELECTOR & OUTPUT PANEL

Setelah user mengisi form dan klik **[⚡ Generate]**, sistem menampilkan **Mode Selector** terlebih dahulu jika belum dikonfigurasi. Jika sudah dikonfigurasi di `/settings`, langsung generate.

### 4.1 Mode Selector UI

```
┌─────────────────────────────────────────────────────────────┐
│  Pilih Mode Generate                                        │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐      │
│  │  ⚡ Direct API Mode   │  │  📋 Manual Prompt Mode │      │
│  │                       │  │                        │      │
│  │  App generate JSON    │  │  Kamu copy prompt,     │      │
│  │  otomatis via         │  │  paste ke ChatGPT /   │      │
│  │  Gemini/Groq API      │  │  Claude / Gemini       │      │
│  │                       │  │                        │      │
│  │  Butuh API key        │  │  Tidak butuh API key   │      │
│  │  (gratis)             │  │  Selalu tersedia       │      │
│  │                       │  │                        │      │
│  │  [Konfigurasi API]    │  │                        │      │
│  └───────────────────────┘  └───────────────────────┘      │
│                                                             │
│  [← Kembali ke Form]                                        │
└─────────────────────────────────────────────────────────────┘
```

Jika API key sudah tersimpan di `/settings`, Mode Selector langsung skip ke Direct API Mode dengan indikator "✅ API Terkonfigurasi — Gemini 2.5 Flash".

### 4.2 Output Panel — Direct API Mode

Setelah generate berhasil, Output Panel menampilkan:

**Header Panel:**
```
✅ Generate Selesai  |  [Digenerate via Gemini]  |  4 Scene  |  20 Detik  |  Viral Score: 82/100
[⎘ Copy Semua Prompt]  [↓ Download JSON]  [↓ Download ZIP Per Scene]
[🔄 Regenerate]  [✏️ Edit Parameter]
```

**Spec isi ZIP per scene (`Download ZIP Per Scene`):**
File ZIP berisi satu folder per scene dengan nama `scene_01_hook/`, `scene_02_body/`, dst. Isi setiap folder:
- `prompt.txt` — isi `ai_ready_prompt` siap paste ke AI video tool
- `narasi.txt` — isi `script_narration` + `script_subtitle` (jika bilingual)
- `brief.txt` — `visual_description` + `camera_direction` + `sound_design` + `transition_to_next`
- `reference_guide.txt` — panduan reference frame untuk tool yang dipilih

**Di bawah header: Scene Cards (ditampilkan vertikal, satu per satu)**

---

### 4.3 Spesifikasi Scene Card UI

Setiap scene ditampilkan sebagai card terpisah dengan layout berikut:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎣 SCENE 1 — HOOK        3 detik · ultra_fast · maks 8 kata    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📝 SCRIPT NARASI                                                │
│  "10.000 wanita sudah buktiin ini!"                             │
│  ✅ 6 kata — muat dalam 3 detik                                 │
│                                                                  │
│  [jika bilingual:]                                               │
│  🔤 SUBTITLE: "10,000 women have proven this!"                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  🎥 PROMPT VIDEO — Google Veo 3                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Extreme slow motion close-up of red running shoes on      │  │
│  │ outdoor pavement, woman's feet running then stopping      │  │
│  │ suddenly, bright natural sunlight, high saturation,       │  │
│  │ then hard cut to medium shot of Indonesian woman 25       │  │
│  │ years old, shoulder-length black hair, red and white      │  │
│  │ athletic outfit, turning directly to camera with          │  │
│  │ extremely excited wide smile...                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  [⎘ Copy Prompt Scene 1]          432 / 500 chars ✅            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  🎬 VISUAL BRIEF (Bahasa Indonesia)                              │
│  Extreme close-up kaki berlari di trotoar, slow motion 0.5x,    │
│  hard cut ke wajah karakter menatap kamera. Teks overlay         │
│  "10.000+ SUDAH BUKTIIN ✅" muncul di 1.5 detik.                │
│                                                                  │
│  📐 Kamera: Extreme close-up kaki (0–1.5s) → Medium shot       │
│             wajah (1.5–3s), handheld                            │
│  🔊 Audio:  Footstep → silence → music drop + whoosh           │
│  ➡️ Transisi: Hard cut + audio impact SFX → Scene 2            │
│  ⚡ Viral:   Shocking social proof + pattern interrupt           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  🔗 REFERENCE FRAME GUIDE                                        │
│  Scene pertama — tidak perlu referensi dari scene sebelumnya.   │
│  Setelah generate Scene 1: simpan frame terbaik sebagai         │
│  referensi untuk Scene 2.                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Tool: Google Veo 3                                        │  │
│  │ Cara menjaga konsistensi:                                 │  │
│  │ Veo 3 belum mendukung reference image. Konsistensi        │  │
│  │ dijaga melalui deskripsi karakter yang identik di setiap  │  │
│  │ prompt. Gunakan character_sheet yang sama persis.         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  📖 SCENE 2 — BODY        6 detik · normal · maks 26 kata       │
├─────────────────────────────────────────────────────────────────┤
│  ...                                                             │
│                                                                  │
│  🔗 REFERENCE FRAME GUIDE                                        │
│  Gunakan frame terbaik dari Scene 1 sebagai referensi.          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Tool: Kling AI 2.0                                        │  │
│  │ 1. Generate Scene 1, pilih frame terbaik                  │  │
│  │ 2. Download frame tersebut                                │  │
│  │ 3. Di Kling: klik "Image to Video"                        │  │
│  │ 4. Upload frame Scene 1 sebagai Start Frame               │  │
│  │ 5. Paste prompt Scene 2 di kolom teks                     │  │
│  │ 6. Generate → karakter dan suasana akan konsisten         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Warna badge scene type:**
- Hook 🎣 → `accent-warning` (amber)
- Body 📖 → `accent-secondary` (cyan)
- CTA 📣 → `accent-primary` (indigo)

---

### 4.4 Output Panel — Manual Prompt Mode

Tersusun dalam 4 tab (dipertahankan dari v3.0):

**Tab 1: 📋 Master Prompt**
- Textarea read-only berisi Master Prompt lengkap
- **[⎘ Copy Master Prompt]** dengan animasi ✓
- **[↓ Download .txt]**
- Info: *"Paste ke ChatGPT, Claude, atau Gemini. AI akan output JSON per scene."*
- Stats: estimasi token count · jumlah blok · jumlah scene · total durasi

**Tab 2: 🔍 Prompt Inspector**
Accordion per blok: Role · Context · Video Spec · Consistency Rules · JSON Schema.

**Tab 3: 🎬 Scene Brief**
Timeline visual proporsional per scene dengan card: nomor · tipe · durasi · max kata · pace.

**Tab 4: ✅ Paste & Validate**
- Textarea: "Paste hasil JSON dari AI di sini"
- **[✓ Validasi JSON]** — cek:
  - ✅ JSON valid
  - ✅ Auto-strip teks kotor di luar `{}`
  - ✅ Semua field wajib hadir
  - ✅ Jumlah scene sesuai
  - ✅ `ai_ready_prompt` hadir di setiap scene
  - ✅ `script_word_count` tidak melebihi `max_words`
  - ✅ Panjang `ai_ready_prompt` tidak melebihi batas karakter tool
  - ⚠️ Warning jika ada field kosong `""`
- Setelah validasi berhasil: **render Scene Cards** yang sama seperti Direct API Mode
- **[↓ Download JSON]** dan **[↓ Download ZIP Per Scene]**

---

## 5. DIRECT API INTEGRATION — SPESIFIKASI TEKNIS

### 5.1 Provider yang Didukung

| Provider | Model | Tier | Limit Gratis | CORS dari Browser | Kualitas JSON |
|----------|-------|------|-------------|-------------------|---------------|
| **Google Gemini** | `gemini-2.5-flash` | Free | 250 req/hari, 1M token/hari | ✅ Didukung langsung | ⭐⭐⭐⭐⭐ |
| **Groq** | `llama-3.3-70b-versatile` | Free | ~1000 req/hari | ✅ Didukung langsung | ⭐⭐⭐⭐ |
| **OpenRouter** | `deepseek/deepseek-r1` | Free (varies) | Varies per model | ✅ Didukung langsung | ⭐⭐⭐ |

> **Catatan CORS:** Ketiga provider mendukung CORS dari browser secara langsung — tidak membutuhkan proxy server atau backend. API call dari `localhost` atau domain yang terdaftar di allowlist provider berjalan normal. Ini adalah syarat penting mengapa ketiga provider ini dipilih di atas alternatif lain yang tidak mendukung browser-side call.

**Estimasi Token per Generate (panduan untuk user):**

| Jumlah Scene | Estimasi Token Input (Prompt) | Estimasi Token Output (JSON) | Total Estimasi |
|-------------|------------------------------|------------------------------|---------------|
| 2–4 scene | ~2.000 token | ~1.500 token | ~3.500 token |
| 5–8 scene | ~2.500 token | ~3.000 token | ~5.500 token |
| 9–12 scene | ~3.000 token | ~5.000 token | ~8.000 token |
| 13–20 scene | ~3.500 token | ~8.000 token | ~11.500 token |

> Dengan limit gratis Gemini 1.000.000 token/hari, user bisa melakukan sekitar **85 kali generate video 20-scene per hari** — lebih dari cukup untuk penggunaan personal intensif.

**Provider Primer:** Google Gemini 2.5 Flash
**Provider Fallback Otomatis:** Groq (jika Gemini quota habis atau error)
**Provider Manual Backup:** OpenRouter (dikonfigurasi manual di settings)

### 5.2 Cara Mendapatkan API Key (Gratis)

**Google Gemini API Key:**
1. Kunjungi `https://ai.google.dev`
2. Klik "Get API Key" → Sign in dengan Google account
3. Buat API key baru → Copy
4. Paste di ViralFrame `/settings` → API Configuration → Gemini API Key
5. Tidak perlu kartu kredit. Gratis selamanya dengan limit harian.

**Groq API Key (Backup):**
1. Kunjungi `https://console.groq.com`
2. Sign up gratis → Settings → API Keys → Create API Key
3. Paste di ViralFrame `/settings` → API Configuration → Groq API Key

### 5.3 Arsitektur API Call

```
ALUR DIRECT API MODE:

1. User klik [⚡ Generate]
   ↓
2. app compile Master Prompt dari form input
   (fungsi: masterPrompt.ts — compileMasterPrompt)
   ↓
3. app panggil Gemini API:
   POST https://generativelanguage.googleapis.com/v1beta/models/
        gemini-2.5-flash:generateContent?key={USER_API_KEY}
   Body: { contents: [{ parts: [{ text: masterPrompt }] }] }
   ↓
4. Response diterima → extract teks dari response
   ↓
5. Auto-strip: cari { pertama dan } terakhir
   → parse JSON
   ↓
6. Validasi JSON schema
   ↓
7. Render Scene Cards di Output Panel
   ↓
8. Jika step 3 gagal (quota/error) → retry 1x
   Jika retry gagal → fallback ke Groq API otomatis
   Jika Groq gagal → tampilkan error dengan saran Manual Mode
```

### 5.4 API Call Implementation Spec

```typescript
// apiClient.ts — spec implementasi

interface ApiConfig {
  provider: 'gemini' | 'groq' | 'openrouter';
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// CATATAN TEMPERATURE: Gunakan 0.3 (bukan 0.7) untuk semua provider.
// Temperature rendah menghasilkan JSON yang lebih deterministik dan terstruktur.
// Temperature tinggi (0.7+) berisiko menghasilkan format JSON acak atau tidak valid.

// CATATAN maxTokens: Gunakan 32768 untuk Gemini dan Groq.
// Untuk 20 scene, output JSON bisa mencapai ~8000 token.
// maxTokens: 8192 (nilai v4.0) tidak cukup untuk generate video dengan scene banyak.

const PROVIDER_CONFIGS = {
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    maxTokens: 32768,   // Cukup untuk 20 scene (est. ~8000 token output)
    temperature: 0.3,   // Rendah = JSON lebih konsisten dan valid
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 32768,
    temperature: 0.3,
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-r1',
    maxTokens: 32768,
    temperature: 0.3,
  }
};

// Retry + Fallback logic:
// - Timeout: 90 detik per request (dinaikkan dari 60s untuk scene banyak dan tool format panjang)
// - Retry: 1x jika timeout atau 5xx error
// - Fallback: otomatis ke provider berikutnya jika provider primer gagal 2x
// - Rate limit (429): tampilkan "Quota harian habis, beralih ke Groq otomatis"
// - Context length exceeded: tampilkan "Terlalu banyak scene. Kurangi jumlah scene atau durasi."
```

### 5.5 JSON Parse & Error Recovery

```typescript
// jsonParser.ts — spec implementasi

function parseAiResponse(rawText: string): VideoJSON | null {
  // Step 1: Coba parse langsung
  try {
    return JSON.parse(rawText);
  } catch {}

  // Step 2: Auto-strip — cari { pertama dan } terakhir
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(rawText.slice(start, end + 1));
    } catch {}
  }

  // Step 3: Gagal — return null, tampilkan error UI
  return null;
}

// Error states yang harus ditangani UI:
// - JSON_PARSE_ERROR: "AI tidak menghasilkan JSON yang valid. Coba regenerate."
// - MISSING_FIELDS: "JSON tidak lengkap. Field [X] tidak ditemukan."
// - SCENE_COUNT_MISMATCH: "Jumlah scene tidak sesuai. Diharapkan [N], dapat [M]."
// - API_KEY_INVALID: "API key tidak valid. Periksa konfigurasi di Settings."
// - QUOTA_EXCEEDED: "Quota harian habis. Beralih ke Groq atau coba besok."
// - NETWORK_ERROR: "Tidak dapat terhubung. Periksa koneksi internet."
// - TIMEOUT: "Request timeout (>60 detik). Coba regenerate atau kurangi jumlah scene."
// - CONTEXT_LENGTH: "Terlalu banyak scene untuk satu request. Kurangi jumlah scene menjadi ≤15."
```

### 5.6 Keamanan API Key

- API key disimpan di `localStorage` via Zustand persist (key: `viralframe-store`, partialize → settings)
- API key **tidak pernah** dikirim ke server manapun selain endpoint provider resmi (Google / Groq)
- API key **tidak pernah** dimasukkan ke dalam Master Prompt atau JSON
- UI menampilkan key sebagai masked: `AIzaSy...XXXXX` setelah disimpan
- Tombol **[Hapus API Key]** tersedia di `/settings`
- Catatan di UI: *"API key kamu disimpan hanya di browser ini dan tidak pernah meninggalkan perangkatmu."*

---

## 6. REFERENCE FRAME SYSTEM — KONSISTENSI VISUAL ANTAR SCENE

### 6.1 Dua Lapisan Konsistensi

```
LAPISAN 1 — TEKS/PROMPT (Dijamin 100% oleh ViralFrame):
Setiap ai_ready_prompt sudah mengandung deskripsi karakter identik
yang di-copy dari character_sheet. Warna, lighting, dan gaya visual
konsisten karena diinjeksikan dari global_style ke setiap scene.

LAPISAN 2 — VISUAL AKTUAL (Perlu teknik Reference Frame):
AI video tool generate setiap scene secara independen.
Tanpa teknik tambahan, karakter bisa berubah penampilan antar scene.
Reference Frame System memberi panduan step-by-step per tool
untuk meminimalkan mismatch ini.
```

### 6.2 Reference Frame Guide Per AI Video Tool

Panduan ini ditampilkan di dalam Scene Card setiap scene (kecuali Scene 1).

**Google Veo 3 (Tidak mendukung reference image):**
```
Konsistensi di Veo 3 dijaga melalui deskripsi teks yang identik.
Prompt setiap scene sudah menyertakan deskripsi karakter lengkap
dan identik. Generate semua scene dengan prompt yang disediakan.
Jika ada mismatch minor, Veo 3 cenderung konsisten dalam satu sesi.
```

**Kling AI 2.0 (✅ Mendukung reference image):**
```
1. Generate Scene [N-1] terlebih dahulu
2. Pilih frame terbaik → klik "..." → "Save Frame"
3. Di halaman baru: klik "Image to Video"
4. Upload frame Scene [N-1] sebagai "Start Frame"
5. Paste prompt Scene [N] di kolom teks
6. Set durasi sesuai: [X] detik
7. Klik Generate
Hasil: karakter dan suasana akan menyambung dari scene sebelumnya.
```

**Runway Gen-4 (✅ Mendukung reference image):**
```
1. Generate Scene [N-1], download hasilnya
2. Di Runway: pilih "Gen-4" → klik "Reference Image"
3. Upload frame dari Scene [N-1]
4. Paste prompt Scene [N] di kolom teks
5. Generate
Catatan: Runway mendukung multiple reference images.
Upload juga character_sheet image jika tersedia untuk
konsistensi karakter yang lebih kuat.
```

**Luma Dream Machine (✅ Mendukung reference image):**
```
1. Generate Scene [N-1], ambil frame terakhirnya
2. Di Luma: klik "Keyframe" atau "Image to Video"
3. Upload frame Scene [N-1] sebagai "Start Frame"
4. Paste prompt Scene [N]
5. Generate
```

**Minimax / Hailuo (✅ Mendukung reference image):**
```
1. Generate Scene [N-1], simpan frame terakhir
2. Di Minimax: pilih "Subject Reference" atau "Image to Video"
3. Upload frame sebagai referensi
4. Paste prompt Scene [N]
5. Generate
```

**Pika Labs 2.0 (✅ Mendukung reference image):**
```
1. Generate Scene [N-1], download frame terbaik
2. Di Pika: klik "+" → "Upload Image"
3. Upload frame Scene [N-1]
4. Paste prompt Scene [N] di kolom teks
5. Generate
```

**OpenAI Sora (Tidak mendukung reference image):**
```
Konsistensi di Sora dijaga melalui deskripsi teks yang sangat detail.
Prompt setiap scene sudah menyertakan deskripsi karakter lengkap.
Sora cenderung konsisten dengan deskripsi yang spesifik.
Gunakan prompt yang panjang dan detail untuk hasil terbaik.
```

**Wan 2.1 (✅ Mendukung reference image):**
```
1. Generate Scene [N-1], simpan frame terbaik
2. Di Wan: pilih mode "Image to Video"
3. Upload frame Scene [N-1]
4. Paste prompt Scene [N]
5. Generate
```

**CogVideoX (Tidak mendukung reference image):**
```
Konsistensi dijaga melalui deskripsi teks identik.
Prompt setiap scene sudah lengkap. Generate sesuai urutan.
```

**Bytedance Jianying (✅ Mendukung reference image):**
```
1. Generate Scene [N-1] di Jianying, simpan frame
2. Pilih "AI Video" → "Image/Video to Video"
3. Upload frame Scene [N-1]
4. Masukkan prompt Scene [N]
5. Generate
```

### 6.3 Character Consistency Score

Di setiap Scene Card, sistem menampilkan **Character Consistency Score** — indikator visual seberapa lengkap deskripsi karakter yang diinjeksikan:

```
🧍 Konsistensi Karakter: ████████░░ 80%
✅ Jenis kelamin     ✅ Usia        ✅ Etnik
✅ Style pakaian     ✅ Ciri fisik  ⚠️ Ekspresi (auto)
```

Semakin lengkap sub-form karakter diisi, semakin tinggi score-nya dan semakin konsisten hasil antar scene.

---

## 7. MASTER PROMPT — ARSITEKTUR & TEMPLATE

### 7.1 Struktur (5 Blok)

```
BLOK 1: ROLE DECLARATION     → 4 peran AI sekaligus
BLOK 2: CONTEXT INJECTION    → Data produk + psikografis + pain point
BLOK 3: VIDEO SPECIFICATION  → Scene, durasi, lipsync, karakter, style
BLOK 4: CONSISTENCY RULES    → Viral checklist + aturan konsistensi
BLOK 5: OUTPUT SCHEMA        → JSON schema + viral score formula + guardrail
```

### 7.2 Template Master Prompt (Production-Ready)

```
=== VIRALFRAME MASTER PROMPT v4.1 ===
INSTRUKSI KRITIS: Baca seluruh prompt ini sebelum mulai bekerja.
Output kamu HANYA berupa JSON murni. Tidak ada teks sebelum JSON.
Tidak ada teks setelah JSON. Tidak ada penjelasan. Tidak ada markdown
wrapper seperti ```json. Mulai dengan { dan akhiri dengan }.

---

[BLOK 1: IDENTITAS DAN PERANMU]

Kamu adalah satu entitas yang menjalankan 4 keahlian secara bersamaan:

PERAN 1 — ALGORITMA MEDIA SOSIAL (2025):
Platform target: {{PLATFORM_LIST}}
Kamu memahami: watch time optimization, early engagement signals,
retention hooks setiap 2–3 detik, pattern interrupt, emotional
resonance, dan platform-specific behavior.
Platform behavior khusus: {{PLATFORM_BEHAVIOR_NOTE}}

PERAN 2 — CREATIVE DIRECTOR & VIDEO DIRECTOR:
Merancang setiap scene dengan presisi sinematik: komposisi shot,
pergerakan kamera, pencahayaan, transisi, dan kontinuitas visual.

PERAN 3 — DIRECT RESPONSE COPYWRITER:
Menulis narasi berbasis AIDA + psikologi persuasi: social proof,
scarcity, authority, reciprocity, commitment. Setiap kata dipilih
dengan tujuan.

PERAN 4 — AI VIDEO PROMPT ENGINEER untuk {{AI_VIDEO_TOOL}}:
Menulis `ai_ready_prompt` dalam format yang optimal untuk
{{AI_VIDEO_TOOL}}. Batas karakter: {{AI_TOOL_CHAR_LIMIT}} per scene.
Format: {{AI_TOOL_FORMAT_SPEC}}
KRITIS: ai_ready_prompt HANYA berisi deskripsi scene, BUKAN instruksi meta atau klaim pemasaran.
AUDIO/DIALOG: Setelah deskripsi scene selesai, tambahkan SATU baris di akhir: [DIALOGUE: {{BAHASA_NARASI}}]
Contoh: "...[MOOD: confident]. [10s, 9:16 vertical frame]. [DIALOGUE: Bahasa Indonesia]"
Field ai_ready_prompt TIDAK BOLEH kosong — ini field WAJIB di setiap scene.

---

[BLOK 2: KONTEKS BISNIS DAN PRODUK]

NICHE: {{JENIS_BISNIS}}
PRODUK/LAYANAN: {{DESKRIPSI_PRODUK}}
USP: "{{USP}}" → Tegaskan minimal 2x dalam video.
TARGET AUDIENS: {{TARGET_AUDIENS_LIST}}
PSIKOGRAFIS: {{TARGET_PSIKOGRAFIS}}
PAIN POINT: {{PAIN_POINT}}
PLATFORM PRIMER: {{PLATFORM_PRIMER}}
BAHASA: {{BAHASA}}

{{JIKA_BILINGUAL: script_narration dalam {{BAHASA_NARASI}},
script_subtitle dalam {{BAHASA_SUBTITLE}}}}
{{JIKA_KEYWORDS: KATA KUNCI WAJIB: {{KEYWORDS}}}}
{{JIKA_BLACKLIST: KATA DILARANG: {{BLACKLIST}}}}
{{JIKA_REFERENCE: GAYA REFERENSI: {{REFERENCE}}}}

---

[BLOK 3: SPESIFIKASI VIDEO]

AI TOOL: {{AI_VIDEO_TOOL}} | RASIO: {{RASIO}} | TOTAL SCENE: {{JUMLAH_SCENE}}
STRUKTUR: Scene 1 = Hook ({{HOOK_TYPE}}) · Scene 2–{{N-1}} = Body · Scene {{N}} = CTA ({{CTA_TYPE}})
{{JIKA_CTA_KEYWORD: CTA Keyword: "{{CTA_KEYWORD}}"}}

LIPSYNC PER SCENE:
{{GENERATED_SCENE_DURATION_TABLE}}

KARAKTER:
{{JIKA_TANPA_KARAKTER: Tidak ada karakter. Visual anchor: {{VISUAL_ANCHOR}}}}
{{JIKA_ADA_KARAKTER:
Deskripsi WAJIB IDENTIK di semua scene:
Gender: {{GENDER}} | Usia: {{USIA}} th | Etnik: {{ETNIK}}
Style: {{STYLE}} | Ciri: {{CIRI_FISIK}} | Ekspresi: {{EKSPRESI}} — {{EKSPRESI_DESC}}
PERINGATAN: Penampilan IDENTIK di semua scene tanpa pengecualian.}}

GAYA VISUAL: {{GAYA_VISUAL}} — {{CINEMATOGRAPHY_DETAIL}}
BACKSOUND: {{BACKSOUND}} ({{BPM}} BPM, mood: {{MOOD}})
TONE: {{TONE_NARASI}}
{{JIKA_BRAND_COLOR: Brand color: {{BRAND_COLOR_HEX}}}}
{{JIKA_AVOID_COLOR: Hindari warna: {{AVOID_COLOR_HEX}}}}
{{JIKA_SUBTITLE: Subtitle style: {{SUBTITLE_STYLE}}}}
{{JIKA_TEXT_OVERLAY: Sertakan text overlay per scene}}

---

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

KONSISTENSI WAJIB:
- Color temperature identik semua scene
- Karakter identik (penampilan tidak berubah)
- Satu voice narasi, USP ditegaskan 2x
- Musik satu tema, SFX satu palet mood
- Eskalasi: Hook (pancing) → Body (bangun) → CTA (ledakkan)
- Transisi: whip pan / zoom punch / hard cut + audio cue

POLICY COMPLIANCE — WAJIB untuk Google Flow & Veo3:
FORBIDDEN PATTERNS — JANGAN pernah gunakan:
✗ Klaim absolut: "terbaik", "nomor 1", "jamin 100%", "dijamin", "pasti"
✗ Klaim medis/kesehatan: "sembuh total", "menyembuhkan", "terbukti klinis"
✗ Before/After transformasi hasil fisik/kesehatan
✗ Testimonial fiktif yang terlihat seperti nyata
✗ Klaim performa tanpa bukti: "meningkatkan X dalam Y hari"

WAJIB rewrite klaim jadi observasi netral:
- BUKAN: "Krim ini menghilangkan kerutan dalam 3 hari"
- TAPI: "Krim ini diformulasikan untuk merawat kulit"

---

[BLOK 5: OUTPUT JSON SCHEMA + VIRAL SCORE FORMULA + GUARDRAIL]

VIRAL SCORE FORMULA:
Setiap elemen viral diimplementasikan = +10 poin (maks +80)
Hook kekuatan = 0–10 poin
CTA kejelasan = 0–10 poin
Konsistensi keseluruhan = 0–10 poin
Normalisasi ke /100. Laporkan: "XX/100 — justifikasi 1 kalimat."

OUTPUT JSON SCHEMA:
{
  "video_metadata": {
    "title": "string SEO-friendly",
    "niche": "{{JENIS_BISNIS}}",
    "platform_primary": "{{PLATFORM_PRIMER}}",
    "platform_all": ["array"],
    "ai_video_tool": "{{AI_VIDEO_TOOL}}",
    "total_scenes": number,
    "total_duration_seconds": number,
    "ratio": "{{RASIO}}",
    "language": "{{BAHASA}}",
    "viral_elements_used": ["array min 4"],
    "viral_score_estimate": "XX/100 — justifikasi",
    "hook_type": "{{HOOK_TYPE}}",
    "cta_type": "{{CTA_TYPE}}",
    "cta_keyword": "string atau null"
  },
  "global_style": {
    "visual_style": "string",
    "cinematography_detail": "string teknis",
    "color_palette_dominant": ["#hex", "#hex", "#hex"],
    "color_palette_accent": ["#hex"],
    "lighting_style": "string",
    "camera_style_global": "string",
    "music_direction": "string dengan BPM dan mood",
    "sfx_palette": "string",
    "overall_emotional_arc": "Hook: X → Body: Y → CTA: Z",
    "subtitle_style": "string atau none",
    "font_overlay_style": "string"
  },
  "character_sheet": {
    "used": boolean,
    "description": "satu paragraf — INILAH yang di-paste ke AI video tool",
    "visual_anchor_note": "string atau null",
    "consistency_note": "instruksi untuk editor video"
  },
  "scenes": [
    {
      "scene_number": number,
      "scene_type": "hook|body|cta",
      "duration_seconds": number,
      "max_words": number,
      "speech_pace": "ultra_fast|fast|normal|medium|relaxed|slow_dramatic",
      "ai_ready_prompt": "WAJIB DIISI, string, max {{AI_TOOL_CHAR_LIMIT}} chars. Format: [CHARACTER ANCHOR] [SCENE] [CAMERA] [ENVIRONMENT] [MOOD] [durasi+rasio] [DIALOGUE: bahasa_narasi]",
      "script_narration": "string MAKS max_words kata",
      "script_subtitle": "string atau null",
      "script_word_count": number,
      "script_fit_confirmation": "X kata, muat Y detik pace Z",
      "visual_description": "string Bahasa Indonesia",
      "camera_direction": "shot + movement + angle",
      "character_action": "string",
      "character_expression": "string",
      "text_overlay": "string dengan timing, atau none",
      "sound_design": "string",
      "transition_to_next": "string atau end",
      "viral_element_in_scene": "string",
      "cliffhanger_to_next": "string atau CTA release"
    }
  ],
  "production_notes": {
    "caption_variations": [
      {
        "caption_text": "1 kalimat caption pembuka yang menarik dan unik",
        "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
      }
    ],
    "lipsync_summary": "ringkasan pace per scene",
    "editing_sequence": "Scene 1 [transisi] → Scene 2 → dst",
    "color_grade_lut": "rekomendasi LUT",
    "thumbnail_concept": "deskripsi thumbnail optimal",
    "posting_time_suggestion": "string",
    "ab_test_suggestion": "variasi hook alternatif"
  }
}

GUARDRAIL: Output JSON murni. Mulai {. Akhiri }. Tidak ada teks lain.
=== END OF VIRALFRAME MASTER PROMPT v4.1 ===
```

### 7.3 Platform Behavior Notes

| Platform | Behavior Note |
|----------|---------------|
| `tiktok` | "Re-watch signal krusial. Detik 0–1 harus ada gerakan mengejutkan. Buat ending yang membuat penonton kembali ke awal. Durasi 15–30 detik terbaik untuk akun baru." |
| `instagram_reels` | "Save dan share lebih penting dari like. Buat konten 'worth saving'. Aesthetic visual lebih diperhatikan. Caption panjang informatif didukung algoritma." |
| `youtube_shorts` | "Watch time dan subscription conversion adalah prioritas. Hook detik pertama adalah segalanya — thumbnail tidak terlihat di Shorts." |
| `facebook_reels` | "Audiens 30+ lebih dominan. Tone lebih formal dari TikTok. Social proof dan testimonial sangat efektif. Durasi 30–60 detik lebih optimal." |
| `xiaohongshu` | "Konten lifestyle aspirasional dan detail sangat disukai. Aesthetic visual sangat penting. Caption dengan tips konkret performa terbaik." |

### 7.4 AI Tool Format Spec

| Tool | Format Spec | Char Limit | Ref Image |
|------|-------------|------------|-----------|
| `google_flow` | "Natural descriptive prompt in English: [Scene setting]. [Character appearance + action]. [Camera angle + movement]. [Lighting]. [Mood]. Wajib policy-safe: gunakan bahasa netral, hindari klaim absolut, medis, atau testimonial. Hanya deskripsi visual." | 500 | ✅ |
| `veo3` | "Mulai dengan CHARACTER ANCHOR. English only. Policy-safe: hanya deskripsi visual netral." | 500 | ❌ |
| `kling_ai` | "Subject description. Action/motion. Camera movement (smooth pan/zoom in/tracking/static). Environment. Lighting. Style/mood. English." | 400 | ✅ |
| `minimax_hailuo` | "'Character: [desc]. Action: [desc]. Scene: [desc]. Mood: [desc].' English." | 350 | ✅ |
| `runway_gen4` | "Action-first. Camera keyword (dolly in/pan left/static/handheld). Environment. Style. [X]s. English." | 300 | ✅ |
| `luma_dream` | "One cinematic sentence + style tags. '[Descriptive sentence], [mood], [lighting], [camera style], [X]s.' English." | 300 | ✅ |
| `pika_labs` | "Short: '[Subject] [action] [environment]. [Camera]. [Mood]. [X]s.' Concise. English." | 250 | ✅ |
| `sora` | "Rich detailed description: character + action + environment + camera + lighting + mood. Longer is better. English." | 600 | ❌ |
| `bytedance_jianying` | "'[Scene setting]. [Character description]. [Action]. [Shot direction]. [Mood].' English or Chinese." | 400 | ✅ |
| `wan21` | "'[Scene type]. [Subject physical description]. [Action]. [Camera angle+movement]. [Atmosphere]. [Style].' English or Chinese." | 400 | ✅ |
| `cogvideox` | "'[Scene context]. [Subject behavior]. [Visual mood]. [Camera perspective]. [Duration hint].' English." | 350 | ❌ |

### 7.5 Lookup Table: Psikografis & Pain Point Per Niche

| Niche | Psikografis | Pain Point |
|-------|-------------|------------|
| `affiliate_product` | Konsumen aktif cari rekomendasi online, dipengaruhi social proof | Takut beli produk tidak sesuai ekspektasi, tidak tahu mana yang worth it |
| `real_estate` | Calon pembeli dalam fase riset, butuh keyakinan sebelum keputusan besar | Takut salah investasi, proses beli properti terasa rumit dan menakutkan |
| `web_builder` | Pemilik bisnis kecil, tidak punya skill teknis, butuh solusi cepat | Website mahal dan ribet, tidak tahu mulai dari mana, takut ditipu vendor |
| `fashion_beauty` | Peduli penampilan, sering cari inspirasi di sosmed, FOMO tren | Sulit menemukan yang cocok dengan jenis kulit/tubuh, terlalu banyak pilihan |
| `food_beverage` | Penikmat kuliner, suka berbagi pengalaman, cari tempat/produk baru | Bosan pilihan itu-itu saja, takut rasa tidak sesuai foto, khawatir antre |
| `education_course` | Ingin naik level skill, termotivasi tapi mudah overwhelmed | Tidak tahu harus belajar dari mana, beli kursus tapi tidak selesai |
| `health_wellness` | Sadar kesehatan, pernah coba berbagai solusi tapi belum konsisten | Susah konsisten, tidak tahu program mana efektif, takut efek samping |
| `travel_tourism` | Wisatawan yang cari pengalaman baru, sering riset destinasi | Takut destinasi tidak sesuai ekspektasi, khawatir budget membengkak |
| `finance_investment` | Ingin mulai/tingkatkan investasi, anxiety terhadap masa depan finansial | Takut salah langkah dan rugi, tidak paham instrumen investasi |
| `saas_app` | Profesional butuh tools efisiensi, tech-savvy tapi sibuk | Tools terlalu kompleks atau mahal, ROI tidak jelas, integrasi susah |
| `personal_brand` | Kreator ingin bangun otoritas online, ingin dikenal di niche-nya | Tidak tahu cara menonjol, engagement rendah, tidak konsisten posting |
| `dropship_ecommerce` | Penjual online ingin tingkatkan konversi, bersaing di marketplace | Iklan mahal tapi konversi rendah, susah bedain dari kompetitor |
| `local_service` | Pemilik usaha lokal ingin jangkau lebih banyak pelanggan | Kalah bersaing dengan bisnis besar, tidak punya anggaran marketing |
| `event_organizer` | Penyelenggara event butuh promosi cepat, deadline mendekat | Susah jual tiket, konten promosi membosankan, visibilitas rendah |

---

## 8. HALAMAN /settings — SPESIFIKASI LENGKAP

Halaman settings dibagi dalam beberapa seksi:

### 8.1 Seksi: API Configuration *(Baru di v4.0)*

```
┌─────────────────────────────────────────────────────────────┐
│  🔑 API Configuration                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Google Gemini API Key (Direkomendasikan — Gratis)           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ AIzaSy••••••••••••••••••••••••••••••XXXXX              │  │
│  └────────────────────────────────────────────────────────┘  │
│  [Test Koneksi]  [Hapus Key]                                 │
│                                                              │
│  Status: ✅ Terhubung — Gemini 2.5 Flash                    │
│  Cara mendapatkan key gratis: [📖 Panduan]                  │
│                                                              │
│  ──────────────────────────────────────────────────────     │
│                                                              │
│  Groq API Key (Backup Otomatis)                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ gsk_••••••••••••••••••••••••••••••XXXXX                │  │
│  └────────────────────────────────────────────────────────┘  │
│  [Test Koneksi]  [Hapus Key]                                 │
│                                                              │
│  Status: ✅ Terhubung — Llama 3.3 70B                       │
│  Auto-fallback: ✅ Aktif (digunakan jika Gemini gagal)       │
│                                                              │
│  ──────────────────────────────────────────────────────     │
│                                                              │
│  ℹ️  API key kamu disimpan hanya di browser ini.            │
│     Tidak pernah dikirim ke server ViralFrame.              │
│     Hanya dikirim langsung ke Google/Groq saat generate.    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Seksi: Preferensi Default

| Field | Tipe | Keterangan |
|-------|------|------------|
| Default AI Video Tool | Dropdown | Pre-select di form setiap kali buka app |
| Default Platform | Dropdown | Pre-select platform primer |
| Default Bahasa | Dropdown | Pre-select bahasa narasi |
| Default Mode | Radio | Direct API / Manual Prompt |
| Tema UI | Toggle | Dark mode / Light mode |

### 8.3 Seksi: Data & Privacy

- **[Hapus Semua History]** — dengan konfirmasi dialog
- **[Export Semua History (.json)]** — backup data generate
- **[Hapus Semua API Key]** — hapus semua key tersimpan
- **[Reset Semua Settings]** — kembali ke default

---

## 9. VALIDASI FORM

| Field | Kondisi | Tipe | Pesan |
|-------|---------|------|-------|
| Deskripsi Produk | < 30 karakter | Error | "Deskripsi terlalu singkat. Tambahkan detail produk." |
| Jumlah Scene | < 2 | Error | "Minimal 2 scene (Hook + CTA)." |
| Jumlah Scene | > 20 | Error | "Maksimal 20 scene." |
| Durasi Per Scene | < 2 detik | Error | "Durasi minimal 2 detik per scene." |
| Durasi Per Scene | > 30 detik | Error | "Durasi maksimal 30 detik. Pertimbangkan bagi jadi 2 scene." |
| Scene 1 (Hook) | > 8 detik | Warning | "Hook lebih dari 8 detik berisiko kehilangan penonton. Disarankan 3–5 detik." |
| Total durasi | > 180 detik | Warning | "Total lebih dari 3 menit. Pertimbangkan kurangi scene untuk performa optimal." |
| Platform | Tidak ada dipilih | Error | "Pilih minimal 1 platform distribusi." |
| AI Tool | Tidak dipilih | Error | "Pilih AI video generator yang akan kamu gunakan." |
| Karakter aktif, usia kosong | — | Error | "Masukkan usia karakter." |
| CTA = comment_keyword | Keyword kosong | Error | "Masukkan keyword untuk CTA ini." |
| Direct API Mode, tidak ada API key | — | Warning | "API key belum dikonfigurasi. Konfigurasi di Settings atau gunakan Manual Prompt Mode." |

---

## 10. CONTOH OUTPUT JSON LENGKAP

Contoh output yang dihasilkan AI setelah menerima Master Prompt. Kasus: Affiliate RunFast Pro · 4 scene · Veo3 · TikTok · Hook shocking fact · CTA link bio · Karakter wanita 25 th Asia Tenggara.

> Semua `max_words` dan `script_word_count` mengacu pada tabel lipsync Seksi 3.8 sebagai sumber tunggal kebenaran.

```json
{
  "video_metadata": {
    "title": "RunFast Pro — Shocking Fact Hook — TikTok Affiliate 20s",
    "niche": "affiliate_product",
    "platform_primary": "tiktok",
    "platform_all": ["tiktok"],
    "ai_video_tool": "veo3",
    "total_scenes": 4,
    "total_duration_seconds": 20,
    "ratio": "9:16",
    "language": "id",
    "viral_elements_used": ["shocking_fact", "social_proof", "cliffhanger", "sensory_language", "fomo"],
    "viral_score_estimate": "82/100 — 5 elemen viral (+50), hook angka spesifik (+8), CTA urgency eksplisit (+9), konsistensi karakter dan narasi kuat (+15).",
    "hook_type": "shock_fact",
    "cta_type": "link_bio",
    "cta_keyword": null
  },
  "global_style": {
    "visual_style": "UGC Authentic dengan energi sporty — terasa seperti rekomendasi teman",
    "cinematography_detail": "Shaky handheld, natural daylight, subtle film grain, no heavy color grade, slight motion blur pada gerakan cepat",
    "color_palette_dominant": ["#E53E3E", "#FFFFFF", "#1A1A1A"],
    "color_palette_accent": ["#FF8C00"],
    "lighting_style": "Bright natural daylight, golden hour warmth, no harsh shadows",
    "camera_style_global": "Mostly handheld with subtle shake, quick zooms for emphasis, eye-level",
    "music_direction": "Upbeat energetic, 128 BPM, drops at scene transitions, crescendo di scene 3 menuju 4",
    "sfx_palette": "Whoosh untuk transisi, footstep sound untuk autentisitas, subtle impact SFX di hook",
    "overall_emotional_arc": "Hook: Shock & Curiosity → Body: Empathy & Desire → CTA: FOMO & Urgency",
    "subtitle_style": "none",
    "font_overlay_style": "Bold white caption, black stroke 2px, bottom-center, pop-in animation per kata kunci"
  },
  "character_sheet": {
    "used": true,
    "description": "Indonesian woman, 25 years old, Southeast Asian features, shoulder-length black hair, wearing red and white athletic outfit, RunFast Pro red running shoes, bright excited expression, energetic and confident posture.",
    "visual_anchor_note": null,
    "consistency_note": "EDITOR: Karakter identik di semua scene — outfit merah-putih, sepatu merah RunFast Pro, rambut sebahu hitam, tidak ada variasi."
  },
  "scenes": [
    {
      "scene_number": 1,
      "scene_type": "hook",
      "duration_seconds": 3,
      "max_words": 8,
      "speech_pace": "ultra_fast",
      "script_narration": "10.000 wanita sudah buktiin ini!",
      "script_subtitle": null,
      "script_word_count": 6,
      "script_fit_confirmation": "6 kata, muat dalam 3 detik pace ultra_fast — aman",
      "visual_description": "Extreme close-up kaki berlari di trotoar outdoor, sepatu merah terlihat jelas, slow motion 0.5x selama 1.5 detik, lalu hard cut ke wajah karakter yang langsung menatap kamera dengan ekspresi excited",
      "camera_direction": "Extreme close-up kaki (0–1.5s, slow mo) → hard cut ke medium shot wajah (1.5–3s, handheld)",
      "character_action": "Berlari, berhenti tiba-tiba, menoleh ke kamera dengan senyum besar",
      "character_expression": "Highly excited, wide bright smile, eyes wide open, energetic body language",
      "text_overlay": "'10.000+ SUDAH BUKTIIN ✅' — bold putih, muncul di 1.5s, bottom center",
      "sound_design": "Footstep audio → sudden silence → music drop + whoosh saat hard cut",
      "transition_to_next": "Hard cut dengan audio impact SFX",
      "viral_element_in_scene": "Shocking social proof number + pattern interrupt (slow mo → hard cut)",
      "cliffhanger_to_next": "Penonton bertanya: 'Buktiin apa? Aku harus tahu.'",
      "ai_ready_prompt": "Extreme slow motion close-up of red running shoes on outdoor pavement, woman's feet running then stopping suddenly, bright natural sunlight, high saturation, then hard cut to medium shot of Indonesian woman 25 years old, shoulder-length black hair, red and white athletic outfit, turning directly to camera with extremely excited wide smile and bright eyes, handheld camera subtle shake, 3s, 9:16 vertical frame"
    },
    {
      "scene_number": 2,
      "scene_type": "body",
      "duration_seconds": 6,
      "max_words": 26,
      "speech_pace": "normal",
      "script_narration": "Dulu kakiku gampang pegal dan sering terpeleset. Sejak pakai RunFast Pro, semua berubah total!",
      "script_subtitle": null,
      "script_word_count": 16,
      "script_fit_confirmation": "16 kata, muat dalam 6 detik pace normal — aman",
      "visual_description": "Split screen: kiri = flashback suram (kaki terpeleset, desaturated), kanan = kini (berlari mulus, bright color). 3 detik split screen, lalu 3 detik full screen wajah karakter mengangguk puas sambil tunjuk sepatu",
      "camera_direction": "Split screen static (0–3s) → cut ke medium shot wajah, slight zoom in (3–6s)",
      "character_action": "Kiri: akting terpeleset dramatis. Kanan: berlari ringan penuh keyakinan. Lalu: mengangguk sambil tunjuk sepatu",
      "character_expression": "Kiri: dramatic pain face. Kanan & lanjutan: warm satisfied smile",
      "text_overlay": "'SEBELUM vs SESUDAH' di split screen | 'Semua berubah!' bold di 4s",
      "sound_design": "Kiri: minor key muffled + stumble SFX | Kanan: music brightens + upbeat SFX",
      "transition_to_next": "Zoom punch ke sepatu → cut ke scene 3",
      "viral_element_in_scene": "Before/after emotional contrast + sensory pain-to-pleasure arc",
      "cliffhanger_to_next": "Penonton bertanya: 'Apa rahasianya? Kenapa bisa berubah?'",
      "ai_ready_prompt": "Split screen video, left side desaturated showing Indonesian woman 25 years old stumbling and looking pained, right side vibrant showing same woman running confidently with bright smile, both in red white athletic outfit red RunFast Pro shoes, then cut to medium shot of her nodding proudly pointing to shoes with warm satisfied smile, handheld camera, bright natural daylight, 6s, 9:16 vertical frame"
    },
    {
      "scene_number": 3,
      "scene_type": "body",
      "duration_seconds": 6,
      "max_words": 26,
      "speech_pace": "normal",
      "script_narration": "RunFast Pro — sol anti-licin SNI, super ringan, dan ada 8 pilihan warna cantik!",
      "script_subtitle": null,
      "script_word_count": 15,
      "script_fit_confirmation": "15 kata, muat dalam 6 detik pace normal — aman",
      "visual_description": "Product showcase: tangan karakter memegang sepatu, memutar memperlihatkan sol (close-up 2s), montage cepat 8 warna sepatu (3s), karakter mengangguk puas (1s)",
      "camera_direction": "Close-up sol (0–2s) → quick cut montage warna (2–5s) → medium shot karakter (5–6s)",
      "character_action": "Pegang sepatu, tunjuk sol, gesture excited melihat varian warna",
      "character_expression": "Excited and proud, pointing, eyes wide open",
      "text_overlay": "'✅ Anti-licin SNI | ✅ Super Ringan | ✅ 8 Warna' muncul satu per satu",
      "sound_design": "Upbeat music full, quick whoosh SFX setiap ganti warna",
      "transition_to_next": "Whip pan ke kanan → scene 4",
      "viral_element_in_scene": "Authority (sertifikasi SNI) + product FOMO (8 warna)",
      "cliffhanger_to_next": "Penonton bertanya: 'Aku mau warna apa? Di mana beli?'",
      "ai_ready_prompt": "Close-up of red running shoe being held and rotated to show anti-slip sole detail, Indonesian woman 25 years old red white athletic outfit, then quick cut montage showing 8 different color variants of the same shoe on clean background, then back to medium shot of woman nodding excitedly giving thumbs up, bright natural lighting, dynamic handheld energy, 6s, 9:16 vertical frame"
    },
    {
      "scene_number": 4,
      "scene_type": "cta",
      "duration_seconds": 5,
      "max_words": 16,
      "speech_pace": "fast",
      "script_narration": "Klik link di bio sekarang! Stok terbatas — jangan sampai kehabisan!",
      "script_subtitle": null,
      "script_word_count": 11,
      "script_fit_confirmation": "11 kata, muat dalam 5 detik pace fast — aman",
      "visual_description": "Karakter berjalan maju ke kamera secara dramatis, berhenti di medium close-up, jari menunjuk langsung ke penonton, ekspresi urgent dan excited, background bokeh outdoor",
      "camera_direction": "Tracking shot maju (0–2.5s, kamera mundur saat karakter maju) → static medium close-up (2.5–5s)",
      "character_action": "Berjalan cepat ke kamera, berhenti dekat, tunjuk langsung ke penonton",
      "character_expression": "Urgent, intense eye contact, direct pointing gesture to viewer",
      "text_overlay": "'🔗 LINK DI BIO' (blink animation) + '⏰ STOK TERBATAS!'",
      "sound_design": "Music crescendo, subtle countdown tick SFX, final beat drop di akhir",
      "transition_to_next": "end",
      "viral_element_in_scene": "FOMO + urgency + direct fourth-wall break",
      "cliffhanger_to_next": "CTA release — penonton harus klik atau menyesal",
      "ai_ready_prompt": "Indonesian woman 25 years old, red and white athletic outfit, RunFast Pro red shoes, walking directly toward camera with urgent excited expression, camera retreats as she approaches, stops at medium close-up, points directly at viewer with intense eye contact, background outdoor bokeh, warm golden sunlight, 5s, 9:16 vertical frame"
    }
  ],
  "production_notes": {
    "lipsync_summary": "Scene 1 (3s): 6 kata, ultra_fast. Scene 2 (6s): 16 kata, normal. Scene 3 (6s): 15 kata, normal. Scene 4 (5s): 11 kata, fast.",
    "editing_sequence": "Scene 1 [hard cut + audio impact] → Scene 2 [zoom punch] → Scene 3 [whip pan] → Scene 4 [end]",
    "color_grade_lut": "Lightroom Mobile 'Vibrant Warm' atau LUT 'Orange & Teal Light'. Clarity +15, Vibrance +20.",
    "thumbnail_concept": "Frame Scene 1 saat karakter menatap kamera — ekspresi shocked, text '10.000+ TERJUAL', sepatu merah pojok kanan bawah",
    "caption_variations": [
      {
        "caption_text": "Kamu salah besar kalau masih beli sepatu lari biasa 😤",
        "hashtags": ["#sepatulari", "#sepatoolahraga", "#affiliate", "#sepatumurah", "#olahragayuk"]
      }
    ],
    "posting_time_suggestion": "TikTok: Selasa–Jumat pukul 19.00–21.00 WIB. Hindari Senin pagi dan weekend sebelum siang.",
    "ab_test_suggestion": "Coba hook alternatif: 'Jangan beli sepatu lari sebelum nonton ini!' (Open Question) untuk A/B test retention vs Shocking Fact hook ini."
  }
}
```

---

## 11. HISTORY & TEMPLATE

### 11.1 History
- Disimpan di localStorage via Zustand persist (key: `viralframe-store`, partialize → history)
- Maksimal **50 record**, FIFO auto-prune (addHistory: `[record, ...history].slice(0, 50)`)
- Setiap record menyimpan: timestamp, label, formData (tanpa referencePhotos/base64 — foto TIDAK di-persist), master prompt, dan JSON hasil
- Halaman `/history`: list record, tombol [Load Ulang] dan [Hapus], [Hapus Semua]
- Jika record punya JSON hasil, tombol [Lihat Scene Cards] tersedia langsung dari history

### 11.2 Template Preset

| Nama | Niche | Platform | Scene | Durasi/Scene | Hook | CTA | Tool |
|------|-------|----------|-------|-------------|------|-----|------|
| Affiliate TikTok Cepat | `affiliate_product` | `tiktok` | 4 | 5s | `shock_fact` | `link_bio` | `veo3` |
| Properti Cinematic | `real_estate` | `instagram_reels` | 6 | 8s | `before_after_teaser` | `dm_whatsapp` | `kling_ai` |
| Kuliner FOMO | `food_beverage` | `tiktok` | 5 | 6s | `fomo` | `visit_website` | `veo3` |
| SaaS Demo Clean | `saas_app` | `youtube_shorts` | 5 | 7s | `bold_claim` | `free_trial_grab` | `sora` |
| Edukasi Storytelling | `education_course` | `instagram_reels` | 6 | 9s | `pain_point_attack` | `comment_keyword` | `kling_ai` |
| Fashion Editorial | `fashion_beauty` | `instagram_reels` | 5 | 6s | `visual_shock` | `link_bio` | `luma_dream` |

### 11.3 Halaman /templates — Spesifikasi UI

```
┌─────────────────────────────────────────────────────────────────┐
│  📁 Template Library                                             │
│  Mulai cepat dari template siap pakai atau simpan konfigurasi   │
│  form kamu sebagai template custom.                              │
│                                                                  │
│  [Tab: 🏷️ Preset Bawaan]  [Tab: ⭐ Template Saya]               │
├─────────────────────────────────────────────────────────────────┤
│  TAB PRESET BAWAAN:                                              │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 🛒 Affiliate    │  │ 🏠 Properti     │  │ 🍜 Kuliner      │ │
│  │ TikTok Cepat    │  │ Cinematic       │  │ FOMO            │ │
│  │                 │  │                 │  │                 │ │
│  │ 4 scene · 20s   │  │ 6 scene · 48s   │  │ 5 scene · 30s   │ │
│  │ TikTok · Veo3   │  │ Reels · Kling   │  │ TikTok · Veo3   │ │
│  │                 │  │                 │  │                 │ │
│  │ [Pakai Template]│  │ [Pakai Template]│  │ [Pakai Template]│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ...dst untuk semua 6 preset                                     │
│                                                                  │
│  TAB TEMPLATE SAYA:                                              │
│                                                                  │
│  Belum ada template custom.                                      │
│  Setelah mengisi form, klik "Simpan sebagai Template"            │
│  di halaman generate untuk menyimpan konfigurasi ini.           │
│                                                                  │
│  [+ Buat Template Baru dari Form Kosong]                         │
└─────────────────────────────────────────────────────────────────┘
```

**Perilaku "Pakai Template":** Mengisi semua field form dengan parameter preset, lalu redirect ke halaman `/` (Home / Form Generator) di Step 1. User bisa edit parameter sebelum generate.

---

## 12. HALAMAN /guide — OUTLINE KONTEN

### Bagian 1: Cara Kerja ViralFrame Studio
Diagram alur 3 layer versi visual. Penjelasan perbedaan Direct API Mode dan Manual Prompt Mode.

### Bagian 2: Cara Mendapatkan API Key Gratis
Step-by-step: Gemini (Google AI Studio) + Groq. Screenshot tiap langkah. Estimasi waktu: 3 menit.

### Bagian 3: Cara Mengisi Form
Tips per field yang sering salah. Contoh deskripsi produk buruk vs baik. Penjelasan Hook type. Penjelasan lipsync dan kenapa durasi mempengaruhi jumlah kata.

### Bagian 4: Memahami Scene Cards
Penjelasan setiap bagian Scene Card. Cara membaca visual brief. Cara menggunakan Reference Frame Guide per tool.

### Bagian 5: Cara Generate Video Per Scene
Per tool: Veo3, Kling AI, Luma, Runway, Pika — panduan singkat 3 langkah + cara upload reference frame.

### Bagian 6: Cara Menggabungkan Scene Menjadi Video Utuh
Tools rekomendasi: CapCut, DaVinci Resolve, Adobe Premiere. Tips color grading agar konsisten. Tips audio mix.

### Bagian 7: Tips Viral 2025
5 tips berdasarkan data platform terkini. Penjelasan 8 elemen viral.

### Bagian 8: FAQ
"Kenapa AI tidak mengeluarkan JSON?" · "Boleh pakai AI model mana?" · "API key aman?" · "Berapa scene yang disarankan?" · "Kenapa ada batas kata per scene?" · "Apa itu Reference Frame?"

---

## 13. DESIGN SYSTEM

**Tema:** Dark mode default, light mode tersedia via toggle
**Estetika:** Futuristic professional tool

### 13.1 Color Variables

```css
/* === DARK MODE (default) === */
--bg-primary:     #08080E;
--bg-secondary:   #0F0F1A;
--bg-elevated:    #16162A;
--border:         #252540;
--border-active:  #4040A0;

--accent-primary:    #6366F1;  /* indigo — CTA, active, progress */
--accent-secondary:  #22D3EE;  /* cyan — highlight, body scene badge */
--accent-success:    #10B981;  /* green — valid, copy success */
--accent-warning:    #F59E0B;  /* amber — warning, hook badge */
--accent-danger:     #EF4444;  /* red — error */
--accent-cta-badge:  #8B5CF6;  /* purple — CTA scene badge */

--text-primary:   #F1F5F9;
--text-secondary: #94A3B8;
--text-muted:     #475569;

/* === LIGHT MODE === */
--bg-primary:     #FAFAFA;
--bg-secondary:   #FFFFFF;
--bg-elevated:    #F1F5F9;
--border:         #E2E8F0;
--border-active:  #6366F1;

--accent-primary:    #4F46E5;
--accent-secondary:  #0891B2;
--accent-success:    #059669;
--accent-warning:    #D97706;
--accent-danger:     #DC2626;
--accent-cta-badge:  #7C3AED;

--text-primary:   #0F172A;
--text-secondary: #475569;
--text-muted:     #94A3B8;
```

### 13.2 Typography
- **Display / Label:** `Plus Jakarta Sans`, fallback: `DM Sans`, `system-ui`, `sans-serif` — weight 400, 500, 700
- **Mono / Prompt / JSON:** `JetBrains Mono`, fallback: `Fira Code`, `Consolas`, `monospace`
- **Body:** `Plus Jakarta Sans`, fallback: `DM Sans`, `system-ui`, `sans-serif` — weight 400

**Google Fonts import (tambahkan di `index.html`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 13.3 Komponen Kunci

| Komponen | Spesifikasi |
|----------|-------------|
| Step Indicator | 3 langkah, progress bar, step aktif = accent-primary |
| Mode Selector | 2 card side-by-side dengan icon, deskripsi, dan badge "Direkomendasikan" |
| Scene Card | Rounded card, border kiri berwarna sesuai tipe scene, expandable sections |
| API Status Badge | Dot hijau/merah + label provider + model name |
| Copy Button | Animasi: teks berubah "Copied! ✓" selama 2 detik lalu kembali |
| Char Counter di Prompt | "432 / 500 chars ✅" — merah jika melebihi batas |
| Viral Score Meter | Gauge radial 0–100, gradient merah→kuning→hijau |
| Loading State Generate | Progress bar (0–100%) + lampu status provider (Gemini/Groq/OpenRouter — idle/trying/success/failed) + teks progress dari API callback |
| Error Banner | Inline banner merah (accent-danger) dengan icon AlertCircle, muncul di output panel tanpa menghalangi scene cards. Menggantikan error toast (tidak ada toast system). |
| Character Consistency Score | Progress bar horizontal dengan breakdown per field — ditampilkan di Step 3 (form karakter), bukan di Scene Card |
| Reference Frame Guide | Collapsible section di setiap Scene Card dengan step bernomor |

---

## 14. TECH STACK

```
FRONTEND:
├── React 18 + Vite + TypeScript
├── Tailwind CSS v4
├── shadcn/ui
│   └── Select, Checkbox, Slider, Tabs, Accordion, Toast,
│       Dialog, Tooltip, Badge, Progress, Skeleton
├── Zod (validasi form)
├── Zustand (form state, history, settings, api config)
└── Lucide React (icons)

PROMPT ENGINE (pure frontend):
├── masterPrompt.ts            → merakit 5 blok menjadi satu string (compileMasterPrompt)
├── lipsync.ts                 → durasi → {max_words, pace, instruksi} (getLipsyncSpec)
├── maps.ts                    → AI_TOOLS + AI_TOOL_FORMAT + PLATFORM_BEHAVIOR + NICHE_DATA + PRESET_TEMPLATES
├── jsonParser.ts              → auto-strip + parse + error recovery (parseAiResponse, validateVideoJSON)
└── validation.ts              → Zod schema form + warnings (validateFormData, getFormWarnings)

API INTEGRATION (Direct API Mode):
├── apiClient.ts               → fetch wrapper + retry + fallback logic
│   ├── callGemini()           → POST ke Gemini API
│   ├── callGroq()             → POST ke Groq API
│   ├── callOpenRouter()       → POST ke OpenRouter API
│   └── generateWithFallback() → Gemini → retry → Groq → OpenRouter (auto-fallback)
├── jsonParser.ts              → auto-strip + parse + error recovery + validateVideoJSON

OUTPUT & STORAGE:
├── Clipboard API              → copy prompt dan per-scene JSON
├── JSZip                      → download per-scene ZIP
└── localStorage (via Zustand persist — key: `viralframe-store`)
    ├── settings               → preferensi default + API keys + mode (partialize)
    ├── history                → max 50 record, FIFO (partialize)
    └── customTemplates        → template custom user (partialize)

TAB 4 / MANUAL MODE UTILITIES:
├── jsonParser.ts              → parse + validate JSON (parseAiResponse)

DEV TOOLS:
├── Vite dev server (localhost:5173)
```

---

## 15. ROADMAP (DIPERBARUI)

| Fase | Versi | Fitur | Status |
|------|-------|-------|--------|
| Core | v1.0 | Form 3-step + Manual Prompt Mode + Scene Brief preview | Target |
| API | v1.1 | **Direct API Mode** (Gemini + Groq) + Scene Cards Output + Reference Frame Guide | Target |
| Quality | v1.2 | Tab Paste & Validate + History (max 50) + Template preset + /guide page | Target |
| UX | v1.3 | Scene timeline visual + Viral score meter + Dark/light toggle + Character Consistency Score | Target |
| Power | v1.4 | A/B hook generator (2 versi prompt sekaligus) | Planned |
| Export | v1.5 | Export format spesifik per AI tool (Veo3 pack, Kling pack, dsb.) | Planned |
| Pro | v2.0 | Multi-video campaign planner (seri konten 7/30 hari) | Planned |

> **Catatan perubahan roadmap dari v3.0:** Direct API Mode dipercepat dari v1.4 ke v1.1 karena ini adalah fitur inti yang menentukan diferensiasi produk, bukan fitur tambahan.

---

## 16. RINGKASAN KEPUTUSAN ARSITEKTUR

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| API Provider Primer | Google Gemini 2.5 Flash | Gratis terbesar (1M token/hari), kualitas output terbaik untuk JSON terstruktur |
| API Provider Fallback | Groq Llama 3.3 70B | Gratis, cepat, open-source, auto-fallback tanpa intervensi user |
| Penyimpanan API Key | localStorage saja | Tidak ada backend — key tidak pernah meninggalkan browser user |
| JSON Parse Strategy | Auto-strip + fallback multi-step | AI kadang menambah teks sebelum/sesudah JSON meski sudah diperintah — sistem harus robust |
| Konsistensi Visual | Character Anchor Prompt + Reference Frame Guide | Dua lapisan: teks dijamin sistem, visual dijaga user dengan panduan per tool |
| State Management | Zustand | Ringan, tidak butuh boilerplate Redux untuk scope ini |
| Validasi Form | React Hook Form + Zod | Type-safe, schema-driven, performa baik |
| Output Mode | Dual mode (Direct API + Manual) | Direct API untuk pengalaman terbaik, Manual sebagai fallback universal yang selalu ada |
| Batas History | 50 record FIFO | Menjaga localStorage tidak penuh (~5MB limit browser) |
| Arsitektur | Pure frontend, tidak ada backend | Gratis deploy, tidak ada server cost, data 100% privat di perangkat user |

---

*ViralFrame Studio — PRD v5.1 · Codebase-Synced Edition · Production-Ready*
*Semua gap dari v5.0 diselesaikan (15 perbaikan). Dokumen ini sinkron dengan kode aktual.*
