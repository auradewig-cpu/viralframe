import { z } from 'zod';

export const formSchema = z.object({
  contentStyle: z.string().min(1, 'Pilih gaya konten.'),
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
  characterRefFile: z.string(),
  locationRefs: z.array(z.object({
    file: z.string(),
    identity: z.string(),
    keterangan: z.string(),
    sceneNumber: z.number().nullable(),
  })),
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
  locationRefWarning?: string;
}

export function getFormWarnings(formData: Record<string, unknown>): WarningResult {
  const warnings: WarningResult = {};
  const { uniformDuration, sceneCount, durationMode, sceneDurations, locationRefs } = formData as {
    uniformDuration?: number; sceneCount?: number; durationMode?: string; sceneDurations?: number[];
    locationRefs?: { file: string; keterangan: string; sceneNumber: number | null }[];
  };

  // Hitung durasi efektif per scene sesuai mode — mode manual punya durasi berbeda tiap scene.
  const count = sceneCount || 0;
  const durations: number[] = durationMode === 'manual'
    ? Array.from({ length: count }, (_, i) => (sceneDurations && sceneDurations[i]) || uniformDuration || 0)
    : Array(count).fill(uniformDuration || 0);

  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const longScenes = durations.map((d, i) => ({ d, i })).filter(({ d }) => d > 20);
  if (longScenes.length > 0) {
    warnings.hookDurationWarning = durationMode === 'manual'
      ? `Scene ${longScenes.map(({ i }) => i + 1).join(', ')} berdurasi lebih dari 20 detik — pastikan konten tetap padat dan tidak bertele-tele.`
      : 'Durasi per scene lebih dari 20 detik cukup panjang — pastikan konten tetap padat dan tidak bertele-tele.';
  }
  if (totalDuration > 180) {
    warnings.totalDurationWarning = 'Total lebih dari 3 menit. Pertimbangkan kurangi scene untuk performa optimal.';
  }

  const invalidRefs = (locationRefs || []).filter(r => r.sceneNumber !== null && r.sceneNumber > count);
  if (invalidRefs.length > 0) {
    warnings.locationRefWarning = `${invalidRefs.length} referensi lokasi/produk ditugaskan ke scene yang sudah tidak ada (jumlah scene sekarang ${count}) — baris ini akan diabaikan saat compile prompt.`;
  }

  return warnings;
}
