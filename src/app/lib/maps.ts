export const NICHES = [
  { value: 'affiliate_product', label: '🛒 Affiliate Video Product' },
  { value: 'real_estate', label: '🏠 Agen Properti' },
  { value: 'web_builder', label: '💻 Web Builder / Jasa Website' },
  { value: 'fashion_beauty', label: '💄 Fashion & Beauty' },
  { value: 'food_beverage', label: '🍜 Kuliner & F&B' },
  { value: 'education_course', label: '📚 Edukasi & Online Course' },
  { value: 'health_wellness', label: '🏋️ Kesehatan & Wellness' },
  { value: 'travel_tourism', label: '✈️ Travel & Wisata' },
  { value: 'finance_investment', label: '💰 Finance & Investasi' },
  { value: 'saas_app', label: '📱 SaaS / Aplikasi Digital' },
  { value: 'personal_brand', label: '🎤 Personal Branding' },
  { value: 'dropship_ecommerce', label: '📦 Dropship / E-Commerce' },
  { value: 'local_service', label: '🔧 Jasa Lokal (salon, laundry, dsb.)' },
  { value: 'event_organizer', label: '🎪 Event & Entertainment' },
];

export const TARGET_AUDIENCES = [
  { value: 'gen_z', label: 'Gen Z (17–25 th)' },
  { value: 'millennial', label: 'Millennial (26–40 th)' },
  { value: 'gen_x', label: 'Gen X (41–55 th)' },
  { value: 'male', label: 'Pria' },
  { value: 'female', label: 'Wanita' },
  { value: 'parent', label: 'Orang Tua' },
  { value: 'entrepreneur', label: 'Pengusaha / Freelancer' },
  { value: 'student', label: 'Pelajar / Mahasiswa' },
  { value: 'professional', label: 'Profesional / Karyawan' },
  { value: 'homemaker', label: 'Ibu Rumah Tangga' },
];

export const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok', ratio: '9:16', duration: '15–60s' },
  { value: 'instagram_reels', label: 'Instagram Reels', ratio: '9:16', duration: '15–90s' },
  { value: 'youtube_shorts', label: 'YouTube Shorts', ratio: '9:16', duration: '15–60s' },
  { value: 'facebook_reels', label: 'Facebook Reels', ratio: '9:16', duration: '15–60s' },
  { value: 'xiaohongshu', label: 'Xiaohongshu / RedNote', ratio: '9:16 atau 3:4', duration: '15–60s' },
];

export const AI_TOOLS: { value: string; label: string; charLimit: number; supportsRef: boolean }[] = [
  { value: 'veo3', label: 'Google Veo 3', charLimit: 500, supportsRef: false },
  { value: 'kling_ai', label: 'Kling AI 2.0', charLimit: 400, supportsRef: true },
  { value: 'minimax_hailuo', label: 'Minimax Video / Hailuo', charLimit: 350, supportsRef: true },
  { value: 'runway_gen4', label: 'Runway Gen-4', charLimit: 300, supportsRef: true },
  { value: 'luma_dream', label: 'Luma Dream Machine', charLimit: 300, supportsRef: true },
  { value: 'pika_labs', label: 'Pika Labs 2.0', charLimit: 250, supportsRef: true },
  { value: 'sora', label: 'OpenAI Sora', charLimit: 600, supportsRef: false },
  { value: 'bytedance_jianying', label: 'Bytedance Jianying / MagicVideo', charLimit: 400, supportsRef: true },
  { value: 'wan21', label: 'Wan 2.1 (Alibaba)', charLimit: 400, supportsRef: true },
  { value: 'cogvideox', label: 'CogVideoX', charLimit: 350, supportsRef: false },
];

export const RATIOS = [
  { value: '9:16', label: '9:16 Vertikal ← Default TikTok/Reels' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:5', label: '4:5 Portrait' },
  { value: '3:4', label: '3:4 Portrait' },
];

export const LANGUAGES = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English' },
  { value: 'id_en', label: 'Bilingual — narasi ID, subtitle EN' },
  { value: 'en_id', label: 'Bilingual — narasi EN, subtitle ID' },
];

