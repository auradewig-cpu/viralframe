import { CompileContext } from './context';
import { getLipsyncSpec } from '../lipsync';
import { VISUAL_STYLES, BACKSOUNDS, NARRATIVE_TONES, AI_TOOLS, NICHES } from '../maps';

export function buildSchemaBlock(ctx: CompileContext): string {
  const { form, effectiveStyle, durations, charLimit, spokenLanguageLabel, isFacelessPov, scene1RefJson, characterSheetUsed, characterAnchor, narrationWPM } = ctx;

  const firstToolFormat = (form.aiTool === 'google_flow' || form.aiTool === 'veo3')
    ? `Format singkat: [CHARACTER ANCHOR] [SCENE] [CAMERA] [ENVIRONMENT] [MOOD] [Subjek] says, \\"<script_narration verbatim>\\" (no subtitles). [durasi+rasio]`
    : `Format singkat: [CHARACTER ANCHOR] [SCENE] [CAMERA] [ENVIRONMENT] [MOOD] [durasi+rasio] [DIALOGUE: ${spokenLanguageLabel}]`;

  return `

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
    "platform_primary": "${form.platforms[0] || '-'}",
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
    "overall_emotional_arc": "${effectiveStyle.getSceneRole(0, form.sceneCount, form)}: X → ... → ${effectiveStyle.getSceneRole(form.sceneCount - 1, form.sceneCount, form)}: Z (ikuti PERAN TIAP SCENE di Blok 3) — HARUS mencerminkan tone: ${form.narrativeTone === 'auto' ? 'sesuai pilihan AI' : (NARRATIVE_TONES.find(t => t.value === form.narrativeTone)?.label || form.narrativeTone)}",
    "subtitle_style": "string — HARUS: ${form.subtitleStyle && form.subtitleStyle !== 'None' ? form.subtitleStyle : 'AI bebas tentukan atau none'}",
    "font_overlay_style": "string"
  },
  "character_sheet": {
    "used": ${characterSheetUsed},
    "description": "WAJIB berupa TERJEMAHAN ENGLISH presisi dan tidak ambigu dari CHARACTER ANCHOR STRING SUMBER di Blok 3 (ikuti instruksi & contoh terjemahan istilah visual di atas) — BUKAN salinan mentah kalau sumbernya bercampur Bahasa Indonesia. Inilah string yang akan di-copy verbatim kata-per-kata ke awal SETIAP ai_ready_prompt.${characterSheetUsed ? ` Bahan mentah sebelum diterjemahkan: '${characterAnchor}'` : ''}",
    "visual_anchor_note": ${form.visualAnchor ? `"${form.visualAnchor}"` : 'null'},
    "consistency_note": "EDITOR: Setiap ai_ready_prompt di semua scene WAJIB dimulai dengan character_sheet.description yang SAMA PERSIS kata per kata.${isFacelessPov ? ' Ini KRITIS untuk konsistensi tangan (warna kulit, kuku, aksesori) di mode POV Faceless — wajah TIDAK BOLEH tampil di scene manapun.' : ' Ini KRITIS untuk konsistensi karakter di Veo3 dan AI video tool lain yang tidak mendukung reference image.'}"
  },
  "scenes": [
    {
      "scene_number": 1,
      "scene_type": "${effectiveStyle.getSceneRole(0, form.sceneCount, form).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}",
      "duration_seconds": ${durations[0]},
      "max_words": ${getLipsyncSpec(durations[0], narrationWPM).maxWords},
      "speech_pace": "${getLipsyncSpec(durations[0], narrationWPM).pace}",
      "ai_ready_prompt": "WAJIB DIISI, string, max ${charLimit} karakter. ${firstToolFormat}",
      "script_narration": "Teks narasi, WAJIB PERSIS maks ${getLipsyncSpec(durations[0], narrationWPM).maxWords} kata (hitung manual sebelum submit) — bahasa HARUS sesuai [BLOK 2: BAHASA], gaya bicara cepat & jelas sesuai GAYA BICARA & ARTIKULASI di atas",
      "script_subtitle": null,
      "script_word_count": 0,
      "script_fit_confirmation": "X kata, muat Y detik pace Z",
      "visual_description": "deskripsi visual scene dalam Bahasa Indonesia",
      "camera_direction": "${isFacelessPov ? 'shot + movement + angle — WAJIB sebutkan eksplisit \\"first-person POV, hand entering frame from bottom\\", TANPA wajah/cermin yang menampilkan wajah' : 'shot + movement + angle'}",
      "character_action": "string",
      "character_expression": "${isFacelessPov ? 'string — deskripsi natural GESTUR TANGAN (bukan ekspresi wajah) dalam Bahasa Indonesia, JANGAN sebut wajah/ekspresi wajah sama sekali' : 'string — deskripsi natural ekspresi wajah/tubuh karakter dalam Bahasa Indonesia, JANGAN gunakan kode/slug teknis'}",
      "text_overlay": "string TANPA timing/durasi/timestamp apa pun (JANGAN tulis pola seperti '(5s)' atau '(0:01-0:05)') — durasi sudah tercakup di duration_seconds scene ini. Hanya teks murni yang akan tampil di layar, atau 'none'.",
      "sound_design": "string",
      "transition_to_next": "string",
      "viral_element_in_scene": "string",
      "cliffhanger_to_next": "string",
      "reference_image": ${scene1RefJson}
    }
    // ... repeat for all ${form.sceneCount} scenes, scene_type sesuai PERAN TIAP SCENE di atas (contoh scene terakhir: "${effectiveStyle.getSceneRole(form.sceneCount - 1, form.sceneCount, form).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}")
    // "reference_image" contoh di atas HANYA untuk scene 1 — kalau ada REFERENSI LOKASI/PRODUK PER SCENE
    // di Blok 3, reference_image WAJIB BERBEDA per scene mengikuti tabel itu persis (JANGAN disalin rata
    // ke semua scene). Kalau tidak ada tabel itu, reference_image IDENTIK PERSIS di semua scene.
  ],
  "production_notes": {
    "caption_variations": [
      {
        "caption_text": "1 kalimat caption pembuka yang menarik dan unik",
        "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
      }
      // WAJIB DIISI: generate PERSIS ${form.captionVariationCount} object di array ini. Setiap object = 1 caption_text UNIK + PERSIS 5 hashtags (array string, masing-masing diawali #). Antar object, caption_text dan hashtags HARUS berbeda satu sama lain (bukan pengulangan). Field ini TIDAK BOLEH kosong atau kurang dari ${form.captionVariationCount} object.${form.contentGoal === 'conversion' ? `
      // AFFILIATE/KOMERSIAL DISCLOSURE (WAJIB untuk contentGoal=conversion): Setiap caption WAJIB menyertakan penanda komersial yang wajar di akhir caption_text ATAU di hashtags (pilih yang natural: "#ad", "#affiliate", atau frasa ringan seperti "yang dibeli lewat link ini mendukung channel").` : ''}
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
