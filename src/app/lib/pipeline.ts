import { FormData } from '../types';
import { CalendarPost } from './registry/contentCalendar';
import { YoutubeLongJSON } from './registry/youtubeLong';
import { PLATFORMS } from './maps';

// Memetakan platform kalender ke nilai slug PLATFORMS yang valid.
const CALENDAR_PLATFORM_MAP: Record<string, string> = {
  tiktok: 'tiktok',
  instagram: 'instagram_reels',
  youtube: 'youtube_shorts',
  facebook: 'facebook_reels',
  xiaohongshu: 'xiaohongshu',
  shopee: 'shopee_video',
  linkedin: '', // fallback
  twitter: '',  // fallback
};

export function buildShortVideoPrefillFromCalendarPost(
  form: FormData,
  post: CalendarPost,
  calendarPlatform: string,
  dayNumber: number,
): Partial<FormData> {
  // Mapping platform kalender → slug PLATFORMS
  const platform = CALENDAR_PLATFORM_MAP[calendarPlatform] || '';
  const validPlatform = PLATFORMS.find(p => p.value === platform);

  // Validasi ratio dari post — fallback ke 9:16
  const validRatios = ['9:16', '16:9', '1:1', '4:5', '3:4'];
  const ratio = validRatios.includes(post.ratio) ? post.ratio : '9:16';

  const pipelineBrief = [
    `TOPIC: ${post.topic}`,
    `HOOK IDEA: ${post.hook_idea}`,
    `CAPTION DRAFT: ${post.caption_draft}`,
    `FORMAT/RATIO: ${post.format} / ${post.ratio}`,
    `TIME SUGGESTION: ${post.time_suggestion}`,
  ].join('\n');

  const platformLabel = PLATFORMS.find(p => p.value === platform)?.label || calendarPlatform;
  return {
    pipelineBrief,
    pipelineSource: `Kalender Konten — Hari ${dayNumber}, ${platformLabel}: ${post.topic}`,
    platforms: validPlatform ? [validPlatform.value] : [],
    ratio,
    niche: form.niche,
    productDescription: form.productDescription,
    contentGoal: form.contentGoal,
    contentStyle: form.contentStyle,
  };
}

export function buildThumbnailPrefillFromYoutube(
  form: FormData,
  videoJSON: YoutubeLongJSON,
  chosenTitle: string,
): Partial<FormData> {
  return {
    thumbnailTopic: chosenTitle,
    pipelineSource: `YouTube Long: ${chosenTitle}`,
    niche: form.niche,
    targetAudience: form.targetAudience,
  };
}