export const HOOK_TYPES = [
  { value: 'auto', label: '✨ Auto — AI pilihkan terkuat' },
  { value: 'shock_fact', label: '😱 Shocking Fact' },
  { value: 'open_question', label: '❓ Open Question' },
  { value: 'bold_claim', label: '🔥 Bold Claim' },
  { value: 'before_after_teaser', label: '↔️ Before/After Teaser' },
  { value: 'pain_point_attack', label: '💢 Pain Point Attack' },
  { value: 'secret_reveal', label: '🤫 Secret / Forbidden Info' },
  { value: 'pattern_interrupt', label: '⚡ Pattern Interrupt' },
  { value: 'social_proof_number', label: '⭐ Social Proof + Angka' },
  { value: 'controversy', label: '🌶️ Controversial Take' },
  { value: 'fomo', label: '⏰ FOMO / Urgency' },
  { value: 'story_in_progress', label: '🎬 Story in Progress' },
  { value: 'visual_shock', label: '👁️ Visual Shock — Tanpa narasi' },
];

export const CTA_TYPES = [
  { value: 'auto', label: '✨ Auto — AI pilihkan terkuat' },
  { value: 'link_bio', label: '🔗 Klik Link di Bio' },
  { value: 'dm_whatsapp', label: '💬 DM / Chat WA Sekarang' },
  { value: 'comment_keyword', label: '💬 Komen [KEYWORD]' },
  { value: 'follow_more', label: '👣 Follow untuk Konten Berikutnya' },
  { value: 'share_tag_friend', label: '📤 Share & Tag Teman' },
  { value: 'visit_website', label: '🌐 Kunjungi Website / Toko' },
  { value: 'limited_urgency', label: '⏳ Stok Terbatas / Waktu Terbatas' },
  { value: 'free_trial_grab', label: '🎁 Ambil Uji Coba Gratis' },
  { value: 'save_for_later', label: '🔖 Simpan Video Ini' },
  { value: 'double_tap_agree', label: '❤️ Double Tap Kalau Setuju' },
];

export const ETHNICITIES = [
  'Asia Tenggara', 'Asia Timur', 'Asia Selatan',
  'Kaukasia', 'Afrika', 'Latin', 'Timur Tengah', 'Mixed',
];

export const CHARACTER_STYLES = [
  'Kasual Modern', 'Profesional', 'Trendy/Streetwear',
  'Tradisional', 'Sporty', 'Glamour',
];

export const EXPRESSIONS = [
  { value: 'auto', label: '✨ Auto' },
  { value: 'excited_joyful', label: '😄 Excited & Joyful' },
  { value: 'confident_authoritative', label: '😎 Confident & Authoritative' },
  { value: 'surprised_amazed', label: '😮 Surprised & Amazed' },
  { value: 'warm_friendly', label: '🤗 Warm & Friendly' },
  { value: 'urgent_intense', label: '😤 Urgent & Intense' },
  { value: 'empathetic_relatable', label: '🥺 Empathetic & Relatable' },
  { value: 'playful_humorous', label: '😂 Playful & Humorous' },
  { value: 'mysterious_dramatic', label: '🎭 Mysterious & Dramatic' },
  { value: 'curious_investigative', label: '🤔 Curious & Investigative' },
];

export const VISUAL_STYLES = [
  { value: 'auto', label: '✨ Auto' },
  { value: 'ugc_authentic', label: '📱 UGC / Authentic' },
  { value: 'cinematic_film', label: '🎬 Cinematic Film' },
  { value: 'minimalist_clean', label: '⬜ Minimalist & Clean' },
  { value: 'bold_colorful', label: '🌈 Bold & Colorful' },
  { value: 'dark_moody', label: '🌑 Dark & Moody' },
  { value: 'retro_vintage', label: '📷 Retro / Vintage' },
  { value: 'hyper_realistic', label: '🔬 Hyper-Realistic' },
  { value: 'motion_graphic', label: '✨ Motion Graphic' },
  { value: 'split_screen', label: '🔀 Split Screen' },
  { value: 'pov_first_person', label: '👁️ POV / First Person' },
  { value: 'documentary', label: '🎥 Documentary Style' },
  { value: 'aesthetic_editorial', label: '🖼️ Aesthetic / Editorial' },
];

