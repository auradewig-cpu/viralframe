import { useState } from 'react';
import { Copy, Check, Download, RefreshCw, Edit, Loader2, Globe, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { VideoJSON, FormData, SceneData } from '../../types';
import { SceneCard } from './SceneCard';
import { useAppStore } from '../../store';
import { addReferenceSectionToZip } from '../../lib/referenceZip';
import { slugify } from '../../lib/canonicalRefNames';
import { generateWithFallback, ApiCallError } from '../../lib/apiClient';
import { PLATFORMS, PLATFORM_BEHAVIOR } from '../../lib/maps';
import {
  buildSceneRegenPrompt, buildSceneRegenRepairPrompt, validateSceneData,
  getSceneRegenExpectation, parseSceneResponse,
} from '../../lib/sceneRegen';
import { getSceneTypeSlug } from '../../lib/contentStyles';
import { getSceneIssuesMap, getScenePolicyViolations, getCaptionPolicyViolations } from '../../lib/sceneStatus';
import {
  buildSceneRephrasePrompt, validateSceneRephrase, parseSceneRephraseResponse,
  buildCaptionRephrasePrompt, validateCaptionRephrase, parseCaptionRephraseResponse, CaptionVariation,
} from '../../lib/autoRephrase';
import { buildHookVariantsPrompt, parseHookVariantsResponse, validateHookVariants, buildHookExpectation } from '../../lib/hookVariator';

interface DirectPanelProps {
  json: VideoJSON;
  form: FormData;
  onRegenerate: () => void;
  onEdit: () => void;
  referencePhotos?: string[];
}

interface SceneRegenState {
  loading: boolean;
  error: string | null;
  justRegenerated: boolean;
}

interface AutoFixState {
  loading: boolean;
  error: string | null;
  remainingWarning: string | null;
}

function CopyAllButton({ json }: { json: VideoJSON }) {
  const [copied, setCopied] = useState(false);
  const allPrompts = json.scenes.map((s, i) => `=== SCENE ${i + 1} ===\n${s.ai_ready_prompt}`).join('\n\n');
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(allPrompts); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
      style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : '⎘ Copy Semua Prompt'}
    </button>
  );
}

function DownloadJSONButton({ json }: { json: VideoJSON }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'viralframe-output.json'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
      <Download size={14} /> ↓ Download JSON
    </button>
  );
}

function addScenesSectionToZip(zip: JSZip, json: VideoJSON) {
  json.scenes.forEach(scene => {
    const folderName = `scenes/scene_${String(scene.scene_number).padStart(2, '0')}_${scene.scene_type}`;
    const folder = zip.folder(folderName);
    if (!folder) return;
    folder.file('prompt.txt', scene.ai_ready_prompt || '');
    folder.file('narasi.txt', [
      scene.script_narration,
      scene.script_subtitle ? `\nSUBTITLE: ${scene.script_subtitle}` : ''
    ].join(''));
    folder.file('brief.txt', [
      scene.visual_description,
      `\nKamera: ${scene.camera_direction}`,
      `\nAudio: ${scene.sound_design}`,
      `\nTransisi: ${scene.transition_to_next}`,
    ].join('\n'));
    folder.file('reference_guide.txt', `Scene ${scene.scene_number} — ${scene.scene_type.toUpperCase()}\n\nGunakan frame terbaik dari scene sebelumnya sebagai referensi.`);
  });
}

function buildCaptionsHashtagsText(json: VideoJSON): string {
  const variations = json.production_notes?.caption_variations || [];
  return variations.map((cv, i) => [
    `=== CAPTION VARIASI ${i + 1} ===`,
    cv.caption_text,
    (cv.hashtags || []).join(' '),
    '',
  ].join('\n')).join('\n');
}

