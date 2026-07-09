export type Provider = 'gemini' | 'groq' | 'openrouter';
export type GenerateMode = 'direct' | 'manual';
export type DurationMode = 'uniform' | 'manual';

export interface FormData {
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
  characterGender: string;
  characterAge: number;
  characterEthnicity: string;
  characterStyle: string;
  characterTraits: string;
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

  // Reference Photos & Location
  referencePhotos: string[];
  locationDescription: string;

  // Mode
  mode: GenerateMode;
}

export interface SceneData {
  scene_number: number;
  scene_type: 'hook' | 'body' | 'cta';
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
  videoJSON: VideoJSON | null;
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
};

export const DEFAULT_FORM: FormData = {
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
  characterGender: 'female',
  characterAge: 25,
  characterEthnicity: 'Southeast Asian',
  characterStyle: 'Kasual Modern',
  characterTraits: '',
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
  locationDescription: '',
  mode: 'direct',
};
