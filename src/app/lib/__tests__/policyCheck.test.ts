import { describe, it, expect } from 'vitest';
import { checkPolicyCompliance, formatPolicyViolations } from '../policyCheck';
import type { VideoJSON } from '../../types';

function makeScene(overrides?: Record<string, unknown>) {
  return {
    scene_number: 1,
    scene_type: 'hook',
    duration_seconds: 10,
    max_words: 25,
    speech_pace: 'fast',
    script_narration: 'Coba produk kami yang terbaik untuk kulitmu.',
    script_subtitle: null,
    script_word_count: 8,
    script_fit_confirmation: '8 kata, muat 10s',
    visual_description: 'some visual',
    camera_direction: 'close-up',
    character_action: 'talking',
    character_expression: 'happy',
    text_overlay: 'none',
    sound_design: 'upbeat',
    transition_to_next: 'cut',
    viral_element_in_scene: 'hook',
    cliffhanger_to_next: 'what next',
    ai_ready_prompt: 'A product demo in a modern kitchen.',
    ...overrides,
  };
}

function makeVideoJSON(overrides?: Record<string, unknown>): VideoJSON {
  return {
    video_metadata: {
      title: 'Test Video',
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
        { caption_text: 'Check out our amazing products!', hashtags: ['#test'] },
      ],
      lipsync_summary: 'good',
      editing_sequence: 'cut',
      color_grade_lut: 'none',
      thumbnail_concept: 'concept',
      posting_time_suggestion: 'evening',
      ab_test_suggestion: 'test hook',
    },
    ...overrides,
  };
}