function DownloadBundleButton({ json, form }: { json: VideoJSON; form: FormData }) {
  const referenceFiles = useAppStore(s => s.referenceFiles);
  const referenceHydrating = useAppStore(s => s.referenceHydrating);
  const getBlob = (sourceName?: string) => (sourceName ? referenceFiles[sourceName]?.blob : undefined);

  const download = async () => {
    const zip = new JSZip();
    addReferenceSectionToZip(zip, form, getBlob, 'referensi');
    addScenesSectionToZip(zip, json);
    zip.file('captions_hashtags.txt', buildCaptionsHashtagsText(json));
    zip.file('video_full.json', JSON.stringify(json, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const titleSlug = slugify(json.video_metadata?.title || '', 40) || 'video';
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `viralframe_bahan_${titleSlug}_${dateStr}.zip`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      onClick={download}
      disabled={referenceHydrating}
      title={referenceHydrating ? 'Memulihkan foto referensi tersimpan...' : undefined}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
    >
      {referenceHydrating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {referenceHydrating ? ' Memulihkan foto...' : ' ⬇️ Download Bahan Lengkap (ZIP)'}
    </button>
  );
}

function HashtagCopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all"
      style={{ background: copied ? 'var(--vf-accent-success)' : 'var(--vf-bg-elevated)', color: copied ? 'white' : 'var(--vf-text-secondary)', border: `1px solid ${copied ? 'var(--vf-accent-success)' : 'var(--vf-border)'}` }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

function AutoFixButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all disabled:opacity-60"
      style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)', border: '1px solid var(--vf-accent-primary)' }}
    >
      {loading ? 'Memperbaiki...' : '✨ Perbaiki otomatis'}
    </button>
  );
}

function ViralScoreMeter({ score }: { score: string }) {
  const num = parseInt(score) || 0;
  const color = num >= 80 ? '#10B981' : num >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--vf-border)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${(num / 100) * 100} 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{num}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold" style={{ color }}>Viral Score: {score}</p>
        <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
          {num >= 80 ? '🔥 Tinggi' : num >= 60 ? '⭐ Sedang' : '📊 Perlu Peningkatan'}
        </p>
      </div>
    </div>
  );
}

