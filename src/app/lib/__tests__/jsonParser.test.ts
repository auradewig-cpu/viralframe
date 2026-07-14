import { describe, it, expect } from 'vitest';
import { parseAiResponse, countWords, validateVideoJSON, hasDialogueTag } from '../jsonParser';
import type { VideoJSON, FormData } from '../../types';
import { DEFAULT_FORM } from '../../types';

// ── Fixture builder ────────────────────────────────────────────

function makeScene(overrides?: Record<string, unknown>) {
  return {
    scene_number: 1,
    scene_type: 'hook',
    duration_seconds: 10,
    max_words: 25,
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
    viral_element_in_scene: 'hook',
    cliffhanger_to_next: 'none',
    ai_ready_prompt: 'A woman applying skincare in a bright bathroom.',
    ...overrides,
  };
}

function makeMinimalVideoJSON(overrides?: Record<string, unknown>): VideoJSON {
  return {
    video_metadata: {
      title: 'Test',
      niche: 'fashion_beauty',
      platform_primary: 'tiktok',
      platform_all: ['tiktok'],
      ai_video_tool: 'veo3',
      total_scenes: 1,
      total_duration_seconds: 10,
      ratio: '9:16',
      language: 'id',
      viral_elements_used: ['hook'],
      viral_score_estimate: '70/100',
      hook_type: 'shock_fact',
      cta_type: 'link_bio',
      cta_keyword: null,
    },
    global_style: {
      visual_style: 'modern',
      cinematography_detail: 'cinematic',
      color_palette_dominant: ['#fff'],
      color_palette_accent: ['#000'],
      lighting_style: 'natural',
      camera_style_global: 'handheld',
      music_direction: 'upbeat',
      sfx_palette: 'modern',
      overall_emotional_arc: 'happy',
      subtitle_style: 'none',
      font_overlay_style: 'sans',
    },
    character_sheet: {
      used: false,
      description: '',
      visual_anchor_note: null,
      consistency_note: '',
    },
    scenes: [makeScene()],
    production_notes: {
      caption_variations: [
        { caption_text: 'Test caption', hashtags: ['#test'] },
      ],
      lipsync_summary: 'good',
      editing_sequence: 'cut',
      color_grade_lut: 'none',
      thumbnail_concept: 'concept',
      posting_time_suggestion: 'evening',
      ab_test_suggestion: 'test',
    },
    ...overrides,
  };
}

function makeForm(overrides?: Partial<FormData>): FormData {
  return { ...DEFAULT_FORM, ...overrides };
}

// ── parseAiResponse ────────────────────────────────────────────

describe('parseAiResponse', () => {
  it('parses pure JSON string', () => {
    const input = JSON.stringify(makeMinimalVideoJSON());
    const result = parseAiResponse(input);
    expect(result).not.toBeNull();
    expect(result!.video_metadata.title).toBe('Test');
  });

  it('extracts JSON wrapped in markdown fence', () => {
    const input = '```json\n' + JSON.stringify(makeMinimalVideoJSON()) + '\n```';
    const result = parseAiResponse(input);
    expect(result).not.toBeNull();
    expect(result!.video_metadata.title).toBe('Test');
  });

  it('extracts JSON with leading text', () => {
    const input = 'Berikut adalah JSON-nya:\n' + JSON.stringify(makeMinimalVideoJSON());
    const result = parseAiResponse(input);
    expect(result).not.toBeNull();
  });

  it('extracts JSON with trailing text', () => {
    const input = JSON.stringify(makeMinimalVideoJSON()) + '\n\nSemoga membantu!';
    const result = parseAiResponse(input);
    expect(result).not.toBeNull();
  });

  it('returns null for non-JSON garbage', () => {
    expect(parseAiResponse('Halo, saya AI. Saya tidak bisa menghasilkan JSON hari ini.')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseAiResponse('')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseAiResponse('{ this is not json }')).toBeNull();
  });
});

