import { z } from 'zod';

export const formSchema = z.object({
  niche: z.string().min(1, 'Pilih jenis bisnis / niche.'),
  productDescription: z.string()
    .min(30, 'Deskripsi produk terlalu singkat. Tambahkan detail produk (min 30 karakter).'),
  usp: z.string(),
  targetAudience: z.array(z.string()),
  platforms: z.array(z.string()).min(1, 'Pilih minimal 1 platform distribusi.'),
  aiTool: z.string().min(1, 'Pilih AI video generator yang akan kamu gunakan.'),
  sceneCount: z.number().min(2, 'Minimal 2 scene (Hook + CTA).').max(20, 'Maksimal 20 scene.'),
  durationMode: z.enum(['uniform', 'manual']),
  uniformDuration: z.number(),
  sceneDurations: z.array(z.number()),
  ratio: z.string(),
  language: z.string(),
  hookType: z.string(),
  ctaType: z.string(),
  ctaKeyword: z.string(),
  useCharacter: z.boolean(),
  characterGender: z.string(),
  characterAge: z.number(),
  characterEthnicity: z.string(),
  characterStyle: z.string(),
  characterTraits: z.string(),
  visualAnchor: z.string(),
  expression: z.string(),
  visualStyle: z.string(),
  backsound: z.string(),
  narrativeTone: z.string(),
  requiredKeywords: z.array(z.string()),
  blacklistWords: z.array(z.string()),
  referenceStyle: z.string(),
  subtitleStyle: z.string(),
  textOverlay: z.boolean(),
  brandColor: z.string(),
  avoidColor: z.string(),
  referencePhotos: z.array(z.string()),
  locationDescription: z.string(),
  captionVariationCount: z.number().min(1).max(5),
  mode: z.enum(['direct', 'manual']),
}).superRefine((data, ctx) => {
  if (data.useCharacter && !data.characterAge) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Masukkan usia karakter.', path: ['characterAge'] });
  }
  if (data.ctaType === 'comment_keyword' && !data.ctaKeyword.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Masukkan keyword untuk CTA ini.', path: ['ctaKeyword'] });
  }
});

export type FormSchemaType = z.infer<typeof formSchema>;

export function validateFormData(data: Record<string, unknown>): string[] {
  const result = formSchema.safeParse(data);
  if (result.success) return [];
  return result.error.issues.map(i => i.message);
}

export interface WarningResult {
  hookDurationWarning?: string;
  totalDurationWarning?: string;
  apiKeyWarning?: string;
}

export function getFormWarnings(formData: Record<string, unknown>): WarningResult {
  const warnings: WarningResult = {};
  const hookDuration = (formData as { uniformDuration?: number }).uniformDuration;
  const sceneCount = (formData as { sceneCount?: number }).sceneCount;
  const totalDuration = hookDuration && sceneCount ? hookDuration * sceneCount : 0;
  if (hookDuration && hookDuration > 8) {
    warnings.hookDurationWarning = 'Hook lebih dari 8 detik berisiko kehilangan penonton. Disarankan 3–5 detik.';
  }
  if (totalDuration > 180) {
    warnings.totalDurationWarning = 'Total lebih dari 3 menit. Pertimbangkan kurangi scene untuk performa optimal.';
  }
  return warnings;
}