describe('checkPolicyCompliance', () => {
  describe('klaim absolut', () => {
    it('mendeteksi "terbaik" di script_narration', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'Ini adalah produk terbaik di pasaran.' })],
      });
      const violations = checkPolicyCompliance(json);
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations[0].category).toContain('Klaim absolut');
      expect(violations[0].sceneNumber).toBe(1);
      expect(violations[0].field).toBe('script_narration');
    });

    it('mendeteksi "nomor 1" di ai_ready_prompt', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ ai_ready_prompt: 'This is the number one product.' })],
      });
      const violations = checkPolicyCompliance(json);
      expect(violations.some(v => v.category.includes('Klaim absolut'))).toBe(true);
    });

    it('mendeteksi "no.1" di text_overlay', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ text_overlay: 'Produk no.1 Indonesia' })],
      });
      const violations = checkPolicyCompliance(json);
      expect(violations.some(v => v.category.includes('Klaim absolut'))).toBe(true);
    });
  });

  describe('caption_variations', () => {
    it('melaporkan pelanggaran di caption dengan sceneNumber null', () => {
      const json = makeVideoJSON({
        production_notes: {
          caption_variations: [
            { caption_text: 'Produk terbaik sepanjang masa!', hashtags: ['#test'] },
          ],
        },
      });
      const violations = checkPolicyCompliance(json);
      const captionViolations = violations.filter(v => v.field.startsWith('caption_variations'));
      expect(captionViolations.length).toBeGreaterThanOrEqual(1);
      expect(captionViolations[0].sceneNumber).toBeNull();
      expect(captionViolations[0].field).toBe('caption_variations[1]');
    });

    it('mengindeks caption_variations mulai dari 1', () => {
      const json = makeVideoJSON({
        production_notes: {
          caption_variations: [
            { caption_text: 'Clean caption', hashtags: ['#test'] },
            { caption_text: 'Produk terbaik', hashtags: ['#test2'] },
          ],
        },
      });
      const violations = checkPolicyCompliance(json);
      const cvViolations = violations.filter(v => v.field.startsWith('caption_variations'));
      expect(cvViolations.some(v => v.field === 'caption_variations[2]')).toBe(true);
    });
  });

  describe('growth mode', () => {
    it('mendeteksi kata komersial saat contentGoal=growth', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'Klik link di bio untuk checkout sekarang.' })],
      });
      const violations = checkPolicyCompliance(json, 'growth');
      expect(violations.some(v => v.category.includes('Bahasa komersial (Mode Growth)'))).toBe(true);
    });

    it('tidak mendeteksi kata komersial saat contentGoal=conversion', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'Klik link di bio untuk checkout sekarang.' })],
      });
      const violations = checkPolicyCompliance(json, 'conversion');
      expect(violations.some(v => v.category.includes('Bahasa komersial (Mode Growth)'))).toBe(false);
    });

    it('mendeteksi "beli" di growth mode', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'Beli sekarang juga!' })],
      });
      const violations = checkPolicyCompliance(json, 'growth');
      expect(violations.some(v => v.category.includes('Bahasa komersial'))).toBe(true);
    });

    it('mendeteksi "promo" di caption saat growth mode', () => {
      const json = makeVideoJSON({
        production_notes: {
          caption_variations: [
            { caption_text: 'Promo terbatas!', hashtags: ['#test'] },
          ],
        },
      });
      const violations = checkPolicyCompliance(json, 'growth');
      expect(violations.some(v => v.field === 'caption_variations[1]')).toBe(true);
    });
  });

  describe('teks bersih', () => {
    it('mengembalikan array kosong untuk teks bersih', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({
          script_narration: 'Tips merawat kulit wajah dengan bahan alami.',
          ai_ready_prompt: 'A woman applying skincare in a bright bathroom.',
          text_overlay: 'Follow for more tips',
        })],
        production_notes: {
          caption_variations: [
            { caption_text: 'Yuk rawat kulitmu!', hashtags: ['#skincare'] },
          ],
        },
      });
      expect(checkPolicyCompliance(json)).toHaveLength(0);
    });
  });

  describe('klaim medis', () => {
    it('mendeteksi "menyembuhkan"', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'Krim ini menyembuhkan jerawat.' })],
      });
      const violations = checkPolicyCompliance(json);
      expect(violations.some(v => v.category.includes('Klaim medis'))).toBe(true);
    });
  });

  describe('klaim performa', () => {
    it('mendeteksi "hasil instan"', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'Dapatkan hasil instan dalam 3 hari.' })],
      });
      const violations = checkPolicyCompliance(json);
      expect(violations.some(v => v.category.includes('Klaim performa'))).toBe(true);
    });
  });

  describe('testimonial fiktif', () => {
    it('mendeteksi "saya pakai dan langsung"', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'Saya pakai dan langsung merasakan hasilnya.' })],
      });
      const violations = checkPolicyCompliance(json);
      expect(violations.some(v => v.category.includes('Testimonial fiktif'))).toBe(true);
    });
  });

  describe('klaim absolut (English)', () => {
    it('mendeteksi "the best"', () => {
      const json = makeVideoJSON({
        scenes: [makeScene({ script_narration: 'This is the best product ever.' })],
      });
      const violations = checkPolicyCompliance(json);
      expect(violations.some(v => v.category.includes('Klaim absolut (English)') || v.category.includes('Klaim absolut'))).toBe(true);
    });
  });
});

describe('formatPolicyViolations', () => {
  it('memformat violations dengan sceneNumber', () => {
    const violations = [
      { sceneNumber: 1, field: 'script_narration', match: 'terbaik', category: 'Klaim absolut', suggestion: 'Ganti jadi netral' },
    ];
    const formatted = formatPolicyViolations(violations);
    expect(formatted[0]).toContain('Scene 1');
    expect(formatted[0]).toContain('script_narration');
    expect(formatted[0]).toContain('terbaik');
    expect(formatted[0]).toContain('Klaim absolut');
  });

  it('memformat violations dengan sceneNumber null (caption)', () => {
    const violations = [
      { sceneNumber: null, field: 'caption_variations[1]', match: 'promo', category: 'Bahasa komersial', suggestion: 'Hapus' },
    ];
    const formatted = formatPolicyViolations(violations);
    expect(formatted[0]).not.toContain('Scene');
    expect(formatted[0]).toContain('caption_variations[1]');
  });
});
