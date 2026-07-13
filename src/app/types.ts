export type Provider = 'gemini' | 'groq' | 'openrouter';
export type GenerateMode = 'direct' | 'manual';
export type DurationMode = 'uniform' | 'manual';
export type TalentStyle = 'visible_character' | 'faceless_pov' | 'product_only';
export type ContentGoal = 'conversion' | 'growth' | 'engagement';

// Referensi lokasi/produk berbasis TEKS (nama file + identitas + keterangan) — dibaca AI video tool
// dari nama file yang disebut user saat attach foto langsung di tool (Google Flow dll), bukan dari
// upload di app ini. role TIDAK disimpan di sini — selalu di-derive dari sceneNumber (lihat
// lib/locationRefs.ts). identity = slug preset dari lib/roomIdentities.ts ('custom' = ketik manual).
export interface LocationRef {
  file: string;
  identity: string;
  keterangan: string;
  sceneNumber: number | null; // null = "Semua scene"
  // Nama file ASLI upload — TIDAK PERNAH berubah, kunci permanen ke store.referenceFiles (blob/preview
  // sesi). undefined = entry manual (diketik user, tidak pernah di-rename otomatis). Lihat
  // lib/canonicalRefNames.ts untuk aturan rename `file` jadi nama kanonik saat identity/scene berubah.
  sourceName?: string;
}

export interface FormData {
  // Content Style (menentukan struktur scene keseluruhan)
  contentStyle: string;
  contentGoal: ContentGoal;

  // Step 1
  niche: string;
  productDescription: string;
  usp: string;
  targetAudience: string[];
  platforms: string[];

  // Step 2
  aiTool: string;
  sceneCount: number;
  durationMode: DurationMode;
  uniformDuration: number;
  sceneDurations: number[];
  ratio: string;
  language: string;

  // Step 3
  hookType: string;
  ctaType: string;
  ctaKeyword: string;
  captionVariationCount: number;
  useCharacter: boolean;
  talentStyle: TalentStyle;
  characterGender: string;
  characterAge: number;
  characterEthnicity: string;
  characterStyle: string;
  characterTraits: string;
  handDescription: string;
  characterBackground: string;
  characterBackgroundCustom: string;
  visualAnchor: string;
  expression: string;
  visualStyle: string;
  backsound: string;
  narrativeTone: string;

  // Advanced
  requiredKeywords: string[];
  blacklistWords: string[];
  referenceStyle: string;
  subtitleStyle: string;
  textOverlay: boolean;
  brandColor: string;
  avoidColor: string;

  // Reference Photos & Location (upload berbasis base64 — JANGAN dikembangkan, lihat CLAUDE.md)
  referencePhotos: string[];
  referenceImageFilename: string;
  locationDescription: string;

  // Multi-Reference Image berbasis TEKS (short_video saja) — nama file + keterangan yang disebut
  // user di AI video tool, BUKAN upload. Lihat lib/locationRefs.ts untuk resolusi & derive role.
  characterRefFile: string;
  // Nama file ASLI upload untuk characterRefFile — pasangan sourceName di LocationRef, dipakai
  // lib/canonicalRefNames.ts. '' = characterRefFile diketik manual (tidak pernah di-rename otomatis).
  characterRefSourceName: string;
  locationRefs: LocationRef[];

  // YouTube Long Form — hanya dipakai content type 'youtube_long'
  targetDurationMinutes: number;
  chapterCount: number;
  channelStyle: string;

  // Thumbnail Pack — hanya dipakai content type 'thumbnail_pack'
  thumbnailTopic: string;
  thumbnailFaceOption: 'with_face' | 'no_face';
  thumbnailConceptCount: number;

  // Content Calendar — hanya dipakai content type 'content_calendar'
  calendarPlatform: string;
  calendarDays: number;
  postsPerDay: number;
  accountInsightText: string;

  // Mode
  mode: GenerateMode;
}

export interface SceneData {
  scene_number: number;
  scene_type: string;
  duration_seconds: number;
  max_words: number;
  speech_pace: string;
  script_narration: string;
  script_subtitle: string | null;
  script_word_count: number;
  script_fit_confirmation: string;
  visual_description: string;
  camera_direction: string;
  character_action: string;
  character_expression: string;
  text_overlay: string;
  sound_design: string;
  transition_to_next: string;
  viral_element_in_scene: string;
  cliffhanger_to_next: string;
  ai_ready_prompt: string;
  reference_image?: { file: string; instruction: string } | null;
}

