import { ComponentType } from 'react';
import { FormData } from '../../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Seksi form yang dikenal registry — dipakai Step1/2/3 untuk memutuskan seksi mana yang tampil
// untuk content type yang sedang aktif. 'short_video' menampilkan semuanya (perilaku sekarang).
export type FormSectionId =
  | 'business_context'
  | 'target_distribution'
  | 'video_spec'
  | 'scene_duration'
  | 'hook_cta'
  | 'character'
  | 'visual_audio'
  | 'advanced';

export interface DirectRendererProps<TOutput> {
  data: TOutput;
  form: FormData;
  onRegenerate: () => void;
  onEdit: () => void;
  referencePhotos?: string[];
}

export interface ManualRendererProps<TOutput> {
  masterPrompt: string;
  form: FormData;
  onValidated: (data: TOutput) => void;
}

// Satu paket lengkap untuk satu jenis konten (short video, nanti YouTube long, thumbnail pack, dst).
// Semua logika compile/validate/render milik jenis konten tertentu hidup di sini — bukan di apiClient
// atau di halaman Home — supaya menambah jenis konten baru tidak perlu merombak alur aplikasi.
export interface ContentTypeDefinition<TOutput = unknown> {
  id: string;
  label: string;
  emoji: string;
  description: string;
  formSections: FormSectionId[];
  // Jika diisi, Home.tsx merender komponen form single-page ini alih-alih wizard 3 langkah
  // (dipakai content type non-short_video yang field-nya jauh lebih sedikit).
  FormComponent?: ComponentType;
  // Validasi form ringan sebelum generate — return daftar pesan error, kosong = lolos.
  // short_video TIDAK memakai ini (punya jalur zod sendiri di lib/validation.ts); content type
  // single-page WAJIB mengisinya supaya generate tidak jalan dengan field inti kosong.
  validateForm?: (form: FormData) => string[];
  // Label record history — tanpa ini, pemanggil fallback ke productDescription (salah untuk
  // content type yang topiknya di field lain, mis. thumbnailTopic/carouselTopic).
  getHistoryLabel?: (form: FormData) => string;
  buildMasterPrompt: (form: FormData, narrationWPM?: number) => string;
  parseOutput: (rawText: string) => TOutput | null;
  validateOutput: (json: TOutput, form: FormData) => ValidationResult;
  buildRepairPrompt: (json: TOutput, problems: string[], form: FormData) => string;
  checkPolicy: (json: TOutput, form: FormData) => string[];
  applyPostProcess?: (json: TOutput, form: FormData) => void;
  DirectRenderer: ComponentType<DirectRendererProps<TOutput>>;
  ManualRenderer: ComponentType<ManualRendererProps<TOutput>>;
}
