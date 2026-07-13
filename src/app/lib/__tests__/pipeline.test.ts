import { describe, it, expect } from 'vitest';
import { buildShortVideoPrefillFromCalendarPost, buildThumbnailPrefillFromYoutube } from '../pipeline';
import type { FormData } from '../../types';
import { DEFAULT_FORM } from '../../types';
import type { CalendarPost } from '../registry/contentCalendar';
import type { YoutubeLongJSON } from '../registry/youtubeLong';

function makeForm(overrides?: Partial<FormData>): FormData {
  return { ...DEFAULT_FORM, ...overrides };
}

function makeCalendarPost(overrides?: Partial<CalendarPost>): CalendarPost {
  return {
    time_suggestion: '08:00 WIB',
    format: 'video',
    ratio: '9:16',
    topic: '5 Tips Memulai Bisnis Online',
    hook_idea: 'Pertanyaan pembuka tentang kegagalan bisnis',
    caption_draft: 'Mau mulai bisnis online tapi bingung?',
    hashtags: ['#bisnis', '#onlinetips'],
    production_prompt: 'Video talking head dengan bg kantor',
    ...overrides,
  };
}

function makeYoutubeJSON(overrides?: Partial<YoutubeLongJSON>): YoutubeLongJSON {
  return {
    video_metadata: {
      title_variants: ['Judul Utama', 'Judul Alternatif 1', 'CTA Judul'],
      description_seo: 'deskripsi',
      timestamp_chapters: [],
      tags: ['tag1'],
      target_duration_minutes: 15,
      hook_retention_strategy: 'cold open',
    },
    segments: [],
    production_notes: {
      thumbnail_concept: 'konsep',
      posting_time_suggestion: 'sore',
    },
    ...overrides,
  };
}

describe('buildShortVideoPrefillFromCalendarPost', () => {
  it('mapping benar untuk calendarPlatform=tiktok', () => {
    const form = makeForm({ niche: 'fashion_beauty', productDescription: 'Produk kecantikan' });
    const post = makeCalendarPost({ topic: 'Review Produk X', hook_idea: 'Ekspresi terkejut', caption_draft: 'Produk ini...' });
    const result = buildShortVideoPrefillFromCalendarPost(form, post, 'tiktok', 3);

    expect(result.pipelineBrief).toContain('TOPIC: Review Produk X');
    expect(result.pipelineBrief).toContain('HOOK IDEA: Ekspresi terkejut');
    expect(result.pipelineBrief).toContain('CAPTION DRAFT: Produk ini...');
    expect(result.pipelineBrief).toContain('TIME SUGGESTION: 08:00 WIB');
    expect(result.platforms).toEqual(['tiktok']);
    expect(result.ratio).toBe('9:16');
    expect(result.niche).toBe('fashion_beauty');
    expect(result.productDescription).toBe('Produk kecantikan');
  });

  it('mapping calendarPlatform instagram → instagram_reels', () => {
    const form = makeForm();
    const post = makeCalendarPost();
    const result = buildShortVideoPrefillFromCalendarPost(form, post, 'instagram', 1);
    expect(result.platforms).toEqual(['instagram_reels']);
  });

  it('ratio tak valid fallback ke 9:16', () => {
    const form = makeForm();
    const post = makeCalendarPost({ ratio: '21:9' });
    const result = buildShortVideoPrefillFromCalendarPost(form, post, 'tiktok', 1);
    expect(result.ratio).toBe('9:16');
  });

  it('calendarPlatform tanpa mapping fallback ke platform kosong', () => {
    const form = makeForm();
    const post = makeCalendarPost();
    const result = buildShortVideoPrefillFromCalendarPost(form, post, 'snapchat', 2);
    expect(result.platforms).toEqual([]);
  });

  it('field lain tidak tersentuh', () => {
    const form = makeForm({ talentStyle: 'visible_character', characterGender: 'female', sceneCount: 5 });
    const post = makeCalendarPost();
    const result = buildShortVideoPrefillFromCalendarPost(form, post, 'tiktok', 1);

    // Field yang HARUS tidak berubah
    expect(result.talentStyle).toBeUndefined();
    expect(result.characterGender).toBeUndefined();
    expect(result.sceneCount).toBeUndefined();
    // Field yang HARUS berubah
    expect(result.pipelineBrief).toBeDefined();
    expect(result.platforms).toBeDefined();
  });

  it('membawa niche dan productDescription dari form saat ini', () => {
    const form = makeForm({ niche: 'real_estate', productDescription: 'Rumah di BSD', contentGoal: 'conversion' });
    const post = makeCalendarPost({ topic: 'Tur Rumah Murah' });
    const result = buildShortVideoPrefillFromCalendarPost(form, post, 'tiktok', 5);
    expect(result.niche).toBe('real_estate');
    expect(result.productDescription).toBe('Rumah di BSD');
    expect(result.contentGoal).toBe('conversion');
  });
});

describe('buildThumbnailPrefillFromYoutube', () => {
  it('menyimpan chosenTitle sebagai thumbnailTopic', () => {
    const form = makeForm({ niche: 'education_course', targetAudience: ['student'] });
    const json = makeYoutubeJSON();
    const result = buildThumbnailPrefillFromYoutube(form, json, 'Judul Alternatif 1');
    expect(result.thumbnailTopic).toBe('Judul Alternatif 1');
  });

  it('membawa niche dan targetAudience dari form', () => {
    const form = makeForm({ niche: 'food_beverage', targetAudience: ['millennial', 'female'] });
    const json = makeYoutubeJSON();
    const result = buildThumbnailPrefillFromYoutube(form, json, 'Judul Utama');
    expect(result.niche).toBe('food_beverage');
    expect(result.targetAudience).toEqual(['millennial', 'female']);
  });

  it('field lain tidak tersentuh', () => {
    const form = makeForm({ talentStyle: 'faceless_pov', sceneCount: 5 });
    const json = makeYoutubeJSON();
    const result = buildThumbnailPrefillFromYoutube(form, json, 'CTA Judul');
    expect(result.talentStyle).toBeUndefined();
    expect(result.sceneCount).toBeUndefined();
  });

  it('thumbnailFaceOption tidak diubah (biarkan nilai user)', () => {
    const form = makeForm({ thumbnailFaceOption: 'no_face' });
    const json = makeYoutubeJSON();
    const result = buildThumbnailPrefillFromYoutube(form, json, 'Judul');
    expect(result.thumbnailFaceOption).toBeUndefined();
  });
});
