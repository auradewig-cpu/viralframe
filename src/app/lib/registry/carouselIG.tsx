import { useState, useCallback, useRef } from 'react';
import { Loader2, Download, AlertCircle, Sparkles, Image } from 'lucide-react';
import { useAppStore } from '../../store';
import { FormData } from '../../types';
import { NICHES, TARGET_AUDIENCES, VISUAL_STYLES, LANGUAGES, CONTENT_GOALS } from '../maps';
import { FieldLabel, FormCard, SelectField, InputField, NumberInput, TagsInput } from '../../components/form/FormFields';
import { parseJsonResponse, scanTextsForPolicyViolations, POLICY_COMPLIANCE_BLOCK, contentGoalInstructionBlock, countWords } from './shared';
import { OutputToolbar, GenericManualPanel, CopyButton } from './sharedUI';
import { ContentTypeDefinition, ValidationResult, DirectRendererProps, ManualRendererProps } from './types';
import { generateImageWithFallback, ImageGenError } from '../imageClient';

// ==================== SKEMA OUTPUT ====================

export interface CarouselSlide {
  slide_number: number;
  purpose: 'cover' | 'content' | 'cta';
  heading: string;
  body_text: string;
  image_prompt: {
    subject: string;
    composition: string;
    background: string;
    negative_prompt: string;
    prompt_full: string;
  };
  layout_note: string;
}

export interface CarouselJSON {
  carousel_metadata: {
    title: string;
    cover_hook_text: string;
    caption_text: string;
    hashtags: string[];
    slide_count: number;
    ratio: string;
  };
  design_system: {
    style_anchor: string;
    color_palette: string;
    font_style: string;
  };
  slides: CarouselSlide[];
}

// ==================== MASTER PROMPT ====================