export const BACKSOUNDS = [
  { value: 'auto', label: '✨ Auto' },
  { value: 'trending_tiktok', label: '🔥 Trending TikTok Sound' },
  { value: 'upbeat_energetic', label: '⚡ Upbeat & Energetic' },
  { value: 'cinematic_epic', label: '🎬 Cinematic & Epic' },
  { value: 'soft_emotional', label: '💖 Soft & Emotional' },
  { value: 'corporate_clean', label: '👔 Corporate & Clean' },
  { value: 'lofi_chill', label: '🌙 Lo-Fi & Chill' },
  { value: 'hip_hop_trap', label: '🎤 Hip-Hop / Trap' },
  { value: 'futuristic_tech', label: '🤖 Futuristic / Tech' },
  { value: 'nature_organic', label: '🌿 Nature & Organic' },
  { value: 'traditional_cultural', label: '🎶 Tradisional / Kultural' },
  { value: 'no_music_ambient', label: '🔇 Tanpa Musik / Ambient' },
];

export const NARRATIVE_TONES = [
  { value: 'auto', label: '✨ Auto' },
  { value: 'conversational', label: '💬 Kasual & Ngobrol' },
  { value: 'authoritative', label: '🏛️ Otoritatif & Expert' },
  { value: 'storytelling', label: '📖 Storytelling / Narasi' },
  { value: 'hype_energy', label: '🔥 Hype & Energik' },
  { value: 'educational', label: '📚 Edukatif & Informatif' },
  { value: 'emotional_touching', label: '💝 Emosional & Menyentuh' },
  { value: 'humorous_witty', label: '😄 Humor & Relatable' },
  { value: 'luxury_premium', label: '💎 Luxury / Premium' },
  { value: 'scarcity_urgency', label: '⏰ Kelangkaan & Urgensi' },
];

export const NICHE_DATA: Record<string, { psikografis: string; painPoint: string }> = {
  affiliate_product: { psikografis: 'Konsumen aktif cari rekomendasi online, dipengaruhi social proof', painPoint: 'Takut beli produk tidak sesuai ekspektasi, tidak tahu mana yang worth it' },
  real_estate: { psikografis: 'Calon pembeli dalam fase riset, butuh keyakinan sebelum keputusan besar', painPoint: 'Takut salah investasi, proses beli properti terasa rumit dan menakutkan' },
  web_builder: { psikografis: 'Pemilik bisnis kecil, tidak punya skill teknis, butuh solusi cepat', painPoint: 'Website mahal dan ribet, tidak tahu mulai dari mana, takut ditipu vendor' },
  fashion_beauty: { psikografis: 'Peduli penampilan, sering cari inspirasi di sosmed, FOMO tren', painPoint: 'Sulit menemukan yang cocok dengan jenis kulit/tubuh, terlalu banyak pilihan' },
  food_beverage: { psikografis: 'Penikmat kuliner, suka berbagi pengalaman, cari tempat/produk baru', painPoint: 'Bosan pilihan itu-itu saja, takut rasa tidak sesuai foto, khawatir antre' },
  education_course: { psikografis: 'Ingin naik level skill, termotivasi tapi mudah overwhelmed', painPoint: 'Tidak tahu harus belajar dari mana, beli kursus tapi tidak selesai' },
  health_wellness: { psikografis: 'Sadar kesehatan, pernah coba berbagai solusi tapi belum konsisten', painPoint: 'Susah konsisten, tidak tahu program mana efektif, takut efek samping' },
  travel_tourism: { psikografis: 'Wisatawan yang cari pengalaman baru, sering riset destinasi', painPoint: 'Takut destinasi tidak sesuai ekspektasi, khawatir budget membengkak' },
  finance_investment: { psikografis: 'Ingin mulai/tingkatkan investasi, anxiety terhadap masa depan finansial', painPoint: 'Takut salah langkah dan rugi, tidak paham instrumen investasi' },
  saas_app: { psikografis: 'Profesional butuh tools efisiensi, tech-savvy tapi sibuk', painPoint: 'Tools terlalu kompleks atau mahal, ROI tidak jelas, integrasi susah' },
  personal_brand: { psikografis: 'Kreator ingin bangun otoritas online, ingin dikenal di niche-nya', painPoint: 'Tidak tahu cara menonjol, engagement rendah, tidak konsisten posting' },
  dropship_ecommerce: { psikografis: 'Penjual online ingin tingkatkan konversi, bersaing di marketplace', painPoint: 'Iklan mahal tapi konversi rendah, susah bedain dari kompetitor' },
  local_service: { psikografis: 'Pemilik usaha lokal ingin jangkau lebih banyak pelanggan', painPoint: 'Kalah bersaing dengan bisnis besar, tidak punya anggaran marketing' },
  event_organizer: { psikografis: 'Penyelenggara event butuh promosi cepat, deadline mendekat', painPoint: 'Susah jual tiket, konten promosi membosankan, visibilitas rendah' },
};

