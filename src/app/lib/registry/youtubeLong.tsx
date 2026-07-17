import { useState } from 'react';
import { Image } from 'lucide-react';
import { useAppStore } from '../../store';
import { FormData } from '../../types';
import { NICHES, TARGET_AUDIENCES, AI_TOOLS, LANGUAGES, CONTENT_GOALS } from '../maps';
import { buildThumbnailPrefillFromYoutube } from '../../lib/pipeline';
import { FieldLabel, FormCard, SelectField, TextareaField, InputField, NumberInput, TagsInput } from '../../components/form/FormFields';
import { parseJsonResponse, scanTextsForPolicyViolations, POLICY_COMPLIANCE_BLOCK, contentGoalInstructionBlock } from './shared';
import { OutputToolbar, GenericManualPanel, CopyButton } from './sharedUI';
import { ContentTypeDefinition, ValidationResult, DirectRendererProps, ManualRendererProps } from './types';

// ==================== SKEMA OUTPUT ====================

export interface YoutubeBRollPrompt {
  ai_ready_prompt: string;
  reference_image: { file: string; instruction: string } | null;
}

export type YoutubeSegmentPurpose = 'cold_open' | 'intro' | 'main_point' | 'b_roll_break' | 'recap' | 'cta_outro';

export interface YoutubeSegment {
  segment_number: number;
  chapter_title: string;
  duration_minutes: number;
  purpose: YoutubeSegmentPurpose;
  script_outline: string;
  script_word_for_word?: string | null; // hanya diisi untuk segmen cold_open (segment 1) — 15-30 detik penuh
  b_roll_prompts: YoutubeBRollPrompt[];
  on_screen_elements: string;
  retention_note: string;
}

export interface YoutubeLongJSON {
  video_metadata: {
    title_variants: string[];
    description_seo: string;
    timestamp_chapters: { time_label: string; chapter_title: string }[];
    tags: string[];
    target_duration_minutes: number;
    hook_retention_strategy: string;
  };
  segments: YoutubeSegment[];
  production_notes: {
    thumbnail_concept: string;
    posting_time_suggestion: string;
  };
}

// ==================== MASTER PROMPT ====================

const CHANNEL_STYLE_LABEL: Record<string, string> = {
  edukasi: 'Edukasi — ajarkan sesuatu dengan jelas dan terstruktur',
  dokumenter: 'Dokumenter — investigatif, mendalam, naratif',
  listicle: 'Listicle — format "Top N", tiap segmen = 1 poin',
  review: 'Review — evaluasi jujur pro/kontra suatu topik/produk',
};

