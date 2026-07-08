import { FormData } from '../types';
import { getLipsyncSpec } from './lipsync';
import { NICHE_DATA, AI_TOOL_FORMAT, PLATFORM_BEHAVIOR, AI_TOOLS } from './maps';

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

export function compileMasterPrompt(form: FormData): string {
  const durations = getSceneDurations(form);
  const nicheData = NICHE_DATA[form.niche] || { psikografis: '-', painPoint: '-' };
  const toolData = AI_TOOLS.find(t => t.value === form.aiTool);
  const charLimit = toolData?.charLimit || 400;
  const toolFormat = AI_TOOL_FORMAT[form.aiTool] || '';
  const spokenLanguageLabel = BAHASA_LABEL[form.language] || 'Bahasa Indonesia';

  const platformList = form.platforms.join(', ');
  const platformPrimer = form.platforms[0] || '-';
  const platformBehavior = PLATFORM_BEHAVIOR[platformPrimer] || '-';

  const sceneDurationTable = durations.map((d, i) => {
    const spec = getLipsyncSpec(d);
    const type = i === 0 ? 'Hook' : i === form.sceneCount - 1 ? 'CTA' : 'Body';
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

  return `=== VIRALFRAME MASTER PROMPT v4 ===
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

PERAN 3 — DIRECT RESPONSE COPYWRITER:
Menulis narasi berbasis AIDA + psikologi persuasi: social proof,
scarcity, authority, reciprocity, commitment. Setiap kata dipilih
dengan tujuan.

PERAN 4 — AI VIDEO PROMPT ENGINEER untuk ${form.aiTool}:
  Menulis ai_ready_prompt sebagai deskripsi scene yang natural, netral, dan policy-safe untuk ${form.aiTool}.
  Batas karakter: ${charLimit} per scene.
  Format: ${toolFormat}
  KRITIS: ai_ready_prompt HANYA berisi deskripsi scene. JANGAN sertakan instruksi meta (seperti "WAJIB", "KRITIS", "JANGAN LUPA") di dalamnya. JANGAN sertakan klaim pemasaran, testimonial, atau ajakan bertindak di ai_ready_prompt — itu semua masuk ke script_narration, BUKAN ai_ready_prompt.
  AUDIO/DIALOG: ai_ready_prompt WAJIB tetap diisi seperti biasa (deskripsi scene dalam English, sesuai format di atas). Setelah deskripsi scene selesai, tambahkan SATU baris tambahan persis di akhir: [DIALOGUE: ${spokenLanguageLabel}]. Contoh lengkap: "...[MOOD: confident]. [10s, 9:16 vertical frame]. [DIALOGUE: ${spokenLanguageLabel}]". Field ai_ready_prompt TIDAK BOLEH kosong atau hilang — ini field WAJIB di setiap scene.

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
STRUKTUR: Scene 1 = Hook (${form.hookType}) · Scene 2–${form.sceneCount - 1} = Body · Scene ${form.sceneCount} = CTA (${form.ctaType})
${form.ctaType === 'comment_keyword' && form.ctaKeyword ? `CTA Keyword: "${form.ctaKeyword}"` : ''}

LIPSYNC PER SCENE:
${sceneDurationTable}

KARAKTER:
${characterBlock}
${form.useCharacter ? `Ekspresi default: ${form.expression}` : ''}
${form.useCharacter ? `\nCHARACTER ANCHOR STRING (copy ini verbatim ke awal setiap ai_ready_prompt):\n'${characterAnchor}'\n\nDefinisi: Setiap ai_ready_prompt di SEMUA scene HARUS dimulai dengan string ini persis, baru kemudian deskripsi aksi scene. Tanpa character anchor yang identik di setiap prompt, AI video tool akan menghasilkan karakter berbeda di setiap scene.` : ''}
${hasRefPhotos ? `\nREFERENCE IMAGE INSTRUCTION: User telah mengupload ${form.referencePhotos.length} foto referensi properti/produk. Setiap ai_ready_prompt WAJIB menyertakan instruksi untuk mem-atch visual dari foto referensi tersebut. Tulis di section [ENVIRONMENT]: "This scene MUST visually reference the uploaded property/product photo. Match the exact building facade, color scheme, architectural details, and surroundings from the reference image. Do not invent generic environments."` : ''}
${hasLocation ? `\nLOKASI YANG HARUS DIGUNAKAN: ${form.locationDescription}. Semua scene HARUS menampilkan lokasi/properti yang SAMA dari sudut pandang berbeda.` : ''}

GAYA VISUAL: ${form.visualStyle}
BACKSOUND: ${form.backsound}
TONE: ${form.narrativeTone}

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
- Semua scene menampilkan properti/lokasi yang SAMA dari sudut pandang berbeda — jangan ganti lokasi secara acak${hasLocation ? `. Gunakan variasi shot dari properti yang sama: Scene Hook: exterior shot properti. Scene Body: interior room shots dari properti yang sama. Scene CTA: karakter di depan/dalam properti dengan signage/detail yang sama. Referensi visual environment: ${form.locationDescription}` : ''}${hasRefPhotos ? ' — Environment harus match foto yang diupload user.' : ''}
- Satu voice narasi, USP ditegaskan 2x
- Musik satu tema, SFX satu palet mood
- Eskalasi: Hook (pancing) → Body (bangun) → CTA (ledakkan)
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
    "used": ${form.useCharacter},
    "description": "HRUS sama persis dengan CHARACTER ANCHOR STRING dari Blok 3 — ini yang akan di-copy verbatim ke awal setiap ai_ready_prompt.${form.useCharacter ? ` Contoh: '${characterAnchor}'` : ''}",
    "visual_anchor_note": ${form.visualAnchor ? `"${form.visualAnchor}"` : 'null'},
    "consistency_note": "EDITOR: Setiap ai_ready_prompt di semua scene WAJIB dimulai dengan character_sheet.description yang SAMA PERSIS kata per kata. Ini KRITIS untuk konsistensi karakter di Veo3 dan AI video tool lain yang tidak mendukung reference image."
  },
  "scenes": [
    {
      "scene_number": 1,
      "scene_type": "hook",
      "duration_seconds": ${durations[0]},
      "max_words": ${getLipsyncSpec(durations[0]).maxWords},
      "speech_pace": "${getLipsyncSpec(durations[0]).pace}",
      "ai_ready_prompt": "WAJIB DIISI, string, max ${charLimit} karakter. Format singkat: [CHARACTER ANCHOR] [SCENE] [CAMERA] [ENVIRONMENT] [MOOD] [durasi+rasio] [DIALOGUE: ${spokenLanguageLabel}]",
      "script_narration": "Teks narasi (maks ${getLipsyncSpec(durations[0]).maxWords} kata) — bahasa HARUS sesuai [BLOK 2: BAHASA]",
      "script_subtitle": null,
      "script_word_count": 0,
      "script_fit_confirmation": "X kata, muat Y detik pace Z",
      "visual_description": "deskripsi visual scene dalam Bahasa Indonesia",
      "camera_direction": "shot + movement + angle",
      "character_action": "string",
      "character_expression": "string",
      "text_overlay": "string dengan timing, atau none",
      "sound_design": "string",
      "transition_to_next": "string",
      "viral_element_in_scene": "string",
      "cliffhanger_to_next": "string"
    }
    // ... repeat for all ${form.sceneCount} scenes. Scene terakhir scene_type: "cta"
  ],
  "production_notes": {
    "lipsync_summary": "ringkasan pace per scene",
    "editing_sequence": "urutan scene dengan transisi",
    "color_grade_lut": "rekomendasi LUT",
    "thumbnail_concept": "deskripsi thumbnail optimal",
    "caption_first_line": "hook caption",
    "hashtag_strategy": {
      "primary": ["3 hashtag"],
      "secondary": ["2–3 hashtag"],
      "niche": ["3–5 hashtag niche"]
    },
    "posting_time_suggestion": "waktu posting optimal",
    "ab_test_suggestion": "variasi hook alternatif"
  }
}

GUARDRAIL: Output JSON murni. Mulai {. Akhiri }. Tidak ada teks lain.
Generate SEMUA ${form.sceneCount} scene lengkap.
=== END OF VIRALFRAME MASTER PROMPT v4 ===`;
}
