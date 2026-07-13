import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Video } from 'lucide-react';
import { useAppStore } from '../../store';
import { FormData } from '../../types';
import { NICHES, CONTENT_GOALS } from '../maps';
import { buildShortVideoPrefillFromCalendarPost } from '../../lib/pipeline';
import { FieldLabel, FormCard, SelectField, TextareaField, NumberInput } from '../../components/form/FormFields';
import { parseJsonResponse, scanTextsForPolicyViolations, POLICY_COMPLIANCE_BLOCK, contentGoalInstructionBlock } from './shared';
import { OutputToolbar, GenericManualPanel, CopyButton } from './sharedUI';
import { ContentTypeDefinition, ValidationResult, DirectRendererProps, ManualRendererProps } from './types';

// Trade-off token budget (lihat instruksi Prompt 3): dipilih "turunkan detail per post" alih-alih
// "batasi ke 7 hari/generate" — supaya field form 3-30 hari tetap sesuai spesifikasi dan user dapat
// kalender lengkap dalam SATU request. Konsekuensinya production_prompt per post berupa satu string
// prompt ringkas (bukan objek scene/image_prompt bertingkat penuh seperti short_video/thumbnail_pack),
// supaya total token output tetap terkendali walau calendarDays besar.

// ==================== SKEMA OUTPUT ====================

export interface CalendarPost {
  time_suggestion: string;
  format: 'video' | 'carousel' | 'image' | 'story';
  ratio: string;
  topic: string;
  hook_idea: string;
  caption_draft: string;
  hashtags: string[];
  production_prompt: string;
}

export interface CalendarDay {
  day_number: number;
  date_hint: string;
  posts: CalendarPost[];
}

export interface ContentCalendarJSON {
  strategy_summary: {
    positioning: string;
    content_pillars: string[];
    target_metrics_per_phase: string;
  };
  days: CalendarDay[];
  weekly_review_checklist: string[];
}

// ==================== MASTER PROMPT ====================

function buildContentCalendarPrompt(form: FormData): string {
  return `=== VIRALFRAME MASTER PROMPT — CONTENT CALENDAR v1.0 ===
INSTRUKSI KRITIS: Output kamu HANYA berupa JSON murni. Mulai dengan { dan akhiri dengan }.
Tidak ada teks lain, tidak ada markdown wrapper seperti \`\`\`json.

Kamu adalah social media strategist yang menyusun kalender konten berbasis data akun nyata yang
diberikan user (bukan riset/scraping otomatis — kamu hanya bekerja dari data yang di-paste user).

[KONTEKS AKUN]
PLATFORM: ${form.calendarPlatform}
NICHE: ${form.niche}
PRODUK (opsional): ${form.productDescription || '-'}
${contentGoalInstructionBlock(form.contentGoal)}
DATA AKUN & INSIGHT (dari user, WAJIB jadi dasar strategi, JANGAN mengarang data yang tidak ada):
"""
${form.accountInsightText || 'Tidak ada data spesifik — asumsikan akun baru tanpa histori.'}
"""

[RENCANA]
JUMLAH HARI: ${form.calendarDays} hari
POST PER HARI: ${form.postsPerDay}

[STRATEGY SUMMARY]
positioning: satu kalimat positioning akun berdasarkan niche + data insight.
content_pillars: WAJIB 3-4 pilar konten (tema berulang) yang relevan dengan niche & tujuan konten.
target_metrics_per_phase: metrik yang realistis dikejar di fase ini (mis. follower growth, save rate,
  watch time) — SESUAIKAN dengan kondisi akun yang tersirat dari TUJUAN KONTEN di atas.

[DAYS — WAJIB PERSIS ${form.calendarDays} hari, tiap hari PERSIS ${form.postsPerDay} post]
Tiap post WAJIB:
- time_suggestion: jam posting + alasan singkat (berdasarkan kebiasaan platform ${form.calendarPlatform}).
- format: salah satu "video" | "carousel" | "image" | "story", pilih sesuai topic & pilar konten.
- ratio: rasio visual sesuai format (video biasanya 9:16, carousel/image bisa 1:1 atau 4:5).
- production_prompt: SATU string prompt ringkas siap-pakai (2-4 kalimat) yang menjelaskan konsep
  visual/shot untuk format tersebut — JANGAN buat objek JSON bertingkat, cukup deskripsi natural
  yang bisa langsung dipahami AI video/image tool atau tim produksi.
- caption_draft dan hashtags mengikuti TUJUAN KONTEN di atas (growth = tanpa hashtag jualan).

[WEEKLY REVIEW CHECKLIST]
3-5 poin evaluasi yang WAJIB dicek user di akhir tiap minggu (mis. cek pilar mana paling engage,
cek waktu posting mana paling optimal, dst).

${POLICY_COMPLIANCE_BLOCK}

[OUTPUT JSON SCHEMA]
{
  "strategy_summary": {
    "positioning": "string",
    "content_pillars": ["pilar1", "pilar2", "pilar3"],
    "target_metrics_per_phase": "string"
  },
  "days": [
    {
      "day_number": 1,
      "date_hint": "string — mis. 'Hari 1 (Senin)'",
      "posts": [
        {
          "time_suggestion": "string",
          "format": "video",
          "ratio": "9:16",
          "topic": "string",
          "hook_idea": "string",
          "caption_draft": "string",
          "hashtags": ["#tag1", "#tag2"],
          "production_prompt": "string ringkas siap pakai"
        }
        // ... total PERSIS ${form.postsPerDay} post per hari
      ]
    }
    // ... total PERSIS ${form.calendarDays} hari
  ],
  "weekly_review_checklist": ["poin 1", "poin 2", "poin 3"]
}

GUARDRAIL: Output JSON murni, mulai {, akhiri }. Generate SEMUA ${form.calendarDays} hari lengkap.
=== END OF PROMPT ===`;
}