function buildYoutubeLongPrompt(form: FormData): string {
  const toolFormat = AI_TOOLS.find(t => t.value === form.aiTool);
  const channelStyleLabel = CHANNEL_STYLE_LABEL[form.channelStyle] || form.channelStyle;

  return `=== VIRALFRAME MASTER PROMPT — YOUTUBE LONG FORM v1.0 ===
INSTRUKSI KRITIS: Output kamu HANYA berupa JSON murni. Mulai dengan { dan akhiri dengan }.
Tidak ada teks lain, tidak ada markdown wrapper seperti \`\`\`json.

Kamu adalah scriptwriter + video director + SEO specialist untuk kanal YouTube long-form.

[KONTEKS]
NICHE: ${form.niche}
TOPIK/PRODUK: ${form.productDescription}
USP: ${form.usp}
TARGET AUDIENS: ${form.targetAudience.join(', ')}
GAYA KANAL: ${channelStyleLabel}
DURASI TARGET: ${form.targetDurationMinutes} menit
JUMLAH CHAPTER/SEGMENT: ${form.chapterCount}
BAHASA: ${form.language}
${contentGoalInstructionBlock(form.contentGoal)}
${form.requiredKeywords.length > 0 ? `KATA KUNCI SEO WAJIB: ${form.requiredKeywords.join(', ')}\n` : ''}${form.blacklistWords.length > 0 ? `KATA DILARANG: ${form.blacklistWords.join(', ')}\n` : ''}

[STRUKTUR SEGMEN — WAJIB PERSIS ${form.chapterCount} segmen]
Segmen 1 WAJIB purpose = "cold_open": 15-30 detik pembuka SANGAT KUAT yang menentukan retention —
  WAJIB isi field "script_word_for_word" (naskah kata-per-kata, bukan outline) DAN "b_roll_prompts"
  dengan prompt visual detail. Segmen ini paling penting untuk menahan penonton di 30 detik pertama.
Segmen tengah: campuran purpose "intro"/"main_point"/"b_roll_break"/"recap" sesuai kebutuhan alur —
  field "script_outline" berisi POIN-POIN narasi (bullet points singkat), BUKAN naskah kata-per-kata.
Segmen terakhir WAJIB purpose = "cta_outro": rangkuman + ajakan subscribe/like/comment (sesuaikan
  intensitas dengan TUJUAN KONTEN di atas).
RETENTION: retention_note tiap segmen WAJIB sebutkan pattern interrupt konkret setiap 30-60 detik
  (perubahan visual, pertanyaan retoris, cut ke b-roll, dst) — YouTube long-form kehilangan penonton
  tercepat di menit-menit awal dan tiap kali pacing datar.

[B-ROLL PROMPTS]
Tiap segmen WAJIB berisi array "b_roll_prompts" (minimal 1 per segmen) — tiap entry:
{ "ai_ready_prompt": "prompt visual siap paste ke ${form.aiTool || 'AI video tool'}, format: ${toolFormat ? `max ${toolFormat.charLimit} karakter, natural description` : 'natural description, netral, policy-safe'}", "reference_image": null }
ai_ready_prompt HANYA deskripsi visual netral (scene, kamera, lighting, mood) — tanpa klaim marketing.

[SEO]
title_variants: WAJIB PERSIS 3 varian judul clickbait-AMAN (memancing rasa ingin tahu tanpa menipu isi video).
description_seo: deskripsi SEO-friendly, sertakan keyword natural.
timestamp_chapters: satu entry per segmen, format time_label seperti "00:00", "02:15" (perkiraan kumulatif
  berdasarkan duration_minutes tiap segmen).
tags: 10-15 tag SEO relevan.

${POLICY_COMPLIANCE_BLOCK}

[OUTPUT JSON SCHEMA]
{
  "video_metadata": {
    "title_variants": ["judul 1", "judul 2", "judul 3"],
    "description_seo": "string",
    "timestamp_chapters": [{ "time_label": "00:00", "chapter_title": "string" }],
    "tags": ["tag1", "tag2"],
    "target_duration_minutes": ${form.targetDurationMinutes},
    "hook_retention_strategy": "string — strategi retensi keseluruhan video"
  },
  "segments": [
    {
      "segment_number": 1,
      "chapter_title": "string",
      "duration_minutes": 0.5,
      "purpose": "cold_open",
      "script_outline": "string (boleh sama dengan ringkasan script_word_for_word)",
      "script_word_for_word": "naskah kata-per-kata untuk cold open — WAJIB diisi hanya di segmen 1",
      "b_roll_prompts": [{ "ai_ready_prompt": "string", "reference_image": null }],
      "on_screen_elements": "string — teks/grafis yang muncul di layar",
      "retention_note": "string — pattern interrupt konkret"
    }
    // ... total PERSIS ${form.chapterCount} segmen, segmen terakhir purpose "cta_outro",
    // segmen selain segmen 1 TIDAK perlu mengisi script_word_for_word (boleh null)
  ],
  "production_notes": {
    "thumbnail_concept": "string — deskripsi konsep thumbnail yang menarik",
    "posting_time_suggestion": "string"
  }
}

GUARDRAIL: Output JSON murni, mulai {, akhiri }. Generate SEMUA ${form.chapterCount} segmen lengkap.
=== END OF PROMPT ===`;
}

// ==================== VALIDATOR ====================