function buildCarouselPrompt(form: FormData): string {
  const visualStyleLabel = VISUAL_STYLES.find(v => v.value === form.visualStyle)?.label || 'bebas sesuai niche';
  const slideRatio = form.carouselRatio === '1:1' ? '1:1 (persegi)' : '4:5 (portrait)';
  const growthNote = form.contentGoal === 'growth' ? `\nDILARANG hashtag jualan: #tiktokshop, #racuntiktokshop, #jualan, #promo, #diskon — ganti dengan hashtag niche/edukasi.` : '';
  const pipelineSection = form.pipelineBrief ? `\nBRIEF DARI PIPELINE (konteks perencanaan, WAJIB dijadikan dasar topik/konten):\n${form.pipelineBrief}\n` : '';
  const langInstruction = form.language === 'en' ? 'Semua heading dan body_text HARUS dalam English.'
    : 'Semua heading dan body_text HARUS dalam Bahasa Indonesia.';

  return `=== VIRALFRAME MASTER PROMPT — CAROUSEL IG v1.0 ===
INSTRUKSI KRITIS: Output kamu HANYA berupa JSON murni. Mulai dengan { dan akhiri dengan }.
Tidak ada teks lain, tidak ada markdown wrapper.

Kamu adalah content designer + copywriter untuk Carousel Instagram. Tugasmu adalah merancang slide carousel yang mengedukasi/engaging dan mempertahankan pembaca hingga slide terakhir (CTA).

[KONTEKS]
NICHE: ${form.niche}
TOPIK: ${form.carouselTopic}
TARGET AUDIENS: ${form.targetAudience.join(', ')}
GAYA VISUAL: ${visualStyleLabel}
RASIO: ${slideRatio}
JUMLAH SLIDE: ${form.carouselSlideCount}
${pipelineSection}
${contentGoalInstructionBlock(form.contentGoal)}
${langInstruction}

[STRUKTUR SLIDE WAJIB]
Slide 1 = COVER — hook visual kuat + cover_hook_text (MAKS 8 KATA) yang bikin orang berhenti scroll. JUDUL/PERTANYAAN MENARIK.
Slide 2 s.d. slide ${form.carouselSlideCount - 1} = CONTENT — 1 ide/poin per slide, bernilai edukatif, step-by-step atau insight. JANGAN mengulang slide sebelumnya.
Slide ${form.carouselSlideCount} = CTA — ajakan bertindak sesuai contentGoal: ${form.contentGoal === 'growth' ? 'save/share/follow JANGAN transaksi' : form.contentGoal === 'engagement' ? 'komentar/interaksi' : 'konversi standar'}.

[ATURAN COPY]
- heading maksimal 8 kata per slide
- body_text 1-3 kalimat pendek, padat, value-driven${growthNote}

[KONSISTENSI VISUAL — KRITIS]
design_system.style_anchor = SATU kalimat English yang mendeskripsikan gaya visual seragam (style, color palette, lighting, mood) untuk SEMUA slide. Contoh: "Modern vector illustration with pastel gradient backgrounds, soft shadows, clean sans-serif style, warm beige and coral palette."
SETIAP slides[].image_prompt.prompt_full WAJIB diawali style_anchor VERBATIM kata-per-kata (copy-paste identik), baru deskripsi spesifik slide tersebut.
Tanpa style_anchor verbatim di awal setiap prompt_full, tiap slide akan terlihat seperti desainer berbeda.
image_prompt.prompt_full = siap paste ke AI image generator (Midjourney/DALL-E/Ideogram). Sebut rasio ${form.carouselRatio}. JANGAN sertakan teks/tipografi di gambar — teks ditaruh user via layout_note saat menyusun di Canva.

${POLICY_COMPLIANCE_BLOCK}

[OUTPUT JSON SCHEMA]
{
  "carousel_metadata": {
    "title": "string — judul carousel",
    "cover_hook_text": "string — MAKS 8 KATA",
    "caption_text": "string — caption post Instagram",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
    "slide_count": ${form.carouselSlideCount},
    "ratio": "${form.carouselRatio}"
  },
  "design_system": {
    "style_anchor": "SATU kalimat English — visual guide seragam",
    "color_palette": "string",
    "font_style": "string"
  },
  "slides": [
    {
      "slide_number": 1,
      "purpose": "cover",
      "heading": "MAKS 8 KATA",
      "body_text": "1-3 kalimat",
      "image_prompt": {
        "subject": "string",
        "composition": "string",
        "background": "string",
        "negative_prompt": "string",
        "prompt_full": "WAJIB DIAWALI style_anchor VERBATIM + deskripsi slide ini"
      },
      "layout_note": "saran tata letak teks di Canva (posisi heading, body, warna font)"
    }
    // ... total PERSIS ${form.carouselSlideCount} slide
  ]
}

GUARDRAIL: Output JSON murni. Total slides PERSIS ${form.carouselSlideCount}. Mulai {. Akhiri }.
=== END OF PROMPT ===`;
}

// ==================== VALIDATOR ====================

function validateCarousel(json: CarouselJSON, form: FormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json.slides || !Array.isArray(json.slides)) {
    errors.push('Field "slides" tidak ditemukan atau bukan array.');
  } else {
    if (json.slides.length !== form.carouselSlideCount) {
      errors.push(`Jumlah slide tidak sesuai. Diharapkan ${form.carouselSlideCount}, dapat ${json.slides.length}.`);
    }
    if (json.slides[0]?.purpose !== 'cover') warnings.push('Slide 1 seharusnya purpose="cover".');
    if (json.slides[json.slides.length - 1]?.purpose !== 'cta') warnings.push('Slide terakhir seharusnya purpose="cta".');
    const anchor = json.design_system?.style_anchor?.trim() || '';
    if (!anchor) warnings.push('design_system.style_anchor kosong — konsistensi visual antar slide berisiko.');
    json.slides.forEach((slide, i) => {
      if (countWords(slide.heading) > 8) warnings.push(`Slide ${i + 1}: heading "${slide.heading}" berisi ${countWords(slide.heading)} kata, melebihi batas 8 kata.`);
      if (anchor && !slide.image_prompt?.prompt_full?.startsWith(anchor)) {
        warnings.push(`Slide ${i + 1}: image_prompt.prompt_full tidak diawali style_anchor verbatim.`);
      }
      if (!slide.image_prompt?.prompt_full) errors.push(`Slide ${i + 1}: image_prompt.prompt_full kosong.`);
    });
  }
  if (!json.carousel_metadata) errors.push('Field "carousel_metadata" tidak ditemukan.');
  if (!json.design_system) errors.push('Field "design_system" tidak ditemukan.');

  return { valid: errors.length === 0, errors, warnings };
}

