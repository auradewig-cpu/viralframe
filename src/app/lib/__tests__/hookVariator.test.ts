import { describe, it, expect } from 'vitest';
import { buildHookVariantsPrompt, buildHookExpectation, validateHookVariants } from '../hookVariator';
import type { VideoJSON, FormData } from '../../types';
import { DEFAULT_FORM } from '../../types';

function makeForm(overrides?: Partial<FormData>): FormData {
  return { ...DEFAULT_FORM, ...overrides };
}

function makeScene(overrides?: Record<string, unknown>) {
  return {
    scene_number: 1,
    scene_type: 'hook',
    duration_seconds: 10,
    max_words: 23, // getLipsyncSpec(10, 165) = 23
    speech_pace: 'fast',
    script_narration: 'Coba produk terbaru kami untuk kulit sehat.',
    script_subtitle: null,
    script_word_count: 7,
    script_fit_confirmation: 'muat',
    visual_description: 'visual',
    camera_direction: 'close-up',
    character_action: 'talking',
    character_expression: 'happy',
    text_overlay: 'none',
    sound_design: 'upbeat',
    transition_to_next: 'cut',
    viral_element_in_scene: 'shock_fact',
    cliffhanger_to_next: 'none',
    ai_ready_prompt: 'A woman applying skincare.',
    ...overrides,
  };
}

function makeVideoJSON(overrides?: Record<string, unknown>): VideoJSON {
  return {
    video_metadata: {
      title: 'Test', niche: 'fashion_beauty', platform_primary: 'tiktok',
      platform_all: ['tiktok'], ai_video_tool: 'veo3', total_scenes: 3,
      total_duration_seconds: 30, ratio: '9:16', language: 'id',
      viral_elements_used: ['hook'], viral_score_estimate: '70/100',
      hook_type: 'shock_fact', cta_type: 'link_bio', cta_keyword: null,
    },
    global_style: {
      visual_style: 'modern', cinematography_detail: 'cinematic',
      color_palette_dominant: ['#fff'], color_palette_accent: ['#000'],
      lighting_style: 'natural', camera_style_global: 'handheld',
      music_direction: 'upbeat', sfx_palette: 'modern',
      overall_emotional_arc: 'happy', subtitle_style: 'none', font_overlay_style: 'sans',
    },
    character_sheet: { used: false, description: '', visual_anchor_note: null, consistency_note: '' },
    scenes: [makeScene(), makeScene({ scene_number: 2, scene_type: 'body' }), makeScene({ scene_number: 3, scene_type: 'cta' })],
    production_notes: {
      caption_variations: [{ caption_text: 'Test', hashtags: ['#test'] }],
      lipsync_summary: 'good', editing_sequence: 'cut', color_grade_lut: 'none',
      thumbnail_concept: 'concept', posting_time_suggestion: 'evening', ab_test_suggestion: 'test',
    },
    ...overrides,
  };
}

describe('buildHookVariantsPrompt', () => {
  it('memuat jumlah varian yang diminta', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const prompt = buildHookVariantsPrompt(json, form, 165, 3);
    expect(prompt).toContain('3 varian');
    expect(prompt).toContain('"variants"');
  });

  it('melarang teknik hook yang sama dengan scene 1 saat ini', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const prompt = buildHookVariantsPrompt(json, form, 165, 3);
    // Scene 1 saat ini punya viral_element_in_scene='shock_fact'
    // Prompt menyebutnya di konteks "Teknik hook saat ini: shock_fact" TAPI
    // daftar teknik yang diizinkan (baris setelahnya) tidak boleh mencantumkannya.
    const lines = prompt.split('\n');
    const forbiddenLine = lines.find(l => l.includes('open_question')) || '';
    expect(forbiddenLine).not.toContain('shock_fact');
    expect(prompt).toContain('TEKNIK HOOK BERBEDA');
  });

  it('memuat character anchor jika character sheet digunakan', () => {
    const json = makeVideoJSON({
      character_sheet: { used: true, description: '25-year-old Southeast Asian female', visual_anchor_note: null, consistency_note: 'must match' },
    });
    const form = makeForm({ useCharacter: true, talentStyle: 'visible_character', characterGender: 'female', characterAge: 25, characterEthnicity: 'Asia Tenggara', characterStyle: 'Kasual' });
    const prompt = buildHookVariantsPrompt(json, form, 165, 3);
    expect(prompt).toContain('CHARACTER ANCHOR');
    expect(prompt).toContain('25-year-old');
  });

  it('memuat aturan HOOK FRONT-LOADED dan batas kata', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const prompt = buildHookVariantsPrompt(json, form, 165, 3);
    expect(prompt).toContain('HOOK FRONT-LOADED');
    expect(prompt).toContain('85%');
  });
});

describe('validateHookVariants', () => {
  it('jumlah varian sesuai → valid', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const expectation = buildHookExpectation(json, form, 165);
    const output = { variants: [makeScene(), makeScene(), makeScene()] };
    const result = validateHookVariants(output, 3, expectation);
    expect(result.valid).toBe(true);
  });

  it('jumlah varian salah → error', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const expectation = buildHookExpectation(json, form, 165);
    const output = { variants: [makeScene()] };
    const result = validateHookVariants(output, 3, expectation);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Jumlah varian'))).toBe(true);
  });

  it('1 varian rusak → yang lain selamat (warning)', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const expectation = buildHookExpectation(json, form, 165);
    const output = {
      variants: [
        makeScene(),
        makeScene({ script_narration: '' } as Record<string, unknown>),
        makeScene(),
      ],
    };
    const result = validateHookVariants(output, 3, expectation);
    // Valid karena 2 dari 3 varian OK
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('tidak valid'))).toBe(true);
  });

  it('semua varian rusak → error', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const expectation = buildHookExpectation(json, form, 165);
    const output = { variants: [{ scene_number: 99 } as any, { scene_number: 99 } as any, { scene_number: 99 } as any] };
    const result = validateHookVariants(output, 3, expectation);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Semua'))).toBe(true);
  });

  it('variants bukan array → error', () => {
    const json = makeVideoJSON();
    const form = makeForm();
    const expectation = buildHookExpectation(json, form, 165);
    const output = { variants: null } as any;
    const result = validateHookVariants(output, 3, expectation);
    expect(result.valid).toBe(false);
  });
});