export interface VideoJSON {
  video_metadata: {
    title: string;
    niche: string;
    platform_primary: string;
    platform_all: string[];
    ai_video_tool: string;
    total_scenes: number;
    total_duration_seconds: number;
    ratio: string;
    language: string;
    viral_elements_used: string[];
    viral_score_estimate: string;
    hook_type: string;
    cta_type: string;
    cta_keyword: string | null;
  };
  global_style: {
    visual_style: string;
    cinematography_detail: string;
    color_palette_dominant: string[];
    color_palette_accent: string[];
    lighting_style: string;
    camera_style_global: string;
    music_direction: string;
    sfx_palette: string;
    overall_emotional_arc: string;
    subtitle_style: string;
    font_overlay_style: string;
  };
  character_sheet: {
    used: boolean;
    description: string;
    visual_anchor_note: string | null;
    consistency_note: string;
  };
  scenes: SceneData[];
  production_notes: {
    caption_variations: {
      caption_text: string;
      hashtags: string[];
    }[];
    lipsync_summary: string;
    editing_sequence: string;
    color_grade_lut: string;
    thumbnail_concept: string;
    posting_time_suggestion: string;
    ab_test_suggestion: string;
  };
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  label: string;
  formData: FormData;
  masterPrompt: string;
  contentTypeId: string;
  // unknown, bukan VideoJSON — tiap content type (short_video, youtube_long, thumbnail_pack,
  // content_calendar) punya skema output sendiri. Gunakan contentTypeId untuk narrow di consumer.
  output: unknown;
}

export interface Template {
  id: string;
  name: string;
  niche: string;
  platform: string;
  sceneCount: number;
  durationPerScene: number;
  hookType: string;
  ctaType: string;
  aiTool: string;
  isPreset: boolean;
  formData?: Partial<FormData>;
  // Opsional untuk backward compat — template lama tanpa field ini diperlakukan sebagai 'short_video'.
  contentTypeId?: string;
}

export interface AppSettings {
  defaultAiTool: string;
  defaultPlatform: string;
  defaultLanguage: string;
  defaultMode: GenerateMode;
  darkMode: boolean;
  geminiApiKey: string;
  geminiModel: string;
  groqApiKey: string;
  openrouterApiKey: string;
  narrationWPM: number;
  puterEnabled: boolean;
  geminiImageModel: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultAiTool: '',
  defaultPlatform: '',
  defaultLanguage: 'id',
  defaultMode: 'direct',
  darkMode: true,
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash',
  groqApiKey: '',
  openrouterApiKey: '',
  narrationWPM: 165,
  puterEnabled: true,
  geminiImageModel: 'gemini-3.1-flash-image',
};

export const DEFAULT_FORM: FormData = {
  contentStyle: 'direct_response',
  contentGoal: 'conversion',
  niche: '',
  productDescription: '',
  usp: '',
  targetAudience: [],
  platforms: [],
  aiTool: 'google_flow',
  sceneCount: 2,
  durationMode: 'uniform',
  uniformDuration: 10,
  sceneDurations: [],
  ratio: '9:16',
  language: 'id',
  hookType: 'auto',
  ctaType: 'auto',
  ctaKeyword: '',
  captionVariationCount: 1,
  useCharacter: false,
  talentStyle: 'product_only',
  characterGender: 'female',
  characterAge: 25,
  characterEthnicity: 'Southeast Asian',
  characterStyle: 'Kasual Modern',
  characterTraits: '',
  handDescription: '',
  characterBackground: 'studio_kreator',
  characterBackgroundCustom: '',
  visualAnchor: '',
  expression: 'auto',
  visualStyle: 'auto',
  backsound: 'auto',
  narrativeTone: 'auto',
  requiredKeywords: [],
  blacklistWords: [],
  referenceStyle: '',
  subtitleStyle: 'None',
  textOverlay: false,
  brandColor: '',
  avoidColor: '',
  referencePhotos: [],
  referenceImageFilename: '',
  locationDescription: '',
  characterRefFile: '',
  characterRefSourceName: '',
  locationRefs: [],
  targetDurationMinutes: 10,
  chapterCount: 5,
  channelStyle: 'edukasi',
  thumbnailTopic: '',
  thumbnailFaceOption: 'no_face',
  thumbnailConceptCount: 3,
  calendarPlatform: 'tiktok',
  calendarDays: 7,
  postsPerDay: 1,
  accountInsightText: '',
  mode: 'direct',
};
