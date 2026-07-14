import { describe, it, expect } from 'vitest';
import { validateSceneData, type SceneRegenExpectation } from '../sceneRegen';
import type { SceneData } from '../../types';

function makeExpectation(overrides?: Partial<SceneRegenExpectation>): SceneRegenExpectation {
  return {
    sceneNumber: 1,
    durationSeconds: 10,
    maxWords: 25,
    charLimit: 500,
    characterAnchor: '',
    locationRef: null,
    characterBindingSentence: null,
    characterRefFileName: '',
    ...overrides,
  };
}

function makeScene(overrides?: Partial<SceneData>): SceneData {
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

describe('validateSceneData — dialogue tag', () => {
  it('warns when ai_ready_prompt lacks [DIALOGUE: ...] tag', () => {
    const result = validateSceneData(makeScene(), makeExpectation());
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(true);
  });

  it('does not warn when [DIALOGUE: ...] tag is present', () => {
    const result = validateSceneData(
      makeScene({ ai_ready_prompt: 'A woman applying skincare. [DIALOGUE: Bahasa Indonesia]' }),
      makeExpectation(),
    );
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(false);
  });

  it('does not warn for visual_shock scene 1 with empty narration', () => {
    const result = validateSceneData(
      makeScene({
        ai_ready_prompt: 'Explosion and bright flash fill the screen.',
        script_narration: '',
        max_words: 15,
      }),
      makeExpectation({ sceneNumber: 1 }),
      'visual_shock',
    );
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(false);
  });

  it('warns for visual_shock scene 2 (not first scene) despite empty narration', () => {
    const result = validateSceneData(
      makeScene({
        scene_number: 2,
        ai_ready_prompt: 'The aftermath of the explosion.',
        script_narration: '',
        max_words: 15,
      }),
      makeExpectation({ sceneNumber: 2 }),
      'visual_shock',
    );
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(true);
  });

  it('warns for visual_shock scene 1 when narration is long (not silent)', () => {
    const result = validateSceneData(
      makeScene({
        ai_ready_prompt: 'Explosion scene without tag.',
        script_narration: 'Ledakan ini sangat dahsyat sekali dan mengejutkan semua orang yang ada di sekitar kita.',
        max_words: 25,
      }),
      makeExpectation({ sceneNumber: 1 }),
      'visual_shock',
    );
    expect(result.warnings.some(w => w.includes('[DIALOGUE:'))).toBe(true);
  });
});