// ==================== VALIDATOR ====================

function validateContentCalendar(json: ContentCalendarJSON, form: FormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json.strategy_summary) {
    errors.push('Field "strategy_summary" tidak ditemukan.');
  } else if (!json.strategy_summary.content_pillars || json.strategy_summary.content_pillars.length < 3 || json.strategy_summary.content_pillars.length > 4) {
    warnings.push(`content_pillars sebaiknya 3-4 pilar, dapat ${json.strategy_summary.content_pillars?.length ?? 0}.`);
  }

  if (!json.days || !Array.isArray(json.days)) {
    errors.push('Field "days" tidak ditemukan atau bukan array.');
  } else {
    if (json.days.length !== form.calendarDays) {
      errors.push(`Jumlah hari tidak sesuai. Diharapkan ${form.calendarDays}, dapat ${json.days.length}.`);
    }
    json.days.forEach((day, i) => {
      if (!day.posts || !Array.isArray(day.posts)) {
        errors.push(`Hari ${i + 1}: field "posts" tidak ditemukan.`);
      } else if (day.posts.length !== form.postsPerDay) {
        warnings.push(`Hari ${i + 1}: jumlah post ${day.posts.length}, diharapkan ${form.postsPerDay}.`);
      }
    });
  }

  if (!json.weekly_review_checklist || json.weekly_review_checklist.length === 0) {
    warnings.push('Field "weekly_review_checklist" kosong.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function buildContentCalendarRepairPrompt(json: ContentCalendarJSON, problems: string[], form: FormData): string {
  return `Kamu sebelumnya menghasilkan JSON kalender konten berikut, tetapi validator menemukan masalah.

DAFTAR MASALAH:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ATURAN PERBAIKAN:
- Perbaiki HANYA field yang bermasalah. Field lain WAJIB disalin apa adanya.
- Total days HARUS PERSIS ${form.calendarDays}, tiap hari PERSIS ${form.postsPerDay} post.
- Output kamu HANYA JSON lengkap yang sudah diperbaiki, struktur identik. Mulai {, akhiri }.

JSON YANG HARUS DIPERBAIKI:
${JSON.stringify(json, null, 2)}`;
}

function checkContentCalendarPolicy(json: ContentCalendarJSON, form: FormData): string[] {
  const texts: (string | null | undefined)[] = [json.strategy_summary?.positioning];
  (json.days || []).forEach(day => {
    (day.posts || []).forEach(post => {
      texts.push(post.topic, post.hook_idea, post.caption_draft);
    });
  });
  return scanTextsForPolicyViolations(texts, form.contentGoal);
}

// ==================== FORM ====================

const CALENDAR_PLATFORMS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
];