// ── countWords ─────────────────────────────────────────────────

describe('countWords', () => {
  it('counts words in a normal sentence', () => {
    expect(countWords('Coba produk terbaru kami')).toBe(4);
  });

  it('handles multiple spaces', () => {
    expect(countWords('hello   world')).toBe(2);
  });

  it('handles leading/trailing spaces', () => {
    expect(countWords('  hello world  ')).toBe(2);
  });

  it('returns 0 for null', () => {
    expect(countWords(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(countWords(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });
});

// ── hasDialogueTag ─────────────────────────────────────────────

describe('hasDialogueTag', () => {
  it('returns true when [DIALOGUE: is present', () => {
    expect(hasDialogueTag('... [DIALOGUE: Bahasa Indonesia]')).toBe(true);
  });

  it('returns true for tag with different language', () => {
    expect(hasDialogueTag('... [DIALOGUE: English]')).toBe(true);
  });

  it('returns false when tag is missing', () => {
    expect(hasDialogueTag('A woman applying skincare in a bright bathroom.')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasDialogueTag('')).toBe(false);
  });
});

// ── validateVideoJSON ──────────────────────────────────────────

describe('validateVideoJSON', () => {
  it('valid JSON passes without errors', () => {
    const result = validateVideoJSON(makeMinimalVideoJSON(), 1, 1, 'veo3');
    expect(result.valid).toBe(true);
  });

  it('returns error when scene count mismatches', () => {
    const json = makeMinimalVideoJSON({ scenes: [makeScene(), makeScene({ scene_number: 2 })] });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Jumlah scene'))).toBe(true);
  });

  it('returns error when video_metadata is missing', () => {
    const json = makeMinimalVideoJSON({ video_metadata: undefined });
    const result = validateVideoJSON(json, 1, 1);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('video_metadata'))).toBe(true);
  });

  it('returns error when scenes is not an array', () => {
    const json = makeMinimalVideoJSON({ scenes: null });
    const result = validateVideoJSON(json, 1, 1);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('scenes'))).toBe(true);
  });

  it('returns warning when narration exceeds max_words (hitung aktual)', () => {
    const json = makeMinimalVideoJSON({
      scenes: [makeScene({
        // 30 kata, max_words=25
        script_narration: 'satu dua tiga empat lima enam tujuh delapan sembilan sepuluh sebelas dua belas tiga belas empat belas lima belas enam belas tujuh belas delapan belas sembilan belas dua puluh dua puluh satu dua puluh dua dua puluh tiga dua puluh empat dua puluh lima dua puluh enam dua puluh tujuh dua puluh delapan dua puluh sembilan tiga puluh',
        max_words: 25,
      })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('melebihi batas lipsync'))).toBe(true);
  });

  it('returns warning when narration is far below 60% of max_words', () => {
    const json = makeMinimalVideoJSON({
      scenes: [makeScene({
        script_narration: 'Halo.',
        max_words: 25,
      })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('jauh di bawah target'))).toBe(true);
  });

  it('does not warn when narration is at ~88% of max_words', () => {
    // 22 words with max_words=25 → 88%, between 60% and 100% → no warning
    const json = makeMinimalVideoJSON({
      scenes: [makeScene({
        script_narration: 'a b c d e f g h i j k l m n o p q r s t u v',
        max_words: 25,
      })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('melebihi batas lipsync'))).toBe(false);
    expect(result.warnings.some(w => w.includes('jauh di bawah target'))).toBe(false);
  });

  it('returns warning when ai_ready_prompt exceeds tool char limit', () => {
    const json = makeMinimalVideoJSON({
      scenes: [makeScene({ ai_ready_prompt: 'x'.repeat(600) })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    // veo3 has charLimit 500
    expect(result.warnings.some(w => w.includes('melebihi batas tool'))).toBe(true);
  });

  it('returns warning when scene missing reference_image but expectHasRefImage is true', () => {
    const json = makeMinimalVideoJSON({
      scenes: [makeScene({ reference_image: undefined })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3', true);
    expect(result.warnings.some(w => w.includes('reference_image'))).toBe(true);
  });

  it('returns error when caption_variations is empty', () => {
    const json = makeMinimalVideoJSON({
      production_notes: { caption_variations: [] },
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('caption_variations'))).toBe(true);
  });

  it('returns error when caption_variations missing', () => {
    const json = makeMinimalVideoJSON({
      production_notes: { caption_variations: undefined },
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.valid).toBe(false);
  });

  it('returns warning when caption_variations count mismatches', () => {
    const json = makeMinimalVideoJSON({
      production_notes: {
        caption_variations: [
          { caption_text: 'a', hashtags: ['#a'] },
          { caption_text: 'b', hashtags: ['#b'] },
        ],
      },
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('variasi caption'))).toBe(true);
  });

  it('returns warning when caption caption_text empty', () => {
    const json = makeMinimalVideoJSON({
      production_notes: {
        caption_variations: [
          { caption_text: '', hashtags: ['#a'] },
        ],
      },
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    // '' is falsy, so it becomes an error
    expect(result.errors.some(e => e.includes('caption_text'))).toBe(true);
  });

  it('returns error when hashtags empty', () => {
    const json = makeMinimalVideoJSON({
      production_notes: {
        caption_variations: [
          { caption_text: 'test', hashtags: [] },
        ],
      },
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.errors.some(e => e.includes('hashtags'))).toBe(true);
  });

  it('returns warning when ai_ready_prompt does not start with character anchor', () => {
    const json = makeMinimalVideoJSON({
      character_sheet: {
        used: true,
        description: '25-year-old Southeast Asian female',
        visual_anchor_note: null,
        consistency_note: 'must match',
      },
      scenes: [makeScene({ ai_ready_prompt: 'A woman in a kitchen.' })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('CHARACTER ANCHOR'))).toBe(true);
  });

  // ── Dialogue tag [DIALOGUE: ...] ─────────────────────────

  it('warns when ai_ready_prompt lacks [DIALOGUE: ...] tag', () => {
    const json = makeMinimalVideoJSON({
      scenes: [makeScene({ ai_ready_prompt: 'A woman applying skincare in a bright bathroom.' })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(true);
  });

  it('does not warn when [DIALOGUE: ...] tag is present', () => {
    const json = makeMinimalVideoJSON({
      scenes: [makeScene({ ai_ready_prompt: 'A woman applying skincare in a bright bathroom. [DIALOGUE: Bahasa Indonesia]' })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(false);
  });

  it('does not warn for visual_shock scene 1 with empty narration', () => {
    const json = makeMinimalVideoJSON({
      video_metadata: {
        ...makeMinimalVideoJSON().video_metadata,
        hook_type: 'visual_shock',
      },
      scenes: [makeScene({
        ai_ready_prompt: 'Explosion and bright flash fill the screen.',
        script_narration: '',
        max_words: 15,
      })],
    });
    const result = validateVideoJSON(json, 1, 1, 'veo3');
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(false);
  });

  it('warns for visual_shock scene 2 (not first scene) despite empty narration', () => {
    const json = makeMinimalVideoJSON({
      video_metadata: {
        ...makeMinimalVideoJSON().video_metadata,
        hook_type: 'visual_shock',
      },
      scenes: [
        makeScene({ scene_number: 1, ai_ready_prompt: 'Explosion. [DIALOGUE: Bahasa Indonesia]', script_narration: '' }),
        makeScene({ scene_number: 2, ai_ready_prompt: 'The aftermath of the explosion.', script_narration: '' }),
      ],
    });
    const result = validateVideoJSON(json, 2, 1, 'veo3');
    expect(result.warnings.filter(w => w.includes('[DIALOGUE:'))).toHaveLength(1);
  });
});
