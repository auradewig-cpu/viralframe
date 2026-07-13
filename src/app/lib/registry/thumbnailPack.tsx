import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Download, AlertCircle, ImageOff } from 'lucide-react';
import { useAppStore } from '../../store';
import { FormData } from '../../types';
import { NICHES, TARGET_AUDIENCES, VISUAL_STYLES } from '../maps';
import { FieldLabel, FormCard, SelectField, InputField, NumberInput } from '../../components/form/FormFields';
import { parseJsonResponse, scanTextsForPolicyViolations, POLICY_COMPLIANCE_BLOCK } from './shared';
import { OutputToolbar, GenericManualPanel, CopyButton } from './sharedUI';
import { ContentTypeDefinition, ValidationResult, DirectRendererProps, ManualRendererProps } from './types';
import { generateImageWithFallback, ImageGenError } from '../imageClient';

// ==================== SKEMA OUTPUT ====================

export interface ThumbnailImagePrompt {
  subject: string;
  composition: string;
  facial_expression_or_object: string;
  background: string;
  color_scheme: string;
  lighting: string;
  style: string;
  negative_prompt: string;
  prompt_16_9: string;
  prompt_1_1: string;
}

export interface ThumbnailConcept {
  concept_name: string;
  psychology_trigger: string;
  image_prompt: ThumbnailImagePrompt;
  text_overlay: {
    text: string;
    position: string;
    color_suggestion: string;
  };
  ctr_rationale: string;
}

export interface ThumbnailPackJSON {
  video_topic: string;
  concepts: ThumbnailConcept[];
}

// ==================== MASTER PROMPT ====================

function buildThumbnailPackPrompt(form: FormData): string {
  const faceInstruction = form.thumbnailFaceOption === 'with_face'
    ? 'WAJIB sertakan wajah manusia dengan ekspresi ekstrem (kaget/shock/curious) di subject — ekspresi wajah adalah driver CTR utama.'
    : 'JANGAN sertakan wajah manusia — fokus pada objek/produk/teks besar sebagai driver CTR.';
  const visualStyleLabel = VISUAL_STYLES.find(v => v.value === form.visualStyle)?.label || 'bebas sesuai niche';

  return `=== VIRALFRAME MASTER PROMPT — THUMBNAIL PACK v1.0 ===
INSTRUKSI KRITIS: Output kamu HANYA berupa JSON murni. Mulai dengan { dan akhiri dengan }.
Tidak ada teks lain, tidak ada markdown wrapper seperti \`\`\`json.

Kamu adalah thumbnail designer + CTR psychology specialist untuk YouTube/video content.

[KONTEKS]
NICHE: ${form.niche}
TOPIK/JUDUL VIDEO: ${form.thumbnailTopic}
TARGET AUDIENS: ${form.targetAudience.join(', ')}
GAYA VISUAL: ${visualStyleLabel}
OPSI WAJAH: ${faceInstruction}

[JUMLAH KONSEP]
Generate PERSIS ${form.thumbnailConceptCount} konsep thumbnail berbeda, masing-masing memakai
psychology_trigger BERBEDA dari daftar: curiosity_gap, shock, kontras, angka_besar — jangan ulangi
trigger yang sama di lebih dari satu konsep kecuali jumlah konsep melebihi jumlah trigger tersedia.

[ATURAN CLICKBAIT AMAN — WAJIB]
Thumbnail boleh memancing rasa ingin tahu (curiosity gap) SELAMA tidak menipu isi video sebenarnya.
DILARANG: menampilkan skenario/hasil yang TIDAK terjadi di video, angka/klaim yang tidak didukung
konten, atau ekspresi wajah yang menyesatkan tentang isi video. Clickbait aman = janji yang video
benar-benar tepati, bukan janji kosong.

[IMAGE PROMPT]
Tiap konsep WAJIB berisi image_prompt terstruktur, siap paste ke AI image generator (Midjourney/
DALL-E/Ideogram): subject, composition (rule of thirds/framing), facial_expression_or_object,
background, color_scheme (WAJIB kontras tinggi agar menonjol di feed), lighting, style,
negative_prompt (elemen yang harus dihindari AI), prompt_16_9 (kalimat prompt lengkap siap paste
untuk rasio 16:9), prompt_1_1 (varian untuk rasio 1:1/Shorts cover).

[TEXT OVERLAY]
text: MAKSIMAL 4 KATA, huruf besar, sangat ringkas dan punchy. Sertakan saran posisi (kiri/kanan/
atas/bawah, hindari menutup wajah) dan saran warna (kontras tinggi dengan background).

${POLICY_COMPLIANCE_BLOCK}

[OUTPUT JSON SCHEMA]
{
  "video_topic": "${form.thumbnailTopic}",
  "concepts": [
    {
      "concept_name": "string — nama singkat konsep",
      "psychology_trigger": "curiosity_gap | shock | kontras | angka_besar",
      "image_prompt": {
        "subject": "string",
        "composition": "string",
        "facial_expression_or_object": "string",
        "background": "string",
        "color_scheme": "string — WAJIB kontras tinggi",
        "lighting": "string",
        "style": "string",
        "negative_prompt": "string",
        "prompt_16_9": "string — prompt lengkap siap paste, rasio 16:9",
        "prompt_1_1": "string — prompt lengkap siap paste, rasio 1:1"
      },
      "text_overlay": { "text": "MAKS 4 KATA", "position": "string", "color_suggestion": "string" },
      "ctr_rationale": "string — alasan singkat kenapa konsep ini bakal di-klik"
    }
    // ... total PERSIS ${form.thumbnailConceptCount} konsep
  ]
}

GUARDRAIL: Output JSON murni, mulai {, akhiri }.
=== END OF PROMPT ===`;
}