function ContentCalendarForm() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);

  return (
    <div className="space-y-6">
      <FormCard title="📅 Konteks Akun & Rencana">
        <SelectField label="Platform *" value={formData.calendarPlatform} onChange={v => setFormData({ calendarPlatform: v })} options={CALENDAR_PLATFORMS} />
        <SelectField label="Niche *" value={formData.niche} onChange={v => setFormData({ niche: v })} options={NICHES} placeholder="Pilih niche" />
        <div>
          <FieldLabel>Produk (opsional)</FieldLabel>
          <TextareaField value={formData.productDescription} onChange={v => setFormData({ productDescription: v })} placeholder="Kosongkan jika kalender ini murni untuk personal branding/growth tanpa produk spesifik" maxLength={300} rows={3} />
        </div>
        <div>
          <FieldLabel>Kondisi Akun</FieldLabel>
          <div className="flex flex-col gap-2 mt-1">
            {CONTENT_GOALS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={formData.contentGoal === value} onChange={() => setFormData({ contentGoal: value as FormData['contentGoal'] })} className="accent-indigo-500" />
                <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Jumlah Hari Rencana (3-30) *" value={formData.calendarDays} onChange={v => setFormData({ calendarDays: Math.max(3, Math.min(30, v)) })} min={3} max={30} />
          <NumberInput label="Post per Hari *" value={formData.postsPerDay} onChange={v => setFormData({ postsPerDay: Math.max(1, Math.min(3, v)) })} min={1} max={3} />
        </div>
        {formData.calendarDays > 14 && (
          <p className="text-xs p-2 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)' }}>
            ⚠️ Rencana &gt;14 hari menghasilkan prompt panjang — production_prompt per post dibuat lebih ringkas (bukan JSON scene penuh) supaya tetap muat dalam satu kali generate.
          </p>
        )}
        <div>
          <FieldLabel>Data Akun & Insight (paste manual)</FieldLabel>
          <p className="text-xs mb-2" style={{ color: 'var(--vf-text-muted)' }}>
            Tidak ada scraping otomatis — paste sendiri data analytics/insight akun kamu (follower, top post, watch time, dst) atau deskripsi kondisi akun saat ini.
          </p>
          <TextareaField value={formData.accountInsightText} onChange={v => setFormData({ accountInsightText: v })} placeholder="Contoh: 1.200 follower, video edukasi paling engage, jam posting terbaik 19.00-21.00..." maxLength={2000} rows={6} />
        </div>
      </FormCard>
    </div>
  );
}

// ==================== RENDERER ====================

function PostCard({ post, calendarPlatform, dayNumber, onPipeline }: {
  post: CalendarPost; calendarPlatform?: string; dayNumber?: number; onPipeline?: (post: CalendarPost) => void;
}) {
  return (
    <div className="p-3 rounded-lg space-y-1" style={{ background: 'var(--vf-bg-secondary)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--vf-text-primary)' }}>{post.time_suggestion} · {post.format} · {post.ratio}</span>
      </div>
      <p className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{post.topic}</p>
      <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>🎣 {post.hook_idea}</p>
      <p className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>{post.caption_draft}</p>
      <p className="text-xs" style={{ color: 'var(--vf-accent-primary)' }}>{(post.hashtags || []).join(' ')}</p>
      <div className="flex items-start justify-between gap-2 mt-1">
        <code className="text-xs flex-1" style={{ color: 'var(--vf-text-secondary)' }}>{post.production_prompt}</code>
        <CopyButton text={post.production_prompt} label="Copy" />
      </div>
      {post.format === 'video' && onPipeline && (
        <button
          type="button"
          onClick={() => onPipeline(post)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs mt-1 transition-all hover:opacity-90"
          style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)', border: '1px solid var(--vf-accent-primary)' }}
        >
          <Video size={12} /> 🎬 Buat video ini
        </button>
      )}
    </div>
  );
}

function DayCard({ day, calendarPlatform, onPipeline }: {
  day: CalendarDay; calendarPlatform?: string; onPipeline?: (post: CalendarPost) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--vf-border)' }}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3" style={{ background: 'var(--vf-bg-elevated)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--vf-text-primary)' }}>Hari {day.day_number} — {day.date_hint} ({day.posts.length} post)</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="p-3 space-y-2" style={{ background: 'var(--vf-bg-elevated)' }}>
          {day.posts.map((p, i) => <PostCard key={i} post={p} calendarPlatform={calendarPlatform} dayNumber={day.day_number} onPipeline={onPipeline} />)}
        </div>
      )}
    </div>
  );
}

