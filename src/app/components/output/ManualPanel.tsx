import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import { VideoJSON, FormData } from '../../types';
import { parseAiResponse, validateVideoJSON } from '../../lib/jsonParser';
import { applySceneTypeSlugs, getSceneRoleLabel } from '../../lib/contentStyles';
import { checkPolicyCompliance, formatPolicyViolations } from '../../lib/policyCheck';
import { SceneCard } from './SceneCard';

interface ManualPanelProps {
  masterPrompt: string;
  sceneCount: number;
  aiTool: string;
  contentStyle?: string;
  onJsonValidated: (json: VideoJSON) => void;
  referencePhotos?: string[];
  captionVariationCount?: number;
  // Opsional — kalau tersedia, dipakai supaya scene_type property_tour ("tour_<identitas>") konsisten
  // dengan Direct mode (lihat lib/contentStyles.ts). Tanpa ini, fallback ke slug generik.
  form?: FormData;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
      style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied! ✓' : label}
    </button>
  );
}

export function ManualPanel({ masterPrompt, sceneCount, aiTool, contentStyle = 'direct_response', onJsonValidated, referencePhotos, captionVariationCount = 1, form }: ManualPanelProps) {
  const [tab, setTab] = useState<'prompt' | 'inspect' | 'brief' | 'validate'>('prompt');
  const [pastedJson, setPastedJson] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[]; json: VideoJSON | null } | null>(null);
  const previewRef = useRef<HTMLPreElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (previewRef.current) {
      Prism.highlightElement(previewRef.current);
    }
  }, [pastedJson, showPreview]);

  const tokenEstimate = Math.round(masterPrompt.length / 4);

  const handleValidate = () => {
    const json = parseAiResponse(pastedJson);
    if (!json) {
      setValidationResult({ valid: false, errors: ['JSON tidak valid atau tidak dapat di-parse. Pastikan output AI dimulai dengan { dan diakhiri dengan }.'], warnings: [], json: null });
      return;
    }
    // Sanitasi scene_type juga di Manual mode — nama folder ZIP dibangun dari field ini.
    if (json.scenes && Array.isArray(json.scenes)) {
      applySceneTypeSlugs(json.scenes, contentStyle, form);
    }
    // form diteruskan supaya Manual mode memvalidasi hal yang sama dengan Direct mode
    // (reference_image per scene, nama file foto karakter, dst) — dulu di-skip.
    const result = validateVideoJSON(json, sceneCount, captionVariationCount, aiTool, (form?.referencePhotos?.length ?? 0) > 0, form);
    const policyMsgs = formatPolicyViolations(checkPolicyCompliance(json, form?.contentGoal));
    setValidationResult({ ...result, warnings: [...result.warnings, ...policyMsgs], json: result.valid ? json : null });
    if (result.valid) onJsonValidated(json);
  };

  const downloadTxt = () => {
    const blob = new Blob([masterPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'viralframe-master-prompt.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'prompt', label: '📋 Master Prompt' },
    { id: 'inspect', label: '🔍 Prompt Inspector' },
    { id: 'brief', label: '🎬 Scene Brief' },
    { id: 'validate', label: '✅ Paste & Validate' },
  ] as const;

  const promptBlocks = masterPrompt.split(/\n\[BLOK/).filter(Boolean);

  return (
    <div className="space-y-0">
      {/* Tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid var(--vf-border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-3 text-sm whitespace-nowrap transition-colors"
            style={{
              color: tab === t.id ? 'var(--vf-accent-primary)' : 'var(--vf-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--vf-accent-primary)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === 'prompt' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                <CopyButton text={masterPrompt} label="⎘ Copy Master Prompt" />
                <button onClick={downloadTxt} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
                  <Download size={14} /> ↓ Download .txt
                </button>
              </div>
              <div className="flex gap-4 text-xs" style={{ color: 'var(--vf-text-muted)' }}>
                <span>~{tokenEstimate.toLocaleString()} token</span>
                <span>{sceneCount} scene</span>
              </div>
            </div>
            <p className="text-xs p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)' }}>
              💡 Paste ke ChatGPT, Claude, atau Gemini. AI akan menghasilkan JSON per scene. Kemudian paste hasilnya di tab "Paste & Validate".
            </p>
            <textarea
              readOnly
              value={masterPrompt}
              rows={20}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none font-mono"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)', fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
        )}

        {tab === 'inspect' && (
          <div className="space-y-3">
            {promptBlocks.map((block, i) => {
              const blockNum = i === 0 ? '' : i;
              const lines = block.split('\n');
              const title = i === 0 ? 'VIRALFRAME MASTER PROMPT' : `BLOK ${blockNum}: ${lines[0]?.replace(']', '')}`;
              const content = i === 0 ? block : lines.slice(1).join('\n');
              return (
                <details key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--vf-border)' }}>
                  <summary className="px-4 py-3 cursor-pointer font-medium text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)' }}>
                    {title.trim()}
                  </summary>
                  <pre className="p-4 text-xs whitespace-pre-wrap overflow-x-auto" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {content.trim()}
                  </pre>
                </details>
              );
            })}
          </div>
        )}

        {tab === 'brief' && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>Timeline scene video kamu:</p>
            <div className="flex gap-1 items-stretch">
              {Array.from({ length: sceneCount }, (_, i) => {
                const role = getSceneRoleLabel(contentStyle, i, sceneCount);
                const color = i === 0 ? 'var(--vf-accent-warning)' : i === sceneCount - 1 ? 'var(--vf-accent-cta)' : 'var(--vf-accent-secondary)';
                const emoji = i === 0 ? '🎣' : i === sceneCount - 1 ? '📣' : '📖';
                return (
                  <div key={i} className="flex-1 rounded-lg p-3 flex flex-col items-center gap-1 text-center" style={{ background: 'var(--vf-bg-elevated)', border: `2px solid ${color}` }}>
                    <span className="text-lg">{emoji}</span>
                    <span className="text-xs font-bold" style={{ color }}>{role.toUpperCase()}</span>
                    <span className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>S{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
              Scene 1 = {getSceneRoleLabel(contentStyle, 0, sceneCount)} · Scene {sceneCount} = {getSceneRoleLabel(contentStyle, sceneCount - 1, sceneCount)}
            </p>
          </div>
        )}

        {tab === 'validate' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>Paste hasil JSON dari AI di sini:</p>
            <textarea
              value={pastedJson}
              onChange={e => { setPastedJson(e.target.value); setShowPreview(false); }}
              rows={8}
              placeholder={`{\n  "video_metadata": {...},\n  "scenes": [...]\n}`}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none font-mono"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)', fontFamily: "'JetBrains Mono', monospace" }}
            />
            {pastedJson.trim() && (
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
                >
                  {showPreview ? 'Sembunyikan Preview' : '👁️ Preview JSON (syntax highlighted)'}
                </button>
                {showPreview && (
                  <pre
                    ref={previewRef}
                    className="mt-2 p-3 rounded-lg text-xs overflow-x-auto"
                    style={{ background: '#2d2d2d', color: '#ccc', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <code className="language-json">{pastedJson}</code>
                  </pre>
                )}
              </div>
            )}
            <button
              onClick={handleValidate}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
              disabled={!pastedJson.trim()}
            >
              ✓ Validasi JSON
            </button>

            {validationResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: validationResult.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  {validationResult.valid ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                  <span className="text-sm font-medium" style={{ color: validationResult.valid ? 'var(--vf-accent-success)' : 'var(--vf-accent-danger)' }}>
                    {validationResult.valid ? '✅ JSON Valid! Scene Cards di bawah.' : '❌ JSON Tidak Valid'}
                  </span>
                </div>
                {validationResult.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)' }}>
                    <XCircle size={14} className="mt-0.5 shrink-0" />
                    {e}
                  </div>
                ))}
                {validationResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded text-sm" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)' }}>
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {validationResult?.valid && validationResult.json && (
              <div className="space-y-4 mt-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--vf-text-primary)' }}>Scene Cards dari JSON yang divalidasi:</p>
                {validationResult.json.scenes.map((scene, i) => (
                  <SceneCard key={i} scene={scene} aiTool={aiTool} isFirst={i === 0} isLast={i === validationResult.json!.scenes.length - 1} characterAnchor={validationResult.json?.character_sheet?.description} referencePhotos={referencePhotos} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