export function DirectPanel({ json, form, onRegenerate, onEdit, referencePhotos }: DirectPanelProps) {
  const lastUsedProvider = useAppStore(s => s.lastUsedProvider);
  const settings = useAppStore(s => s.settings);
  const generatedOutput = useAppStore(s => s.generatedOutput);
  const setGeneratedOutput = useAppStore(s => s.setGeneratedOutput);
  const currentHistoryId = useAppStore(s => s.currentHistoryId);
  const updateHistoryOutput = useAppStore(s => s.updateHistoryOutput);
  const generateWarningsByScene = useAppStore(s => s.generateWarningsByScene);
  const setGenerateWarningsByScene = useAppStore(s => s.setGenerateWarningsByScene);
  const totalDuration = json.video_metadata.total_duration_seconds;
  const scoreStr = json.video_metadata.viral_score_estimate || '0/100';
  const aiTool = json.video_metadata.ai_video_tool;

  const [sceneRegen, setSceneRegen] = useState<Record<number, SceneRegenState>>({});
  const [sceneAutoFix, setSceneAutoFix] = useState<Record<number, AutoFixState>>({});
  const [captionAutoFix, setCaptionAutoFix] = useState<Record<number, AutoFixState>>({});
  const alternativePlatforms = PLATFORMS.filter(p => p.value !== json.video_metadata?.platform_primary);
  const [captionTargetPlatform, setCaptionTargetPlatform] = useState(alternativePlatforms[0]?.value || '');
  const [captionPlatformLoading, setCaptionPlatformLoading] = useState<string | null>(null);
  const [captionPlatformResults, setCaptionPlatformResults] = useState<Array<{ platform: string; variations: { caption_text: string; hashtags: string[] }[]; error?: string }>>([]);
  const [hookVariants, setHookVariants] = useState<{ loading: boolean; error: string; variants: SceneData[]; invalidIndices: number[] }>({ loading: false, error: '', variants: [], invalidIndices: [] });

  const patchSceneRegenState = (index: number, patch: Partial<SceneRegenState>) => {
    setSceneRegen(prev => ({ ...prev, [index]: { ...prev[index], loading: false, error: null, justRegenerated: false, ...patch } }));
  };

  const patchSceneAutoFix = (index: number, patch: Partial<AutoFixState>) => {
    setSceneAutoFix(prev => ({ ...prev, [index]: { ...prev[index], loading: false, error: null, remainingWarning: null, ...patch } }));
  };

  const patchCaptionAutoFix = (index: number, patch: Partial<AutoFixState>) => {
    setCaptionAutoFix(prev => ({ ...prev, [index]: { ...prev[index], loading: false, error: null, remainingWarning: null, ...patch } }));
  };

  const scenePolicyMap = getScenePolicyViolations(json, form);
  const captionPolicyMap = getCaptionPolicyViolations(json, form);

  const geminiModel = settings.geminiModel || 'gemini-3.5-flash';
  const apiKeys = { gemini: settings.geminiApiKey, groq: settings.groqApiKey, openrouter: settings.openrouterApiKey };

  // Auto-rephrase (Tugas 3) — HANYA satu percobaan, tidak retry-loop. Kalau masih melanggar setelah
  // rephrase, hasil TETAP di-splice (biasanya sudah lebih baik dari sebelumnya) dan sisa pelanggaran
  // ditampilkan sebagai warning — beda dengan regenerate (Tugas 1) yang membuang hasil kalau invalid.
  const autoFixScene = async (sceneIndex: number) => {
    const scene = json.scenes[sceneIndex];
    const violations = scenePolicyMap[scene.scene_number] || [];
    if (violations.length === 0) return;
    patchSceneAutoFix(sceneIndex, { loading: true, error: null, remainingWarning: null });
    try {
      const narrationWPM = settings.narrationWPM || 165;
      const prompt = buildSceneRephrasePrompt(json, sceneIndex, violations, form, narrationWPM);
      const rephrased = await generateWithFallback(prompt, apiKeys, parseSceneRephraseResponse, () => {}, undefined, geminiModel);
      const expectation = getSceneRegenExpectation(json, sceneIndex, form, narrationWPM);
      const validation = validateSceneRephrase(rephrased, expectation, json, form);

      if (!validation.valid) {
        patchSceneAutoFix(sceneIndex, { loading: false, error: validation.errors.join(' ') });
        return;
      }

      rephrased.scene_type = getSceneTypeSlug(form.contentStyle, sceneIndex, json.scenes.length, form);
      const newScenes = [...json.scenes];
      newScenes[sceneIndex] = rephrased;
      const newVideoJSON: VideoJSON = { ...json, scenes: newScenes };

      setGeneratedOutput(generatedOutput?.contentTypeId || 'short_video', newVideoJSON);
      if (currentHistoryId) updateHistoryOutput(currentHistoryId, newVideoJSON);
      setGenerateWarningsByScene(getSceneIssuesMap(newVideoJSON, form));

      patchSceneAutoFix(sceneIndex, {
        loading: false,
        error: null,
        remainingWarning: validation.warnings.length > 0 ? validation.warnings.join(' ') : null,
      });
    } catch (e: unknown) {
      const err = e as ApiCallError;
      patchSceneAutoFix(sceneIndex, { loading: false, error: err.message || 'Gagal memperbaiki scene ini.' });
    }
  };

  const autoFixCaption = async (captionIndex: number) => {
    const cv = json.production_notes.caption_variations[captionIndex];
    const violations = captionPolicyMap[captionIndex] || [];
    if (violations.length === 0) return;
    patchCaptionAutoFix(captionIndex, { loading: true, error: null, remainingWarning: null });
    try {
      const prompt = buildCaptionRephrasePrompt(json, captionIndex, violations, form);
      const rephrased: CaptionVariation = await generateWithFallback(prompt, apiKeys, parseCaptionRephraseResponse, () => {}, undefined, geminiModel);
      const validation = validateCaptionRephrase(rephrased, cv.hashtags.length, json, captionIndex, form);

      if (!validation.valid) {
        patchCaptionAutoFix(captionIndex, { loading: false, error: validation.errors.join(' ') });
        return;
      }

      const newCaptions = [...json.production_notes.caption_variations];
      newCaptions[captionIndex] = rephrased;
      const newVideoJSON: VideoJSON = { ...json, production_notes: { ...json.production_notes, caption_variations: newCaptions } };

      setGeneratedOutput(generatedOutput?.contentTypeId || 'short_video', newVideoJSON);
      if (currentHistoryId) updateHistoryOutput(currentHistoryId, newVideoJSON);

      patchCaptionAutoFix(captionIndex, {
        loading: false,
        error: null,
        remainingWarning: validation.warnings.length > 0 ? validation.warnings.join(' ') : null,
      });
    } catch (e: unknown) {
      const err = e as ApiCallError;
      patchCaptionAutoFix(captionIndex, { loading: false, error: err.message || 'Gagal memperbaiki caption ini.' });
    }
  };

  const handleCaptionPlatform = async (targetPlatform: string) => {
    if (!targetPlatform || !json.video_metadata) return;
    const existing = json.production_notes?.caption_variations || [];
    if (existing.length === 0) return;
    setCaptionPlatformLoading(targetPlatform);
    const behavior = PLATFORM_BEHAVIOR[targetPlatform] || 'Platform-specific optimization.';
    const growthNote = form.contentGoal === 'growth' ? ` Growth mode — NO commercial hashtags (#jualan, #promo, #diskon).` : '';
    const prompt = `Adapt these caption variations for ${targetPlatform}. Platform behavior: ${behavior}.${growthNote}

Existing captions:
${existing.map((cv, i) => `Caption ${i + 1}: "${cv.caption_text}"
Hashtags: ${(cv.hashtags || []).join(', ')}`).join('\n\n')}

Output ONLY a JSON object with the exact same number of caption variations adapted for ${targetPlatform}:
{ "caption_variations": [{ "caption_text": "...", "hashtags": ["#tag1", "#tag2"] }] }
Each caption_text must be adapted to ${targetPlatform} audience and format. Total caption_variations MUST equal ${existing.length}. Hashtags MUST be relevant to ${targetPlatform}. JSON only, no markdown, no explanation.`;
    try {
      const raw = await generateWithFallback<{ caption_variations: { caption_text: string; hashtags: string[] }[] }>(prompt, apiKeys, (t) => {
        try { const p = JSON.parse(t); return p?.caption_variations ? p : null; } catch { return null; }
      }, () => {}, undefined, geminiModel);
      const variations = raw?.caption_variations;
      if (variations && variations.length === existing.length) {
        setCaptionPlatformResults(prev => [...prev, { platform: PLATFORMS.find(p => p.value === targetPlatform)?.label || targetPlatform, variations }]);
      } else {
        setCaptionPlatformResults(prev => [...prev, { platform: PLATFORMS.find(p => p.value === targetPlatform)?.label || targetPlatform, variations: [], error: 'Jumlah variasi tidak sesuai atau format tidak valid.' }]);
      }
    } catch (e: unknown) {
      const msg = e instanceof ApiCallError ? e.message : 'Gagal generate caption untuk platform ini.';
      setCaptionPlatformResults(prev => [...prev, { platform: PLATFORMS.find(p => p.value === targetPlatform)?.label || targetPlatform, variations: [], error: msg }]);
    } finally {
      setCaptionPlatformLoading(null);
    }
  };

  const regenerateScene = async (sceneIndex: number) => {
    patchSceneRegenState(sceneIndex, { loading: true, error: null, justRegenerated: false });
    try {
      const narrationWPM = settings.narrationWPM || 165;
      const keys = { gemini: settings.geminiApiKey, groq: settings.groqApiKey, openrouter: settings.openrouterApiKey };
      const expectation = getSceneRegenExpectation(json, sceneIndex, form, narrationWPM);
      const geminiModel = settings.geminiModel || 'gemini-3.5-flash';

      const prompt = buildSceneRegenPrompt(json, sceneIndex, form, narrationWPM);
      let scene = await generateWithFallback(prompt, keys, parseSceneResponse, () => {}, undefined, geminiModel);
      let validation = validateSceneData(scene, expectation, form.hookType);

      // Repair loop 1x — pola sama dengan repair loop full-video di Home.tsx.
      if (!validation.valid || validation.warnings.length > 0) {
        const problems = [...validation.errors, ...validation.warnings];
        try {
          const repairPrompt = buildSceneRegenRepairPrompt(scene, problems, expectation);
          const repaired = await generateWithFallback(repairPrompt, keys, parseSceneResponse, () => {}, undefined, geminiModel);
          const revalidation = validateSceneData(repaired, expectation, form.hookType);
          if (revalidation.valid) {
            scene = repaired;
            validation = revalidation;
          }
        } catch {
          // Repair gagal — evaluasi hasil pertama apa adanya di bawah.
        }
      }

      if (!validation.valid) {
        patchSceneRegenState(sceneIndex, { loading: false, error: validation.errors.join(' ') });
        return;
      }

      scene.scene_type = getSceneTypeSlug(form.contentStyle, sceneIndex, json.scenes.length, form);

      const newScenes = [...json.scenes];
      newScenes[sceneIndex] = scene;
      const newVideoJSON: VideoJSON = { ...json, scenes: newScenes };

      setGeneratedOutput(generatedOutput?.contentTypeId || 'short_video', newVideoJSON);
      if (currentHistoryId) updateHistoryOutput(currentHistoryId, newVideoJSON);
      setGenerateWarningsByScene(getSceneIssuesMap(newVideoJSON, form));

      patchSceneRegenState(sceneIndex, { loading: false, error: null, justRegenerated: true });
      setTimeout(() => patchSceneRegenState(sceneIndex, { justRegenerated: false }), 5000);
    } catch (e: unknown) {
      const err = e as ApiCallError;
      patchSceneRegenState(sceneIndex, { loading: false, error: err.message || 'Gagal regenerate scene ini.' });
    }
  };

  const generateHookVariants = async () => {
    setHookVariants({ loading: true, error: '', variants: [], invalidIndices: [] });
    try {
      const narrationWPM = settings.narrationWPM || 165;
      const prompt = buildHookVariantsPrompt(json, form, narrationWPM, 3);
      const raw = await generateWithFallback(prompt, apiKeys, parseHookVariantsResponse, () => {}, undefined, geminiModel, settings.providerOrder);
      if (!raw) { setHookVariants(prev => ({ ...prev, loading: false, error: 'Gagal mengurai respons dari AI.' })); return; }
      const expectation = buildHookExpectation(json, form, narrationWPM);
      const validation = validateHookVariants(raw, 3, expectation);
      if (!validation.valid) { setHookVariants({ loading: false, error: validation.errors.join(' '), variants: [], invalidIndices: [] }); return; }
      const invalidIndices: number[] = [];
      raw.variants.forEach((v, i) => {
        const ve = validateHookVariants({ variants: [v] }, 1, expectation);
        if (!ve.valid) invalidIndices.push(i);
      });
      setHookVariants({ loading: false, error: '', variants: raw.variants, invalidIndices });
    } catch (e: unknown) {
      const msg = e instanceof ApiCallError ? e.message : 'Gagal generate variasi hook.';
      setHookVariants({ loading: false, error: msg, variants: [], invalidIndices: [] });
    }
  };

  const applyHookVariant = (variant: SceneData) => {
    const newScenes = [...json.scenes];
    newScenes[0] = {
      ...variant,
      scene_type: getSceneTypeSlug(form.contentStyle, 0, json.scenes.length, form),
    };
    const newVideoJSON: VideoJSON = { ...json, scenes: newScenes };
    setGeneratedOutput(generatedOutput?.contentTypeId || 'short_video', newVideoJSON);
    if (currentHistoryId) updateHistoryOutput(currentHistoryId, newVideoJSON);
    setGenerateWarningsByScene(getSceneIssuesMap(newVideoJSON, form));
    setHookVariants({ loading: false, error: '', variants: [], invalidIndices: [] });
    patchSceneRegenState(0, { justRegenerated: true });
    setTimeout(() => patchSceneRegenState(0, { justRegenerated: false }), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl p-4" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--vf-accent-success)' }}>✅ Generate Selesai</span>
          {lastUsedProvider && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--vf-accent-success)' }}>
              Digenerate via {lastUsedProvider === 'gemini' ? 'Gemini' : lastUsedProvider === 'groq' ? 'Groq' : 'OpenRouter'}
            </span>
          )}
          <span className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>
            {json.video_metadata.total_scenes} Scene · {totalDuration} Detik
          </span>
          <ViralScoreMeter score={scoreStr} />
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyAllButton json={json} />
          <DownloadJSONButton json={json} />
          <DownloadBundleButton json={json} form={form} />
          <button onClick={onRegenerate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
            <RefreshCw size={14} /> 🔄 Regenerate
          </button>
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
            <Edit size={14} /> ✏️ Edit Parameter
          </button>
        </div>
        {json.video_metadata.title && (
          <p className="text-sm mt-3 font-medium" style={{ color: 'var(--vf-text-primary)' }}>📹 {json.video_metadata.title}</p>
        )}
      </div>

      {/* Production Notes teaser */}
      {json.production_notes && (
        <div className="rounded-xl p-4" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--vf-text-secondary)' }}>📋 PRODUCTION NOTES</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {json.production_notes.posting_time_suggestion && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--vf-text-muted)' }}>Waktu Posting</span>
                <p className="mt-1" style={{ color: 'var(--vf-text-secondary)' }}>{json.production_notes.posting_time_suggestion}</p>
              </div>
            )}
            {json.production_notes.caption_variations && json.production_notes.caption_variations.length > 0 && (
              <div className="md:col-span-2">
                <span className="text-xs font-medium" style={{ color: 'var(--vf-text-muted)' }}>Variasi Captions & Hashtag</span>
                <div className="mt-2 space-y-3">
                  {json.production_notes.caption_variations.map((cv, i) => {
                    const isFlagged = (captionPolicyMap[i]?.length || 0) > 0;
                    return (
                    <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium flex-1" style={{ color: 'var(--vf-text-primary)' }}>
                          Variasi {i + 1}: "{cv.caption_text}"
                          {isFlagged && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--vf-accent-warning)' }}>
                              ⚠️ Flagged
                            </span>
                          )}
                        </p>
                        <HashtagCopyButton text={cv.caption_text} label="Copy Caption" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="flex-1 text-xs" style={{ color: 'var(--vf-text-secondary)' }}>{(cv.hashtags || []).join(' ')}</p>
                        <HashtagCopyButton text={(cv.hashtags || []).join(' ')} label="Copy Hashtag" />
                      </div>
                      {isFlagged && (
                        <div className="mt-2 flex items-center gap-2">
                          <AutoFixButton onClick={() => autoFixCaption(i)} loading={captionAutoFix[i]?.loading || false} />
                        </div>
                      )}
                      {captionAutoFix[i]?.error && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--vf-accent-danger)' }}>Gagal memperbaiki: {captionAutoFix[i]?.error}</p>
                      )}
                      {captionAutoFix[i]?.remainingWarning && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--vf-accent-warning)' }}>Sebagian masih perlu ditinjau manual: {captionAutoFix[i]?.remainingWarning}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI disclosure reminder */}
            <div className="md:col-span-2">
              <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
                ℹ️ Video hasil AI — jangan lupa aktifkan label "AI-generated content" saat upload di TikTok/YouTube/Instagram (kewajiban platform, di luar caption).
              </p>
            </div>

            {/* Caption platform variants */}
            <div className="md:col-span-2">
              <span className="text-xs font-medium" style={{ color: 'var(--vf-text-muted)' }}>Versi Platform Lain</span>
              <div className="mt-2 space-y-2">
                {captionPlatformResults.length > 0 && captionPlatformResults.map((r, idx) => (
                  <div key={idx} className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--vf-accent-primary)' }}>🌐 {r.platform}</p>
                    {r.variations.map((cv, vi) => (
                      <div key={vi} className="mb-2">
                        <p className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{cv.caption_text}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--vf-text-secondary)' }}>{(cv.hashtags || []).join(' ')}</p>
                        <button onClick={() => { navigator.clipboard.writeText(`${cv.caption_text}\n\n${(cv.hashtags || []).join(' ')}`); }} className="text-xs mt-1" style={{ color: 'var(--vf-accent-primary)' }}>⎘ Copy</button>
                      </div>
                    ))}
                    {r.error && <p className="text-xs" style={{ color: 'var(--vf-accent-danger)' }}>{r.error}</p>}
                  </div>
                ))}
                {captionPlatformLoading && (
                  <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: 'var(--vf-bg-secondary)' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--vf-accent-primary)' }} />
                    <span className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>Generate caption untuk {captionPlatformLoading}...</span>
                  </div>
                )}
                {!captionPlatformLoading && (
                  <div className="flex gap-2">
                    <select
                      value={captionTargetPlatform}
                      onChange={e => setCaptionTargetPlatform(e.target.value)}
                      className="px-2 py-1.5 rounded-lg text-xs outline-none"
                      style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
                    >
                      {PLATFORMS.filter(p => p.value !== json.video_metadata?.platform_primary).map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleCaptionPlatform(captionTargetPlatform)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
                    >
                      <Globe size={12} /> 🌐 Versi {PLATFORMS.find(p => p.value === captionTargetPlatform)?.label || captionTargetPlatform}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scene Cards */}
      <div className="space-y-4">
        {json.scenes.map((scene, i) => (
          <div key={i} className="space-y-3">
            <SceneCard
              scene={scene}
              aiTool={aiTool}
              isFirst={i === 0}
              isLast={i === json.scenes.length - 1}
              characterAnchor={json.character_sheet?.description}
              referencePhotos={referencePhotos}
              onRegenerateScene={() => regenerateScene(i)}
              regenLoading={sceneRegen[i]?.loading || false}
              regenError={sceneRegen[i]?.error || null}
              justRegenerated={sceneRegen[i]?.justRegenerated || false}
              issues={generateWarningsByScene[scene.scene_number] || []}
              hasPolicyIssue={(scenePolicyMap[scene.scene_number]?.length || 0) > 0}
              onAutoFixScene={() => autoFixScene(i)}
              autoFixLoading={sceneAutoFix[i]?.loading || false}
              autoFixError={sceneAutoFix[i]?.error || null}
              autoFixRemainingWarning={sceneAutoFix[i]?.remainingWarning || null}
            />
            {i === 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={generateHookVariants}
                  disabled={hookVariants.loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
                >
                  {hookVariants.loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  🅰️🅱️ Variasi Hook (3x)
                </button>

                {hookVariants.loading && (
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--vf-accent-primary)' }} />
                    <span className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>Membuat 3 variasi hook...</span>
                  </div>
                )}

                {hookVariants.error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)' }}>
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{hookVariants.error}</span>
                  </div>
                )}

                {hookVariants.variants.length > 0 && (
                  <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--vf-text-primary)' }}>🅰️🅱️ Variasi Hook Scene 1</p>
                    <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>Saat ini: "{scene.script_narration?.slice(0, 80)}..."</p>
                    {hookVariants.variants.map((v, vi) => (
                      !hookVariants.invalidIndices.includes(vi) && (
                        <div key={vi} className="p-3 rounded-lg space-y-1" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>Varian {vi + 1} — {v.viral_element_in_scene || 'hook'}</span>
                          <p className="text-xs mt-1" style={{ color: 'var(--vf-text-secondary)' }}>{v.script_narration}</p>
                          <p className="text-[11px]" style={{ color: 'var(--vf-text-muted)' }}>{v.ai_ready_prompt?.slice(0, 100)}...</p>
                          <button
                            type="button"
                            onClick={() => applyHookVariant(v)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs mt-1"
                            style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
                          >
                            ✅ Pakai varian ini
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