function validateYoutubeLong(json: YoutubeLongJSON, form: FormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json.video_metadata) errors.push('Field "video_metadata" tidak ditemukan.');
  else {
    if (!json.video_metadata.title_variants || json.video_metadata.title_variants.length !== 3) {
      errors.push(`title_variants harus PERSIS 3 varian, dapat ${json.video_metadata.title_variants?.length ?? 0}.`);
    }
  }

  if (!json.segments || !Array.isArray(json.segments)) {
    errors.push('Field "segments" tidak ditemukan atau bukan array.');
  } else {
    if (json.segments.length !== form.chapterCount) {
      errors.push(`Jumlah segmen tidak sesuai. Diharapkan ${form.chapterCount}, dapat ${json.segments.length}.`);
    }
    const first = json.segments[0];
    if (first && first.purpose !== 'cold_open') {
      warnings.push('Segmen 1 seharusnya berperan "cold_open".');
    }
    if (first && !first.script_word_for_word) {
      warnings.push('Segmen 1 (cold open) tidak memiliki script_word_for_word — retensi awal berisiko lemah.');
    }
    const last = json.segments[json.segments.length - 1];
    if (last && last.purpose !== 'cta_outro') {
      warnings.push('Segmen terakhir seharusnya berperan "cta_outro".');
    }
    json.segments.forEach((seg, i) => {
      if (!seg.b_roll_prompts || seg.b_roll_prompts.length === 0) {
        warnings.push(`Segmen ${i + 1}: tidak ada b_roll_prompts.`);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

function buildYoutubeLongRepairPrompt(json: YoutubeLongJSON, problems: string[], form: FormData): string {
  return `Kamu sebelumnya menghasilkan JSON video YouTube long-form berikut, tetapi validator menemukan masalah.

DAFTAR MASALAH:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ATURAN PERBAIKAN:
- Perbaiki HANYA field yang bermasalah. Field lain WAJIB disalin apa adanya.
- Total segments HARUS PERSIS ${form.chapterCount}.
- Output kamu HANYA JSON lengkap yang sudah diperbaiki, struktur identik. Mulai {, akhiri }.

JSON YANG HARUS DIPERBAIKI:
${JSON.stringify(json, null, 2)}`;
}

function checkYoutubeLongPolicy(json: YoutubeLongJSON, form: FormData): string[] {
  const texts: (string | null | undefined)[] = [
    ...(json.video_metadata?.title_variants || []),
    json.video_metadata?.description_seo,
  ];
  (json.segments || []).forEach(seg => {
    texts.push(seg.script_outline, seg.script_word_for_word, seg.on_screen_elements);
  });
  return scanTextsForPolicyViolations(texts, form.contentGoal);
}

// ==================== FORM ====================

function YoutubeLongForm() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);

  const toggleAudience = (val: string) => {
    const curr = formData.targetAudience;
    setFormData({ targetAudience: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  return (
    <div className="space-y-6">
      <FormCard title="📺 Konteks Kanal & Konten">
        <SelectField label="Niche *" value={formData.niche} onChange={v => setFormData({ niche: v })} options={NICHES} placeholder="Pilih niche" />
        <div>
          <FieldLabel>Topik/Produk Video *</FieldLabel>
          <TextareaField value={formData.productDescription} onChange={v => setFormData({ productDescription: v })} placeholder="Jelaskan topik video secara detail..." maxLength={500} />
        </div>
        <InputField label="USP / Sudut Pandang Unik" value={formData.usp} onChange={v => setFormData({ usp: v })} placeholder="Apa yang bikin video ini beda dari yang lain?" maxLength={150} />
        <div>
          <FieldLabel>Target Audiens</FieldLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {TARGET_AUDIENCES.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => toggleAudience(value)} className="px-3 py-1.5 rounded-full text-sm transition-all"
                style={{ background: formData.targetAudience.includes(value) ? 'var(--vf-accent-primary)' : 'var(--vf-bg-elevated)', color: formData.targetAudience.includes(value) ? 'white' : 'var(--vf-text-secondary)', border: `1px solid ${formData.targetAudience.includes(value) ? 'var(--vf-accent-primary)' : 'var(--vf-border)'}` }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </FormCard>

      <FormCard title="🎬 Spesifikasi Video">
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Durasi Target (menit) *" value={formData.targetDurationMinutes} onChange={v => setFormData({ targetDurationMinutes: Math.max(3, Math.min(60, v)) })} min={3} max={60} />
          <NumberInput label="Jumlah Chapter/Segment *" value={formData.chapterCount} onChange={v => setFormData({ chapterCount: Math.max(3, Math.min(15, v)) })} min={3} max={15} />
        </div>
        <SelectField label="Gaya Kanal *" value={formData.channelStyle} onChange={v => setFormData({ channelStyle: v })} options={Object.entries(CHANNEL_STYLE_LABEL).map(([value, label]) => ({ value, label }))} />
        <SelectField label="AI Video Tool (untuk b-roll prompts)" value={formData.aiTool} onChange={v => setFormData({ aiTool: v })} options={AI_TOOLS.map(t => ({ value: t.value, label: t.label }))} placeholder="Pilih AI video generator" />
        <SelectField label="Bahasa Narasi" value={formData.language} onChange={v => setFormData({ language: v })} options={LANGUAGES} />
      </FormCard>

      <FormCard title="🎯 Tujuan Konten">
        <div className="flex flex-col gap-2">
          {CONTENT_GOALS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={formData.contentGoal === value} onChange={() => setFormData({ contentGoal: value as FormData['contentGoal'] })} className="accent-indigo-500" />
              <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{label}</span>
            </label>
          ))}
        </div>
        <TagsInput label="Kata Kunci SEO Wajib" tags={formData.requiredKeywords} onChange={v => setFormData({ requiredKeywords: v })} placeholder="Ketik keyword + Enter" />
        <TagsInput label="Kata yang Harus Dihindari" tags={formData.blacklistWords} onChange={v => setFormData({ blacklistWords: v })} placeholder="Ketik kata + Enter" />
      </FormCard>
    </div>
  );
}

// ==================== RENDERER ====================

function SegmentCard({ segment }: { segment: YoutubeSegment }) {
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--vf-text-primary)' }}>Segmen {segment.segment_number} — {segment.chapter_title}</h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{segment.purpose} · {segment.duration_minutes} min</span>
      </div>
      {segment.script_word_for_word && (
        <div className="p-2 rounded" style={{ background: 'var(--vf-bg-secondary)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--vf-text-muted)' }}>Naskah Kata-per-Kata (Cold Open)</span>
          <p className="text-sm mt-1" style={{ color: 'var(--vf-text-secondary)' }}>{segment.script_word_for_word}</p>
        </div>
      )}
      <p className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>{segment.script_outline}</p>
      <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>🖥️ {segment.on_screen_elements}</p>
      <p className="text-xs" style={{ color: 'var(--vf-accent-warning)' }}>⚡ {segment.retention_note}</p>
      {segment.b_roll_prompts.map((b, i) => (
        <div key={i} className="flex items-start justify-between gap-2 p-2 rounded" style={{ background: 'var(--vf-bg-secondary)' }}>
          <code className="text-xs flex-1" style={{ color: 'var(--vf-text-secondary)' }}>{b.ai_ready_prompt}</code>
          <CopyButton text={b.ai_ready_prompt} label="Copy" />
        </div>
      ))}
    </div>
  );
}

function YoutubeLongOutput({ data, onPipeline }: { data: YoutubeLongJSON; onPipeline?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
        {data.video_metadata.title_variants.map((t, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>📹 {t}</p>
        ))}
        <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>{data.video_metadata.tags.join(', ')}</p>
        {onPipeline && (
          <button type="button" onClick={onPipeline} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs mt-1 transition-all hover:opacity-90" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)', border: '1px solid var(--vf-accent-primary)' }}>
            <Image size={12} /> 🖼️ Buat Thumbnail-nya
          </button>
        )}
      </div>
      <div className="space-y-3">
        {data.segments.map((seg, i) => <SegmentCard key={i} segment={seg} />)}
      </div>
    </div>
  );
}

function YoutubeLongDirectRenderer({ data, form, onRegenerate, onEdit }: DirectRendererProps<YoutubeLongJSON>) {
  const setActiveContentTypeId = useAppStore(s => s.setActiveContentTypeId);
  const loadFormData = useAppStore(s => s.loadFormData);
  const setCurrentStep = useAppStore(s => s.setCurrentStep);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
  const [confirmTitle, setConfirmTitle] = useState(false);

  const titles = data.video_metadata?.title_variants || [];

  const handlePipeline = () => {
    setShowPicker(true);
    setSelectedTitleIdx(0);
  };

  const confirmPipeline = () => {
    const chosen = titles[selectedTitleIdx] || titles[0] || 'Video tanpa judul';
    const prefill = buildThumbnailPrefillFromYoutube(form, data, chosen);
    loadFormData({ ...form, ...prefill });
    setActiveContentTypeId('thumbnail_pack');
    setCurrentStep(1);
  };

  return (
    <div className="space-y-4">
      {showPicker && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--vf-accent-primary)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--vf-text-primary)' }}>Pipeline ke Thumbnail Pack</p>
          <p className="text-xs mb-2" style={{ color: 'var(--vf-text-secondary)' }}>Pilih judul yang akan jadi topik thumbnail:</p>
          {titles.map((t, i) => (
            <label key={i} className="flex items-center gap-2 py-1 cursor-pointer">
              <input type="radio" checked={selectedTitleIdx === i} onChange={() => setSelectedTitleIdx(i)} className="accent-indigo-500" />
              <span className="text-xs" style={{ color: 'var(--vf-text-primary)' }}>{t}</span>
            </label>
          ))}
          <p className="text-xs mt-2 mb-3" style={{ color: 'var(--vf-text-secondary)' }}>
            Form Thumbnail Pack akan diisi dari data ini — isian form sebelumnya akan tertimpa. Lanjut?
          </p>
          <div className="flex gap-2">
            <button onClick={confirmPipeline} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
              ✅ Lanjut ke Thumbnail Pack
            </button>
            <button onClick={() => setShowPicker(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
              Batal
            </button>
          </div>
        </div>
      )}
      <OutputToolbar data={data} filename="viralframe-youtube-long.json" onRegenerate={onRegenerate} onEdit={onEdit} />
      <YoutubeLongOutput data={data} onPipeline={titles.length > 0 ? handlePipeline : undefined} />
    </div>
  );
}

function YoutubeLongManualRenderer({ masterPrompt, onValidated }: ManualRendererProps<YoutubeLongJSON>) {
  const formData = useAppStore(s => s.formData);
  return (
    <GenericManualPanel
      masterPrompt={masterPrompt}
      parseOutput={(t) => parseJsonResponse<YoutubeLongJSON>(t)}
      validate={(json) => validateYoutubeLong(json, formData)}
      onValidated={onValidated}
      renderPreview={(data) => <YoutubeLongOutput data={data} />}
    />
  );
}

// ==================== REGISTRY ENTRY ====================

export const youtubeLongContentType: ContentTypeDefinition<YoutubeLongJSON> = {
  id: 'youtube_long',
  label: 'YouTube Long Form',
  emoji: '📺',
  description: 'Video YouTube panjang — segmen chapter, cold open detail, b-roll prompts, SEO title & description.',
  formSections: [],
  FormComponent: YoutubeLongForm,
  validateForm: (form) => {
    const errors: string[] = [];
    if (!form.niche) errors.push('Pilih jenis bisnis / niche.');
    if (!form.productDescription.trim()) errors.push('Isi topik/produk video terlebih dulu.');
    return errors;
  },
  getHistoryLabel: (form) => form.productDescription.slice(0, 50),
  buildMasterPrompt: (form) => buildYoutubeLongPrompt(form),
  parseOutput: (rawText) => parseJsonResponse<YoutubeLongJSON>(rawText),
  validateOutput: (json, form) => validateYoutubeLong(json, form),
  buildRepairPrompt: (json, problems, form) => buildYoutubeLongRepairPrompt(json, problems, form),
  checkPolicy: (json, form) => checkYoutubeLongPolicy(json, form),
  DirectRenderer: YoutubeLongDirectRenderer,
  ManualRenderer: YoutubeLongManualRenderer,
};