export const AI_TOOL_FORMAT: Record<string, string> = {
  veo3: 'WAJIB mulai dengan CHARACTER ANCHOR — deskripsi fisik karakter LENGKAP dan IDENTIK di setiap scene (copy persis dari character_sheet.description). Format: \'[Deskripsi fisik karakter lengkap] — [aksi scene ini]. [Camera movement]. [Environment dan lighting]. [Mood]. [Xs, 9:16 vertical frame]\' Maksimal 500 karakter. English only. KRITIS: Tanpa character anchor yang identik di setiap scene, Veo3 akan menghasilkan karakter yang berbeda-beda di setiap generate.',
  kling_ai: 'Subject description. Action/motion. Camera movement. Environment. Lighting. Style/mood. English.',
  minimax_hailuo: "'Character: [desc]. Action: [desc]. Scene: [desc]. Mood: [desc].' English.",
  runway_gen4: 'Action-first. Camera keyword. Environment. Style. [X]s. English.',
  luma_dream: 'One cinematic sentence + style tags. English.',
  pika_labs: "Short: '[Subject] [action] [environment]. [Camera]. [Mood]. [X]s.' English.",
  sora: 'Rich detailed description: character + action + environment + camera + lighting + mood. Longer is better. English.',
  bytedance_jianying: "'[Scene setting]. [Character description]. [Action]. [Shot direction]. [Mood].' English or Chinese.",
  wan21: "'[Scene type]. [Subject physical description]. [Action]. [Camera angle+movement]. [Atmosphere]. [Style].' English.",
  cogvideox: "'[Scene context]. [Subject behavior]. [Visual mood]. [Camera perspective]. [Duration hint].' English.",
};

export const PLATFORM_BEHAVIOR: Record<string, string> = {
  tiktok: 'Re-watch signal krusial. Detik 0–1 harus ada gerakan mengejutkan. Buat ending yang membuat penonton kembali ke awal. Durasi 15–30 detik terbaik untuk akun baru.',
  instagram_reels: 'Save dan share lebih penting dari like. Buat konten worth saving. Aesthetic visual lebih diperhatikan.',
  youtube_shorts: 'Watch time dan subscription conversion adalah prioritas. Hook detik pertama adalah segalanya.',
  facebook_reels: 'Audiens 30+ lebih dominan. Tone lebih formal. Social proof dan testimonial sangat efektif.',
  xiaohongshu: 'Konten lifestyle aspirasional dan detail sangat disukai. Aesthetic visual sangat penting.',
};

export const PRESET_TEMPLATES = [
  { id: 'preset_1', name: 'Affiliate TikTok Cepat', niche: 'affiliate_product', platform: 'tiktok', sceneCount: 4, durationPerScene: 5, hookType: 'shock_fact', ctaType: 'link_bio', aiTool: 'veo3', isPreset: true },
  { id: 'preset_2', name: 'Properti Cinematic', niche: 'real_estate', platform: 'instagram_reels', sceneCount: 6, durationPerScene: 8, hookType: 'before_after_teaser', ctaType: 'dm_whatsapp', aiTool: 'kling_ai', isPreset: true },
  { id: 'preset_3', name: 'Kuliner FOMO', niche: 'food_beverage', platform: 'tiktok', sceneCount: 5, durationPerScene: 6, hookType: 'fomo', ctaType: 'visit_website', aiTool: 'veo3', isPreset: true },
  { id: 'preset_4', name: 'SaaS Demo Clean', niche: 'saas_app', platform: 'youtube_shorts', sceneCount: 5, durationPerScene: 7, hookType: 'bold_claim', ctaType: 'free_trial_grab', aiTool: 'sora', isPreset: true },
  { id: 'preset_5', name: 'Edukasi Storytelling', niche: 'education_course', platform: 'instagram_reels', sceneCount: 6, durationPerScene: 9, hookType: 'pain_point_attack', ctaType: 'comment_keyword', aiTool: 'kling_ai', isPreset: true },
  { id: 'preset_6', name: 'Fashion Editorial', niche: 'fashion_beauty', platform: 'instagram_reels', sceneCount: 5, durationPerScene: 6, hookType: 'visual_shock', ctaType: 'link_bio', aiTool: 'luma_dream', isPreset: true },
];