// ==================== VALIDATOR ====================

function validateThumbnailPack(json: ThumbnailPackJSON, form: FormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json.concepts || !Array.isArray(json.concepts)) {
    errors.push('Field "concepts" tidak ditemukan atau bukan array.');
  } else {
    if (json.concepts.length !== form.thumbnailConceptCount) {
      errors.push(`Jumlah konsep tidak sesuai. Diharapkan ${form.thumbnailConceptCount}, dapat ${json.concepts.length}.`);
    }
    json.concepts.forEach((c, i) => {
      if (!c.image_prompt) errors.push(`Konsep ${i + 1}: field "image_prompt" tidak ditemukan.`);
      if (!c.text_overlay?.text) warnings.push(`Konsep ${i + 1}: text_overlay kosong.`);
      else {
        const wordCount = c.text_overlay.text.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 4) warnings.push(`Konsep ${i + 1}: text_overlay "${c.text_overlay.text}" berisi ${wordCount} kata, melebihi batas 4 kata.`);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

function buildThumbnailPackRepairPrompt(json: ThumbnailPackJSON, problems: string[], form: FormData): string {
  return `Kamu sebelumnya menghasilkan JSON thumbnail pack berikut, tetapi validator menemukan masalah.

DAFTAR MASALAH:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ATURAN PERBAIKAN:
- Perbaiki HANYA field yang bermasalah. Field lain WAJIB disalin apa adanya.
- Total concepts HARUS PERSIS ${form.thumbnailConceptCount}. text_overlay.text maksimal 4 kata.
- Output kamu HANYA JSON lengkap yang sudah diperbaiki, struktur identik. Mulai {, akhiri }.

JSON YANG HARUS DIPERBAIKI:
${JSON.stringify(json, null, 2)}`;
}

function checkThumbnailPackPolicy(json: ThumbnailPackJSON, form: FormData): string[] {
  const texts: (string | null | undefined)[] = [json.video_topic];
  (json.concepts || []).forEach(c => {
    texts.push(c.concept_name, c.ctr_rationale, c.text_overlay?.text);
  });
  return scanTextsForPolicyViolations(texts, form.contentGoal);
}

// ==================== FORM ====================

function ThumbnailPackForm() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);

  const toggleAudience = (val: string) => {
    const curr = formData.targetAudience;
    setFormData({ targetAudience: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  return (
    <div className="space-y-6">
      <FormCard title="🖼️ Konteks Thumbnail">
        <SelectField label="Niche *" value={formData.niche} onChange={v => setFormData({ niche: v })} options={NICHES} placeholder="Pilih niche" />
        <InputField label="Judul/Topik Video *" value={formData.thumbnailTopic} onChange={v => setFormData({ thumbnailTopic: v })} placeholder="Contoh: 5 Kesalahan Investasi Pemula" maxLength={150} />
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
        <SelectField label="Gaya Visual" value={formData.visualStyle} onChange={v => setFormData({ visualStyle: v })} options={VISUAL_STYLES} />
        <div>
          <FieldLabel>Opsi Wajah</FieldLabel>
          <div className="flex gap-4 mt-1">
            {(['with_face', 'no_face'] as const).map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={formData.thumbnailFaceOption === opt} onChange={() => setFormData({ thumbnailFaceOption: opt })} className="accent-indigo-500" />
                <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{opt === 'with_face' ? '🙂 Dengan Wajah Manusia' : '📦 Tanpa Wajah (Objek/Teks)'}</span>
              </label>
            ))}
          </div>
        </div>
        <NumberInput label="Jumlah Konsep (3-5) *" value={formData.thumbnailConceptCount} onChange={v => setFormData({ thumbnailConceptCount: Math.max(3, Math.min(5, v)) })} min={3} max={5} />
      </FormCard>
    </div>
  );
}

// ==================== IMAGE GENERATION ====================

type RatioKey = '16:9' | '1:1';

function slugConcept(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'concept';
}

// ==================== RENDERER ====================

function ConceptCard({ concept, index, generatedUrls = {}, generatingStates = {}, onGenerate, onRegenerate }: {
  concept: ThumbnailConcept;
  index: number;
  generatedUrls?: Partial<Record<RatioKey, string | undefined>>;
  generatingStates?: Partial<Record<RatioKey, { loading: boolean; provider: string; error: string }>>;
  onGenerate?: (ratio: RatioKey) => void;
  onRegenerate?: (ratio: RatioKey) => void;
}) {
  const conceptSlug = slugConcept(concept.concept_name);

  const renderImageSection = (ratioLabel: string, prompt: string, ratio: RatioKey) => {
    const state = generatingStates[ratio] || { loading: false, provider: '', error: '' };
    const url: string | undefined = generatedUrls[ratio];

    const showGenerate = typeof onGenerate === 'function';

    return (
      <div className="space-y-2">
        {showGenerate && !url && !state.loading && !state.error && (
          <button
            onClick={() => onGenerate!(ratio)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
          >
            🎨 Generate Gambar ({ratioLabel})
          </button>
        )}

        {state.loading && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--vf-accent-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>Generate via {state.provider}...</span>
          </div>
        )}

        {state.error && !url && !state.loading && (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)' }}>
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
            {showGenerate && (
              <button
                onClick={() => onRegenerate!(ratio)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
              >
                🔄 Coba Lagi
              </button>
            )}
          </div>
        )}

        {url && (
          <div className="space-y-2">
            <img
              src={url}
              alt={`${concept.concept_name} ${ratioLabel}`}
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: 260, background: 'var(--vf-bg-secondary)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = url; a.download = `thumbnail_${conceptSlug}_${ratio.replace(':', 'x')}.png`; a.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
              >
                <Download size={12} /> ⬇️ Download
              </button>
              {showGenerate && (
                <button
                  onClick={() => onRegenerate!(ratio)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
                >
                  🔄 Regenerate
                </button>
              )}
            </div>
          </div>
        )}

        {!url && !state.loading && !state.error && (
          <div className="flex items-start justify-between gap-2 p-2 rounded" style={{ background: 'var(--vf-bg-secondary)' }}>
            <div className="flex-1">
              <span className="text-xs font-medium" style={{ color: 'var(--vf-text-muted)' }}>Prompt {ratioLabel}</span>
              <code className="block text-xs mt-1" style={{ color: 'var(--vf-text-secondary)' }}>{prompt}</code>
            </div>
            <CopyButton text={prompt} label="Copy" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--vf-text-primary)' }}>{concept.concept_name}</h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{concept.psychology_trigger}</span>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--vf-accent-primary)' }}>"{concept.text_overlay.text}" — {concept.text_overlay.position}, {concept.text_overlay.color_suggestion}</p>
      <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>{concept.ctr_rationale}</p>
      {renderImageSection('16:9', concept.image_prompt.prompt_16_9, '16:9')}
      {renderImageSection('1:1', concept.image_prompt.prompt_1_1, '1:1')}
    </div>
  );
}

function ThumbnailPackOutput({ data }: { data: ThumbnailPackJSON }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>🎬 {data.video_topic}</p>
      {data.concepts.map((c, i) => (
        <ConceptCard key={i} concept={c} index={i} />
      ))}
    </div>
  );
}

const INIT_RATIO_STATE = { loading: false, provider: '', error: '' };

function ThumbnailPackDirectRenderer({ data, form, onRegenerate, onEdit }: DirectRendererProps<ThumbnailPackJSON>) {
  const settings = useAppStore(s => s.settings);
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, Record<RatioKey, string | undefined>>>({});
  const [generatingStates, setGeneratingStates] = useState<Record<string, Record<RatioKey, { loading: boolean; provider: string; error: string }>>>({});
  const abortRef = useRef<Record<string, RatioKey | null>>({});

  const revokeUrl = useCallback((key: string, ratio: RatioKey) => {
    setGeneratedUrls(prev => {
      const existing = prev[key]?.[ratio];
      if (existing) URL.revokeObjectURL(existing);
      return prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(generatedUrls).forEach(urls => {
        Object.values(urls).forEach(url => { if (url) URL.revokeObjectURL(url); });
      });
    };
  }, [generatedUrls]);

  const handleGenerate = async (index: number, ratio: RatioKey) => {
    const key = `${index}`;
    revokeUrl(key, ratio);
    const prompt = ratio === '16:9' ? data.concepts[index].image_prompt.prompt_16_9 : data.concepts[index].image_prompt.prompt_1_1;

    setGeneratingStates(prev => ({
      ...prev,
      [key]: { ...prev[key], [ratio]: { loading: true, provider: 'Puter', error: '' } },
    }));

    try {
      const blob = await generateImageWithFallback(prompt, { ratio }, {
        geminiApiKey: settings.geminiApiKey,
        geminiImageModel: settings.geminiImageModel,
        puterEnabled: settings.puterEnabled,
        onProviderStatus: (provider, status) => {
          if (status === 'trying') {
            const label = provider === 'puter' ? 'Puter.js' : provider === 'pollinations' ? 'Pollinations' : 'Gemini Image';
            setGeneratingStates(prev => ({
              ...prev,
              [key]: { ...prev[key], [ratio]: { loading: true, provider: label, error: '' } },
            }));
          }
        },
      });
      const url = URL.createObjectURL(blob);
      setGeneratedUrls(prev => ({ ...prev, [key]: { ...prev[key], [ratio]: url } }));
      setGeneratingStates(prev => ({ ...prev, [key]: { ...prev[key], [ratio]: { loading: false, provider: '', error: '' } } }));
    } catch (e: unknown) {
      const msg = e instanceof ImageGenError ? e.message : 'Terjadi kesalahan tidak diketahui.';
      setGeneratingStates(prev => ({ ...prev, [key]: { ...prev[key], [ratio]: { loading: false, provider: '', error: msg } } }));
    }
  };

  return (
    <div className="space-y-4">
      <OutputToolbar data={data} filename="viralframe-thumbnail-pack.json" onRegenerate={onRegenerate} onEdit={onEdit} />
      <div className="space-y-3">
        <p className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>🎬 {data.video_topic}</p>
        {data.concepts.map((c, i) => {
          const key = `${i}`;
          return (
            <ConceptCard
              key={i}
              concept={c}
              index={i}
              generatedUrls={generatedUrls[key] || {}}
              generatingStates={generatingStates[key] || {} as Record<RatioKey, { loading: boolean; provider: string; error: string }>}
              onGenerate={(ratio) => handleGenerate(i, ratio)}
              onRegenerate={(ratio) => handleGenerate(i, ratio)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ThumbnailPackManualRenderer({ masterPrompt, onValidated }: ManualRendererProps<ThumbnailPackJSON>) {
  const formData = useAppStore(s => s.formData);
  return (
    <GenericManualPanel
      masterPrompt={masterPrompt}
      parseOutput={(t) => parseJsonResponse<ThumbnailPackJSON>(t)}
      validate={(json) => validateThumbnailPack(json, formData)}
      onValidated={onValidated}
      renderPreview={(data) => <ThumbnailPackOutput data={data} />}
    />
  );
}

// ==================== REGISTRY ENTRY ====================

export const thumbnailPackContentType: ContentTypeDefinition<ThumbnailPackJSON> = {
  id: 'thumbnail_pack',
  label: 'Thumbnail Pack',
  emoji: '🖼️',
  description: 'Prompt JSON thumbnail catchy — 3-5 konsep siap paste ke AI image generator, lengkap alasan CTR.',
  formSections: [],
  FormComponent: ThumbnailPackForm,
  buildMasterPrompt: (form) => buildThumbnailPackPrompt(form),
  parseOutput: (rawText) => parseJsonResponse<ThumbnailPackJSON>(rawText),
  validateOutput: (json, form) => validateThumbnailPack(json, form),
  buildRepairPrompt: (json, problems, form) => buildThumbnailPackRepairPrompt(json, problems, form),
  checkPolicy: (json, form) => checkThumbnailPackPolicy(json, form),
  DirectRenderer: ThumbnailPackDirectRenderer,
  ManualRenderer: ThumbnailPackManualRenderer,
};
