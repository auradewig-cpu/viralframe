import { FormData } from '../types';
import { getLipsyncSpec } from './lipsync';
import { NICHE_DATA, AI_TOOL_FORMAT, PLATFORM_BEHAVIOR, AI_TOOLS, EXPRESSIONS, VISUAL_STYLES, BACKSOUNDS, NARRATIVE_TONES } from './maps';
import { CONTENT_STYLES } from './contentStyles';

function getSceneDurations(form: FormData): number[] {
  if (form.durationMode === 'uniform') {
    return Array(form.sceneCount).fill(form.uniformDuration);
  }
  const durations = [...form.sceneDurations];
  while (durations.length < form.sceneCount) durations.push(form.uniformDuration);
  return durations.slice(0, form.sceneCount);
}

function buildCharacterBlock(form: FormData): string {
  if (!form.useCharacter) {
    return `Tidak ada karakter. Visual anchor: ${form.visualAnchor || 'tidak ditentukan'}`;
  }
  if (form.characterGender === 'duo') {
    return `Duo characters: ${form.characterAge}-year-old ${form.characterEthnicity} male and ${form.characterAge}-year-old ${form.characterEthnicity} female, both in ${form.characterStyle}, ${form.characterTraits}. Both characters MUST appear together in all scenes unless scene type requires solo shot.`;
  }
  const gender = form.characterGender === 'male' ? 'male' : 'female';
  return `${form.characterAge}-year-old ${form.characterEthnicity} ${gender}, ${form.characterStyle}, ${form.characterTraits}`;
}

const EXPR_MAP: Record<string, string> = {
  auto: 'expressive',
  excited_joyful: 'excited and joyful',
  confident_authoritative: 'confident and authoritative',
  surprised_amazed: 'surprised and amazed',
  warm_friendly: 'warm and friendly',
  urgent_intense: 'urgent and intense',
  empathetic_relatable: 'empathetic and relatable',
  playful_humorous: 'playful and humorous',
  mysterious_dramatic: 'mysterious and dramatic',
  curious_investigative: 'curious and investigative',
};

const ETHNICITY_FEATURES: Record<string, string> = {
  'Asia Tenggara': 'Southeast Asian features',
  'Asia Timur': 'East Asian features',
  'Asia Selatan': 'South Asian features',
  'Kaukasia': 'Caucasian features',
  'Afrika': 'African features',
  'Latin': 'Latino features',
  'Timur Tengah': 'Middle Eastern features',
  'Mixed': 'Mixed features',
};

const BAHASA_LABEL: Record<string, string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
  id_en: 'Bahasa Indonesia',
  en_id: 'English',
};

function buildCharacterAnchor(form: FormData): string {
  if (!form.useCharacter) return '';
  const features = ETHNICITY_FEATURES[form.characterEthnicity] || form.characterEthnicity;
  const expr = EXPR_MAP[form.expression] || 'expressive';
  const traits = form.characterTraits ? `, ${form.characterTraits}` : '';
  if (form.characterGender === 'duo') {
    return `Duo characters: ${form.characterAge}-year-old ${features} male and ${form.characterAge}-year-old ${features} female, both in ${form.characterStyle} style${traits}, ${expr} expression`;
  }
  const gender = form.characterGender === 'male' ? 'male' : 'female';
  return `${form.characterAge}-year-old ${features} ${gender}, ${form.characterStyle} style${traits}, ${expr} expression`;
}