function buildCarouselRepairPrompt(json: CarouselJSON, problems: string[], form: FormData): string {
  return `Kamu sebelumnya menghasilkan JSON carousel berikut, tetapi validator menemukan masalah.

DAFTAR MASALAH:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ATURAN PERBAIKAN:
- Perbaiki HANYA field yang bermasalah. Field lain WAJIB disalin apa adanya.
- Total slides HARUS PERSIS ${form.carouselSlideCount}. heading maks 8 kata, body_text 1-3 kalimat.
- style_anchor WAJIB jadi awalan verbatim setiap prompt_full.
- Output kamu HANYA JSON lengkap yang sudah diperbaiki. Struktur identik. Mulai {, akhiri }.

JSON YANG HARUS DIPERBAIKI:
${JSON.stringify(json, null, 2)}`;
}

function checkCarouselPolicy(json: CarouselJSON, form: FormData): string[] {
  const texts: (string | null | undefined)[] = [
    json.carousel_metadata?.title, json.carousel_metadata?.cover_hook_text,
    json.carousel_metadata?.caption_text,
  ];
  (json.slides || []).forEach(s => {
    texts.push(s.heading, s.body_text);
  });
  return scanTextsForPolicyViolations(texts, form.contentGoal);
}

// ==================== FORM ====================

const CAROUSEL_RATIO_OPTIONS = [
  { value: '4:5', label: '4:5 Portrait (Instagram Feed)' },
  { value: '1:1', label: '1:1 Square' },
];

function CarouselForm() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const [briefOpen, setBriefOpen] = useState(false);

  const toggleAudience = (val: string) => {
    const curr = formData.targetAudience;
    setFormData({ targetAudience: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  const clearPipeline = () => setFormData({ pipelineBrief: '', pipelineSource: '' });

  return (
    <div className="space-y-6">
      {formData.pipelineBrief && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--vf-accent-primary)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: 'var(--vf-accent-primary)' }}>📋 Brief dari pipeline aktif</p>
              {formData.pipelineSource && <p className="text-xs mt-0.5" style={{ color: 'var(--vf-text-muted)' }}>Sumber: {formData.pipelineSource}</p>}
              <button type="button" onClick={() => setBriefOpen(!briefOpen)} className="text-xs mt-1" style={{ color: 'var(--vf-accent-primary)' }}>{briefOpen ? '▲ Sembunyikan' : '▼ Lihat brief'}</button>
              {briefOpen && <pre className="text-xs mt-2 p-2 rounded whitespace-pre-wrap font-sans" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{formData.pipelineBrief}</pre>}
            </div>
            <button type="button" onClick={clearPipeline} className="p-1.5 rounded-lg shrink-0" style={{ color: 'var(--vf-accent-danger)' }}>✕</button>
          </div>
        </div>
      )}
      <FormCard title="🖼️ Konten Carousel">
        <SelectField label="Niche *" value={formData.niche} onChange={v => setFormData({ niche: v })} options={NICHES} placeholder="Pilih niche" />
        <InputField label="Topik Carousel *" value={formData.carouselTopic} onChange={v => setFormData({ carouselTopic: v })} placeholder="Contoh: 5 Kebiasaan Finansial yang Bikin Miskin" maxLength={150} />
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
        <div>
          <FieldLabel>Tujuan Konten *</FieldLabel>
          <div className="flex flex-col gap-2 mt-1">
            {CONTENT_GOALS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={formData.contentGoal === value} onChange={() => setFormData({ contentGoal: value as FormData['contentGoal'] })} className="accent-indigo-500" />
                <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <SelectField label="Gaya Visual" value={formData.visualStyle} onChange={v => setFormData({ visualStyle: v })} options={VISUAL_STYLES} />
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Jumlah Slide (3-10) *" value={formData.carouselSlideCount} onChange={v => setFormData({ carouselSlideCount: Math.max(3, Math.min(10, v)) })} min={3} max={10} />
          <SelectField label="Rasio" value={formData.carouselRatio} onChange={v => setFormData({ carouselRatio: v as '4:5' | '1:1' })} options={CAROUSEL_RATIO_OPTIONS} />
        </div>
        <SelectField label="Bahasa" value={formData.language} onChange={v => setFormData({ language: v })} options={LANGUAGES} />
      </FormCard>
      <FormCard title="⚙️ Opsi Lanjutan">
        <TagsInput label="Kata Kunci Wajib" tags={formData.requiredKeywords} onChange={v => setFormData({ requiredKeywords: v })} placeholder="Ketik + Enter" />
        <TagsInput label="Kata Dihindari" tags={formData.blacklistWords} onChange={v => setFormData({ blacklistWords: v })} placeholder="Ketik + Enter" />
      </FormCard>
    </div>
  );
}

