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
  formSections: FormSectionId[];
  buildMasterPrompt: (form: FormData, narrationWPM?: number) => string;
  parseOutput: (rawText: string) => TOutput | null;
  validateOutput: (json: TOutput, form: FormData) => ValidationResult;
  buildRepairPrompt: (json: TOutput, problems: string[], form: FormData) => string;
  checkPolicy: (json: TOutput, form: FormData) => string[];
  applyPostProcess?: (json: TOutput, form: FormData) => void;
  DirectRenderer: ComponentType<DirectRendererProps<TOutput>>;
  ManualRenderer: ComponentType<ManualRendererProps<TOutput>>;
}