export function compileMasterPrompt(form: FormData, narrationWPM: number = 165): string {
  const durations = getSceneDurations(form);
  const nicheData = NICHE_DATA[form.niche] || { psikografis: '-', painPoint: '-' };
  const toolData = AI_TOOLS.find(t => t.value === form.aiTool);
  const charLimit = toolData?.charLimit || 400;
  const toolFormat = AI_TOOL_FORMAT[form.aiTool] || '';
  const spokenLanguageLabel = BAHASA_LABEL[form.language] || 'Bahasa Indonesia';
  const effectiveStyle = CONTENT_STYLES.find(cs => cs.value === form.contentStyle) || CONTENT_STYLES.find(cs => cs.value === 'direct_response')!;

  const platformList = form.platforms.join(', ');
  const platformPrimer = form.platforms[0] || '-';
  const platformBehavior = PLATFORM_BEHAVIOR[platformPrimer] || '-';

  const sceneDurationTable = durations.map((d, i) => {
    const spec = getLipsyncSpec(d, narrationWPM);
    const type = effectiveStyle.getSceneRole(i, form.sceneCount);
    return `Scene ${i + 1} [${type}]: ${d}s → maks ${spec.maxWords} kata (${spec.pace}) — ${spec.instruction}`;
  }).join('\n');

  const characterBlock = buildCharacterBlock(form);
  const characterAnchor = buildCharacterAnchor(form);
  const hasRefPhotos = form.referencePhotos.length > 0;
  const hasLocation = !!form.locationDescription;

  let langInstruction = '';
  if (form.language === 'id') langInstruction = 'BAHASA: script_narration HARUS dalam Bahasa Indonesia. script_subtitle = null.';
  if (form.language === 'en') langInstruction = 'BAHASA: script_narration HARUS dalam English. script_subtitle = null.';
  if (form.language === 'id_en') langInstruction = 'BAHASA: script_narration dalam Bahasa Indonesia, script_subtitle dalam English.';
  if (form.language === 'en_id') langInstruction = 'BAHASA: script_narration dalam English, script_subtitle dalam Bahasa Indonesia.';

  let advancedBlocks = '';
  if (form.requiredKeywords.length > 0) advancedBlocks += `KATA KUNCI WAJIB: ${form.requiredKeywords.join(', ')}\n`;
  if (form.blacklistWords.length > 0) advancedBlocks += `KATA DILARANG: ${form.blacklistWords.join(', ')}\n`;
  if (form.referenceStyle) advancedBlocks += `GAYA REFERENSI: ${form.referenceStyle}\n`;
  if (form.brandColor) advancedBlocks += `Brand color dominant: ${form.brandColor}\n`;
  if (form.avoidColor) advancedBlocks += `Warna yang dihindari: ${form.avoidColor}\n`;
  if (form.textOverlay) advancedBlocks += `Sertakan text overlay per scene\n`;
  if (form.subtitleStyle !== 'None') advancedBlocks += `Subtitle style: ${form.subtitleStyle}\n`;
  if (hasLocation) advancedBlocks += `DESKRIPSI LOKASI/PROPERTI: ${form.locationDescription}\n`;

  return `=== VIRALFRAME MASTER PROMPT v4.1 ===
INSTRUKSI KRITIS: Baca seluruh prompt ini sebelum mulai bekerja.
Output kamu HANYA berupa JSON murni. Tidak ada teks sebelum JSON.
Tidak ada teks setelah JSON. Tidak ada penjelasan. Tidak ada markdown
wrapper seperti \`\`\`json. Mulai dengan { dan akhiri dengan }.

---

[BLOK 1: IDENTITAS DAN PERANMU]

Kamu adalah satu entitas yang menjalankan 4 keahlian secara bersamaan:

PERAN 1 — ALGORITMA MEDIA SOSIAL (2025):
Platform target: ${platformList}
Kamu memahami: watch time optimization, early engagement signals,
retention hooks setiap 2–3 detik, pattern interrupt, emotional
resonance, dan platform-specific behavior.
Platform behavior khusus: ${platformBehavior}

PERAN 2 — CREATIVE DIRECTOR & VIDEO DIRECTOR:
Merancang setiap scene dengan presisi sinematik: komposisi shot,
pergerakan kamera, pencahayaan, transisi, dan kontinuitas visual.

PERAN 3 — COPYWRITER & NARRATIVE WRITER (adaptif sesuai Gaya Konten):
${effectiveStyle.ctaIntensity === 'hard'
  ? 'Menulis narasi berbasis AIDA + psikologi persuasi: social proof, scarcity, authority, reciprocity, commitment. Setiap kata dipilih dengan tujuan menjual.'
  : `Menulis narasi sesuai gaya "${effectiveStyle.label}": ${effectiveStyle.narrativeVoiceGuidance} JANGAN gunakan teknik direct-response/hard-selling (AIDA, scarcity, urgency berlebihan) kecuali gaya konten ini secara eksplisit memintanya.`}

PERAN 4 — AI VIDEO PROMPT ENGINEER untuk ${form.aiTool}:
  Menulis ai_ready_prompt sebagai deskripsi scene yang natural, netral, dan policy-safe untuk ${form.aiTool}.
  Batas karakter: ${charLimit} per scene.
  Format: ${toolFormat}
  KRITIS: ai_ready_prompt HANYA berisi deskripsi scene. JANGAN sertakan instruksi meta (seperti "WAJIB", "KRITIS", "JANGAN LUPA") di dalamnya. JANGAN sertakan klaim pemasaran, testimonial, atau ajakan bertindak di ai_ready_prompt — itu semua masuk ke script_narration, BUKAN ai_ready_prompt.
  AUDIO/DIALOG: ai_ready_prompt WAJIB tetap diisi seperti biasa (deskripsi scene dalam English, sesuai format di atas). Setelah deskripsi scene selesai, tambahkan SATU baris tambahan persis di akhir: [DIALOGUE: ${spokenLanguageLabel}]. Contoh lengkap: "...[MOOD: confident]. [10s, 9:16 vertical frame]. [DIALOGUE: ${spokenLanguageLabel}]". PENTING — KESALAHAN UMUM YANG HARUS DIHINDARI: [DIALOGUE: ...] HANYA berisi NAMA BAHASA (contoh: "Bahasa Indonesia"), JANGAN PERNAH menulis ulang isi narasi/dialog di dalam kurung siku ini — narasi lengkap SUDAH ada terpisah di field script_narration, mengulanginya di sini cuma membuang-buang karakter dan melanggar batas ${charLimit} karakter. Contoh SALAH (JANGAN ditiru): "[DIALOGUE: Halo semua, ini adalah...]" — Contoh BENAR: "[DIALOGUE: ${spokenLanguageLabel}]". Field ai_ready_prompt TIDAK BOLEH kosong atau hilang — ini field WAJIB di setiap scene, dan TIDAK BOLEH melebihi ${charLimit} karakter.

---

[BLOK 2: KONTEKS BISNIS DAN PRODUK]

NICHE: ${form.niche}
PRODUK/LAYANAN: ${form.productDescription}
USP: "${form.usp}" → Tegaskan minimal 2x dalam video.
TARGET AUDIENS: ${form.targetAudience.join(', ')}
PSIKOGRAFIS: ${nicheData.psikografis}
PAIN POINT: ${nicheData.painPoint}
PLATFORM PRIMER: ${platformPrimer}
BAHASA: ${form.language}
  ${langInstruction}
${advancedBlocks}
---

[BLOK 3: SPESIFIKASI VIDEO]

AI TOOL: ${form.aiTool} | RASIO: ${form.ratio} | TOTAL SCENE: ${form.sceneCount}
GAYA KONTEN: ${effectiveStyle.label} — ${effectiveStyle.description}
STRUKTUR: ${effectiveStyle.structureDescription}
GAYA BAHASA NARASI UNTUK GAYA KONTEN INI: ${effectiveStyle.narrativeVoiceGuidance}
INTENSITAS CTA: ${effectiveStyle.ctaIntensity === 'hard' ? 'CTA WAJIB keras dan eksplisit di scene terakhir (ajakan bertindak jelas).' : effectiveStyle.ctaIntensity === 'soft' ? 'CTA HARUS lembut/tersirat (misal ajakan follow untuk konten berikutnya), BUKAN hard-selling.' : 'JANGAN ada CTA komersial sama sekali — akhiri secara natural sesuai gaya konten.'}
PERAN TIAP SCENE: ${durations.map((_, i) => `Scene ${i + 1} = ${effectiveStyle.getSceneRole(i, form.sceneCount)}`).join(' · ')}
    HOOK TYPE: ${form.hookType === 'auto' ? 'AI bebas memilih teknik hook paling kuat sesuai niche & target audience.' : `WAJIB gunakan teknik hook "${form.hookType}" di Scene 1 — bangun SELURUH narasi & visual scene pembuka di sekitar teknik ini secara eksplisit, bukan cuma disinggung sekilas.`}
    HOOK PACING (WAJIB, berlaku APAPUN total durasi Scene 1): Meskipun Scene 1 berdurasi ${durations[0]} detik penuh, inti hook (kejutan/klaim/pertanyaan/pain point) WAJIB tersampaikan TUNTAS dalam ${Math.min(5, durations[0])} DETIK PERTAMA narasi — sekitar ${getLipsyncSpec(Math.min(5, durations[0]), narrationWPM).maxWords} kata pertama dari script_narration. JANGAN menunda inti hook sampai pertengahan/akhir scene. Sisa durasi (${Math.max(0, durations[0] - Math.min(5, durations[0]))} detik terakhir, jika ada) boleh dipakai untuk transisi natural, elaborasi singkat, atau jembatan ke scene berikutnya — TAPI dampak/kejutan utama harus SUDAH tersampaikan di awal, bukan di bagian ini.
CTA TYPE: ${form.ctaType === 'auto' ? 'AI bebas memilih jenis CTA paling kuat sesuai niche & platform.' : `WAJIB gunakan jenis CTA "${form.ctaType}" di scene terakhir — bangun SELURUH narasi & visual scene penutup di sekitar CTA ini secara eksplisit.`}
${form.ctaType === 'comment_keyword' && form.ctaKeyword ? `CTA Keyword WAJIB dipakai persis: "${form.ctaKeyword}" — sertakan kata ini secara eksplisit di script_narration atau text_overlay scene CTA.` : ''}

LIPSYNC PER SCENE:
${sceneDurationTable}

GAYA BICARA & ARTIKULASI (WAJIB dipatuhi untuk SEMUA script_narration):
Tulis narasi seolah diucapkan oleh presenter/talent yang SUPEL, PERCAYA DIRI, dengan intonasi CEPAT namun ARTIKULASI JELAS — gaya konten kreator TikTok/Reels yang lancar bicara, bukan gaya formal/lambat/berbelit. Panduan menulis:
- Gunakan kalimat PENDEK dan LANGSUNG (subjek-predikat-objek sederhana), hindari anak kalimat bertumpuk.
- Gunakan kata-kata SEHARI-HARI yang familiar diucapkan cepat (contoh: "banget", "gampang", "gak ribet"), HINDARI kata formal/panjang yang sulit diucapkan cepat (contoh hindari: "signifikan", "komprehensif", "infrastruktur").
- HINDARI gugus konsonan sulit berturut-turut dalam satu frasa pendek.
- TARGET JUMLAH KATA: setiap script_narration WAJIB mendekati max_words yang tertera di tabel LIPSYNC PER SCENE di atas — target MINIMAL 85% dari max_words (bukan asal jauh di bawahnya).${form.hookType === 'visual_shock' ? ' PENGECUALIAN: Scene 1 memakai hook Visual Shock (tanpa narasi) — script_narration Scene 1 boleh kosong atau sangat pendek (0–5 kata), dampak hook sepenuhnya dari visual + sound design.' : ''} Kalimat yang terlalu pendek dibanding durasi scene membuat pacing terasa aneh (talent harus memperlambat ucapan tidak natural, atau ada jeda kosong). JANGAN melebihi max_words, tapi JUGA JANGAN terlalu jauh di bawahnya — isi ruang bicara yang tersedia dengan konten yang relevan (detail produk tambahan, penekanan USP, transisi kalimat) alih-alih memotong terlalu pendek.
- Sebelum submit, HITUNG jumlah kata script_narration dan pastikan berada di rentang 85%–100% dari max_words scene tersebut.

KARAKTER:
${characterBlock}
${form.useCharacter ? (form.expression === 'auto' ? 'Ekspresi karakter: AI bebas menentukan ekspresi paling sesuai tiap scene.' : `Ekspresi karakter WAJIB: "${EXPRESSIONS.find(e => e.value === form.expression)?.label || form.expression}" sebagai ekspresi DASAR karakter di semua scene (boleh sedikit bervariasi sesuai konteks emosi scene, tapi harus tetap terasa sebagai ekspresi dasar yang sama). PENTING: Tulis deskripsi ekspresi ini dalam kalimat natural di field character_expression (JSON output), JANGAN tulis ulang slug/kode teknis apapun.`) : ''}
${form.useCharacter ? `\nCHARACTER ANCHOR STRING (copy ini verbatim ke awal setiap ai_ready_prompt):\n'${characterAnchor}'\n\nDefinisi: Setiap ai_ready_prompt di SEMUA scene HARUS dimulai dengan string ini persis, baru kemudian deskripsi aksi scene. Tanpa character anchor yang identik di setiap prompt, AI video tool akan menghasilkan karakter berbeda di setiap scene.` : ''}
${hasRefPhotos ? `\nREFERENCE IMAGE INSTRUCTION: User mengupload ${form.referencePhotos.length} foto referensi. Setiap ai_ready_prompt WAJIB sertakan kalimat SINGKAT di [ENVIRONMENT]: "Match uploaded reference photo exactly." — JANGAN pakai kalimat panjang, ini WAJIB dijaga singkat karena ai_ready_prompt punya batas karakter ketat.` : ''}
${hasLocation ? `\nLOKASI YANG HARUS DIGUNAKAN: ${form.locationDescription}. Semua scene HARUS menampilkan lokasi/properti yang SAMA dari sudut pandang berbeda.` : ''}

GAYA VISUAL: ${form.visualStyle === 'auto' ? 'AI bebas menentukan gaya visual paling sesuai niche & platform.' : `WAJIB gunakan gaya visual "${VISUAL_STYLES.find(v => v.value === form.visualStyle)?.label || form.visualStyle}" di SETIAP scene tanpa kecuali — cerminkan gaya ini secara eksplisit dalam kalimat natural di visual_description, camera_direction, dan field "visual_style" pada global_style. JANGAN tulis ulang slug/kode teknis apapun ke output JSON.`}
BACKSOUND: ${form.backsound === 'auto' ? 'AI bebas menentukan backsound/musik paling sesuai mood video.' : `WAJIB gunakan backsound/musik bergaya "${BACKSOUNDS.find(b => b.value === form.backsound)?.label || form.backsound}" — cerminkan dalam kalimat natural di field "music_direction" dan "sfx_palette" pada global_style. JANGAN tulis ulang slug/kode teknis apapun ke output JSON.`}
TONE: ${form.narrativeTone === 'auto' ? 'AI bebas menentukan tone narasi paling sesuai niche & audience.' : `WAJIB gunakan tone narasi "${NARRATIVE_TONES.find(t => t.value === form.narrativeTone)?.label || form.narrativeTone}" secara konsisten di SEMUA script_narration dan field "overall_emotional_arc" pada global_style — bukan cuma di salah satu scene. JANGAN tulis ulang slug/kode teknis apapun ke output JSON.`}

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

PENEKANAN UNTUK GAYA "${effectiveStyle.label}": Prioritaskan elemen viral berikut dari daftar di atas: ${effectiveStyle.viralElementEmphasis.join(', ')}.

KONSISTENSI WAJIB:
- Color temperature identik semua scene
- Karakter identik (penampilan tidak berubah)
- Semua scene menampilkan properti/lokasi yang SAMA dari sudut pandang berbeda — jangan ganti lokasi secara acak${hasLocation ? `. Gunakan variasi shot dari properti yang sama: Scene Hook: exterior shot properti. Scene Body: interior room shots dari properti yang sama. Scene CTA: karakter di depan/dalam properti dengan signage/detail yang sama. Referensi visual environment: ${form.locationDescription}` : ''}${hasRefPhotos ? ' — Environment harus match foto yang diupload user.' : ''}
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
    "niche": "${form.niche}",
    "platform_primary": "${platformPrimer}",
    "platform_all": ["array"],
    "ai_video_tool": "${form.aiTool}",
    "total_scenes": ${form.sceneCount},
    "total_duration_seconds": ${durations.reduce((a, b) => a + b, 0)},
    "ratio": "${form.ratio}",
    "language": "${form.language}",
    "viral_elements_used": ["array min 4"],
    "viral_score_estimate": "XX/100 — justifikasi",
    "hook_type": "${form.hookType}",
    "cta_type": "${form.ctaType}",
    "cta_keyword": ${form.ctaKeyword ? `"${form.ctaKeyword}"` : 'null'}
  },
  "global_style": {
    "visual_style": "string — HARUS mencerminkan gaya: ${form.visualStyle === 'auto' ? 'sesuai pilihan AI' : (VISUAL_STYLES.find(v => v.value === form.visualStyle)?.label || form.visualStyle)}",
    "cinematography_detail": "string teknis",
    "color_palette_dominant": ["#hex — WAJIB salah satu persis: ${form.brandColor || 'pilihan AI'}", "#hex", "#hex"],
    "color_palette_accent": ["#hex${form.avoidColor ? ` — JANGAN gunakan warna ini atau serupa: ${form.avoidColor}` : ''}"],
    "lighting_style": "string",
    "camera_style_global": "string",
    "music_direction": "string dengan BPM dan mood — HARUS mencerminkan gaya: ${form.backsound === 'auto' ? 'sesuai pilihan AI' : (BACKSOUNDS.find(b => b.value === form.backsound)?.label || form.backsound)}",
    "sfx_palette": "string",
    "overall_emotional_arc": "${effectiveStyle.getSceneRole(0, form.sceneCount)}: X → ... → ${effectiveStyle.getSceneRole(form.sceneCount - 1, form.sceneCount)}: Z (ikuti PERAN TIAP SCENE di Blok 3) — HARUS mencerminkan tone: ${form.narrativeTone === 'auto' ? 'sesuai pilihan AI' : (NARRATIVE_TONES.find(t => t.value === form.narrativeTone)?.label || form.narrativeTone)}",
    "subtitle_style": "string — HARUS: ${form.subtitleStyle && form.subtitleStyle !== 'None' ? form.subtitleStyle : 'AI bebas tentukan atau none'}",
    "font_overlay_style": "string"
  },
  "character_sheet": {
    "used": ${form.useCharacter},
    "description": "HRUS sama persis dengan CHARACTER ANCHOR STRING dari Blok 3 — ini yang akan di-copy verbatim ke awal setiap ai_ready_prompt.${form.useCharacter ? ` Contoh: '${characterAnchor}'` : ''}",
    "visual_anchor_note": ${form.visualAnchor ? `"${form.visualAnchor}"` : 'null'},
    "consistency_note": "EDITOR: Setiap ai_ready_prompt di semua scene WAJIB dimulai dengan character_sheet.description yang SAMA PERSIS kata per kata. Ini KRITIS untuk konsistensi karakter di Veo3 dan AI video tool lain yang tidak mendukung reference image."
  },
  "scenes": [
    {
      "scene_number": 1,
      "scene_type": "${effectiveStyle.getSceneRole(0, form.sceneCount).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}",
      "duration_seconds": ${durations[0]},
      "max_words": ${getLipsyncSpec(durations[0], narrationWPM).maxWords},
      "speech_pace": "${getLipsyncSpec(durations[0], narrationWPM).pace}",
      "ai_ready_prompt": "WAJIB DIISI, string, max ${charLimit} karakter. Format singkat: [CHARACTER ANCHOR] [SCENE] [CAMERA] [ENVIRONMENT] [MOOD] [durasi+rasio] [DIALOGUE: ${spokenLanguageLabel}]",
      "script_narration": "Teks narasi, WAJIB PERSIS maks ${getLipsyncSpec(durations[0], narrationWPM).maxWords} kata (hitung manual sebelum submit) — bahasa HARUS sesuai [BLOK 2: BAHASA], gaya bicara cepat & jelas sesuai GAYA BICARA & ARTIKULASI di atas",
      "script_subtitle": null,
      "script_word_count": 0,
      "script_fit_confirmation": "X kata, muat Y detik pace Z",
      "visual_description": "deskripsi visual scene dalam Bahasa Indonesia",
      "camera_direction": "shot + movement + angle",
      "character_action": "string",
      "character_expression": "string — deskripsi natural ekspresi wajah/tubuh karakter dalam Bahasa Indonesia, JANGAN gunakan kode/slug teknis",
      "text_overlay": "string dengan timing, atau none",
      "sound_design": "string",
      "transition_to_next": "string",
      "viral_element_in_scene": "string",
      "cliffhanger_to_next": "string"
    }
    // ... repeat for all ${form.sceneCount} scenes, scene_type sesuai PERAN TIAP SCENE di atas (contoh scene terakhir: "${effectiveStyle.getSceneRole(form.sceneCount - 1, form.sceneCount).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}")
  ],
  "production_notes": {
    "caption_variations": [
      {
        "caption_text": "1 kalimat caption pembuka yang menarik dan unik",
        "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
      }
      // WAJIB DIISI: generate PERSIS ${form.captionVariationCount} object di array ini. Setiap object = 1 caption_text UNIK + PERSIS 5 hashtags (array string, masing-masing diawali #). Antar object, caption_text dan hashtags HARUS berbeda satu sama lain (bukan pengulangan). Field ini TIDAK BOLEH kosong atau kurang dari ${form.captionVariationCount} object.
    ],
    "lipsync_summary": "ringkasan pace per scene",
    "editing_sequence": "urutan scene dengan transisi",
    "color_grade_lut": "rekomendasi LUT",
    "thumbnail_concept": "deskripsi thumbnail optimal",
    "posting_time_suggestion": "waktu posting optimal",
    "ab_test_suggestion": "variasi hook alternatif"
  }
}

GUARDRAIL: Output JSON murni. Mulai {. Akhiri }. Tidak ada teks lain.
Generate SEMUA ${form.sceneCount} scene lengkap.
=== END OF VIRALFRAME MASTER PROMPT v4.1 ===`;
}