// ==================== RENDERER ====================

type RatioKey = '4:5' | '1:1';

function slugSlide(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'slide';
}

function SlideCard({ slide, index, generatedUrls, generatingStates, onGenerate, onRegenerate }: {
  slide: CarouselSlide; index: number; generatedUrls: Partial<Record<RatioKey, string | undefined>>;
  generatingStates: Partial<Record<RatioKey, { loading: boolean; provider: string; error: string }>>;
  onGenerate?: (ratio: RatioKey) => void; onRegenerate?: (ratio: RatioKey) => void;
}) {
  const showGenerate = typeof onGenerate === 'function';
  const ratio = '4:5' as RatioKey;
  const state = generatingStates[ratio] || { loading: false, provider: '', error: '' };
  const url = generatedUrls[ratio];
  const purposeColor = slide.purpose === 'cover' ? 'var(--vf-accent-primary)' : slide.purpose === 'cta' ? 'var(--vf-accent-cta)' : 'var(--vf-accent-secondary)';
  const purposeLabel = slide.purpose === 'cover' ? 'COVER' : slide.purpose === 'cta' ? 'CTA' : 'KONTEN';

  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)', borderLeft: `4px solid ${purposeColor}` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: purposeColor, color: 'white' }}>SLIDE {slide.slide_number} — {purposeLabel}</span>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>{slide.heading}</p>
      <p className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>{slide.body_text}</p>
      <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>📐 {slide.layout_note}</p>

      <div className="flex items-start justify-between gap-2 p-2 rounded" style={{ background: 'var(--vf-bg-secondary)' }}>
        <div className="flex-1">
          <span className="text-xs font-medium" style={{ color: 'var(--vf-text-muted)' }}>Prompt</span>
          <code className="block text-xs mt-1" style={{ color: 'var(--vf-text-secondary)' }}>{slide.image_prompt.prompt_full}</code>
        </div>
        <CopyButton text={slide.image_prompt.prompt_full} label="Copy" />
      </div>

      {showGenerate && !url && !state.loading && !state.error && (
        <button onClick={() => onGenerate!(ratio)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-90" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
          <Sparkles size={14} /> 🎨 Generate Gambar
        </button>
      )}
      {state.loading && (
        <div className="flex items-center justify-center gap-2 p-4 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--vf-accent-primary)' }} /> {state.provider && <span className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>via {state.provider}</span>}
        </div>
      )}
      {state.error && !url && !state.loading && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)' }}><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{state.error}</span></div>
          {showGenerate && <button onClick={() => onRegenerate!(ratio)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>🔄 Coba Lagi</button>}
        </div>
      )}
      {url && (
        <div className="space-y-2">
          <img src={url} alt={`Slide ${slide.slide_number}`} className="w-full rounded-lg" style={{ maxHeight: 300, objectFit: 'contain', background: 'var(--vf-bg-secondary)' }} />
          <div className="flex gap-2">
            <button onClick={() => { const a = document.createElement('a'); a.href = url; a.download = `slide_${slide.slide_number}.png`; a.click(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}><Download size={12} /> ⬇️ Download</button>
            {showGenerate && <button onClick={() => onRegenerate!(ratio)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>🔄 Regenerate</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function CarouselOutput({ data }: { data: CarouselJSON }) {
  const showGenerate = false;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>📸 {data.carousel_metadata?.title}</p>
      <p className="text-xs" style={{ color: 'var(--vf-accent-primary)' }}>"{data.carousel_metadata?.cover_hook_text}"</p>
      <div className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
        <p className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>{data.carousel_metadata?.caption_text}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--vf-accent-primary)' }}>{(data.carousel_metadata?.hashtags || []).join(' ')}</p>
        <CopyButton text={`${data.carousel_metadata?.caption_text || ''}\n\n${(data.carousel_metadata?.hashtags || []).join(' ')}`} label="Copy Caption" />
      </div>
      <div className="text-xs p-2 rounded" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-muted)' }}>
        🎨 {data.design_system?.style_anchor}
      </div>
      {data.slides?.map((s, i) => <SlideCard key={i} slide={s} index={i} generatedUrls={{}} generatingStates={{}} />)}
    </div>
  );
}

function CarouselDirectRenderer({ data, form, onRegenerate, onEdit }: DirectRendererProps<CarouselJSON>) {
  const settings = useAppStore(s => s.settings);
  const ratio = (form.carouselRatio || '4:5') as RatioKey;
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string | undefined>>({});
  const [generatingStates, setGeneratingStates] = useState<Record<string, { loading: boolean; provider: string; error: string }>>({});
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [batchCancelled, setBatchCancelled] = useState(false);
  const abortBatch = useRef(false);

  const revokeUrl = useCallback((key: string) => {
    const existing = generatedUrls[key];
    if (existing) URL.revokeObjectURL(existing);
  }, [generatedUrls]);

  const handleGenerate = async (index: number) => {
    const key = `${index}`;
    revokeUrl(key);
    const prompt = data.slides[index]?.image_prompt?.prompt_full || '';
    if (!prompt) return;
    setGeneratingStates(prev => ({ ...prev, [key]: { loading: true, provider: 'Puter', error: '' } }));
    try {
      const blob = await generateImageWithFallback(prompt, { ratio }, {
        geminiApiKey: settings.geminiApiKey, geminiImageModel: settings.geminiImageModel,
        puterEnabled: settings.puterEnabled,
        onProviderStatus: (provider, status) => {
          if (status === 'trying') setGeneratingStates(prev => ({ ...prev, [key]: { loading: true, provider: provider === 'puter' ? 'Puter.js' : provider === 'pollinations' ? 'Pollinations' : 'Gemini', error: '' } }));
        },
      });
      setGeneratedUrls(prev => ({ ...prev, [key]: URL.createObjectURL(blob) }));
      setGeneratingStates(prev => ({ ...prev, [key]: { loading: false, provider: '', error: '' } }));
    } catch (e: unknown) {
      setGeneratingStates(prev => ({ ...prev, [key]: { loading: false, provider: '', error: e instanceof ImageGenError ? e.message : 'Error.' } }));
    }
  };

  const handleGenerateAll = async () => {
    abortBatch.current = false;
    setBatchCancelled(false);
    for (let i = 0; i < data.slides.length; i++) {
      if (abortBatch.current) { setBatchProgress('Dibatalkan.'); setBatchCancelled(true); return; }
      setBatchProgress(`Generate slide ${i + 1}/${data.slides.length}...`);
      await handleGenerate(i);
    }
    setBatchProgress(null);
  };

  return (
    <div className="space-y-4">
      <OutputToolbar data={data} filename="viralframe-carousel.json" onRegenerate={onRegenerate} onEdit={onEdit} />
      <div className="flex items-center gap-2">
        <button onClick={handleGenerateAll} disabled={!!batchProgress && !batchCancelled} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
          <Image size={14} /> 🎨 Generate Semua Slide
        </button>
        {batchProgress && !batchCancelled && (
          <>
            <span className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>{batchProgress}</span>
            <button onClick={() => { abortBatch.current = true; }} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}>Batalkan</button>
          </>
        )}
      </div>

      <p className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>📸 {data.carousel_metadata?.title}</p>
      <p className="text-xs" style={{ color: 'var(--vf-accent-primary)' }}>"{data.carousel_metadata?.cover_hook_text}"</p>
      <div className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
        <p className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>{data.carousel_metadata?.caption_text}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--vf-accent-primary)' }}>{(data.carousel_metadata?.hashtags || []).join(' ')}</p>
        <CopyButton text={`${data.carousel_metadata?.caption_text || ''}\n\n${(data.carousel_metadata?.hashtags || []).join(' ')}`} label="Copy Caption" />
      </div>
      <div className="text-xs p-2 rounded" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-muted)' }}>
        🎨 {data.design_system?.style_anchor}
      </div>
      {data.slides?.map((s, i) => (
        <SlideCard key={i} slide={s} index={i}
          generatedUrls={{ '4:5': generatedUrls[`${i}`] }}
          generatingStates={{ '4:5': generatingStates[`${i}`] || { loading: false, provider: '', error: '' } }}
          onGenerate={() => handleGenerate(i)}
          onRegenerate={() => handleGenerate(i)}
        />
      ))}
    </div>
  );
}