function ContentCalendarOutput({ data, calendarPlatform, onPipeline }: {
  data: ContentCalendarJSON; calendarPlatform?: string; onPipeline?: (post: CalendarPost) => void;
}) {
  const exportAll = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'viralframe-content-calendar.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>{data.strategy_summary.positioning}</p>
        <p className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>Pilar: {data.strategy_summary.content_pillars.join(' · ')}</p>
        <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>{data.strategy_summary.target_metrics_per_phase}</p>
        <button onClick={exportAll} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm mt-2" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
          <Download size={14} /> Export Semua ke File
        </button>
      </div>
      <div className="space-y-2">
        {data.days.map((d, i) => <DayCard key={i} day={d} calendarPlatform={calendarPlatform} onPipeline={onPipeline} />)}
      </div>
      <div className="rounded-xl p-4" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--vf-text-secondary)' }}>✅ WEEKLY REVIEW CHECKLIST</p>
        <ul className="text-xs space-y-1" style={{ color: 'var(--vf-text-secondary)' }}>
          {data.weekly_review_checklist.map((item, i) => <li key={i}>• {item}</li>)}
        </ul>
      </div>
    </div>
  );
}

function ContentCalendarDirectRenderer({ data, form, onRegenerate, onEdit }: DirectRendererProps<ContentCalendarJSON>) {
  const setActiveContentTypeId = useAppStore(s => s.setActiveContentTypeId);
  const loadFormData = useAppStore(s => s.loadFormData);
  const setCurrentStep = useAppStore(s => s.setCurrentStep);
  const [confirmPost, setConfirmPost] = useState<CalendarPost | null>(null);

  const handlePipeline = (post: CalendarPost) => {
    setConfirmPost(post);
  };

  const confirmPipeline = () => {
    if (!confirmPost) return;
    const prefill = buildShortVideoPrefillFromCalendarPost(form, confirmPost, form.calendarPlatform, 0);
    loadFormData({ ...form, ...prefill });
    setActiveContentTypeId('short_video');
    setCurrentStep(1);
  };

  return (
    <div className="space-y-4">
      {confirmPost && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--vf-accent-primary)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--vf-text-primary)' }}>Pipeline ke Short Video</p>
          <p className="text-xs mb-3" style={{ color: 'var(--vf-text-secondary)' }}>
            Form Short Video akan diisi dari slot ini — isian form sebelumnya akan tertimpa. Lanjut?
          </p>
          <div className="flex gap-2">
            <button onClick={confirmPipeline} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
              ✅ Lanjut ke Short Video
            </button>
            <button onClick={() => setConfirmPost(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
              Batal
            </button>
          </div>
        </div>
      )}
      <OutputToolbar data={data} filename="viralframe-content-calendar.json" onRegenerate={onRegenerate} onEdit={onEdit} />
      <ContentCalendarOutput data={data} calendarPlatform={form.calendarPlatform} onPipeline={handlePipeline} />
    </div>
  );
}

function ContentCalendarManualRenderer({ masterPrompt, onValidated }: ManualRendererProps<ContentCalendarJSON>) {
  const formData = useAppStore(s => s.formData);
  return (
    <GenericManualPanel
      masterPrompt={masterPrompt}
      parseOutput={(t) => parseJsonResponse<ContentCalendarJSON>(t)}
      validate={(json) => validateContentCalendar(json, formData)}
      onValidated={onValidated}
      renderPreview={(data) => <ContentCalendarOutput data={data} />}
    />
  );
}

// ==================== REGISTRY ENTRY ====================

export const contentCalendarContentType: ContentTypeDefinition<ContentCalendarJSON> = {
  id: 'content_calendar',
  label: 'Kalender Konten',
  emoji: '📅',
  description: 'Strategi & kalender konten harian — positioning, pilar konten, dan production prompt siap pakai per post.',
  formSections: [],
  FormComponent: ContentCalendarForm,
  buildMasterPrompt: (form) => buildContentCalendarPrompt(form),
  parseOutput: (rawText) => parseJsonResponse<ContentCalendarJSON>(rawText),
  validateOutput: (json, form) => validateContentCalendar(json, form),
  buildRepairPrompt: (json, problems, form) => buildContentCalendarRepairPrompt(json, problems, form),
  checkPolicy: (json, form) => checkContentCalendarPolicy(json, form),
  DirectRenderer: ContentCalendarDirectRenderer,
  ManualRenderer: ContentCalendarManualRenderer,
};