function CarouselManualRenderer({ masterPrompt, onValidated }: ManualRendererProps<CarouselJSON>) {
  const formData = useAppStore(s => s.formData);
  return (
    <GenericManualPanel
      masterPrompt={masterPrompt}
      parseOutput={(t) => parseJsonResponse<CarouselJSON>(t)}
      validate={(json) => validateCarousel(json, formData)}
      onValidated={onValidated}
      renderPreview={(data) => <CarouselOutput data={data} />}
    />
  );
}

// ==================== REGISTRY ENTRY ====================

export const carouselIGContentType: ContentTypeDefinition<CarouselJSON> = {
  id: 'carousel_ig',
  label: 'Carousel IG',
  emoji: '📸',
  description: 'Carousel Instagram slide-by-slide — cover hook, konten edukatif, CTA + prompt gambar siap generate.',
  formSections: [],
  FormComponent: CarouselForm,
  validateForm: (form) => {
    const errors: string[] = [];
    if (!form.niche) errors.push('Pilih jenis bisnis / niche.');
    if (!form.carouselTopic.trim()) errors.push('Isi topik carousel terlebih dulu.');
    return errors;
  },
  getHistoryLabel: (form) => form.carouselTopic.slice(0, 50),
  buildMasterPrompt: (form) => buildCarouselPrompt(form),
  parseOutput: (rawText) => parseJsonResponse<CarouselJSON>(rawText),
  validateOutput: (json, form) => validateCarousel(json, form),
  buildRepairPrompt: (json, problems, form) => buildCarouselRepairPrompt(json, problems, form),
  checkPolicy: (json, form) => checkCarouselPolicy(json, form),
  DirectRenderer: CarouselDirectRenderer,
  ManualRenderer: CarouselManualRenderer,
};
