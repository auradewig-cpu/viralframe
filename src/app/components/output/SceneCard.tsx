import { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { SceneData } from '../../types';
import { AI_TOOLS } from '../../lib/maps';
import { CopyButton } from './CopyButton';
import { RefFrameGuide } from './RefFrameGuide';
import { SceneVisualBrief } from './SceneVisualBrief';

interface SceneCardProps {
  scene: SceneData;
  aiTool: string;
  isFirst: boolean;
  isLast?: boolean;
  characterAnchor?: string;
  referencePhotos?: string[];
  onRegenerateScene?: () => void;
  regenLoading?: boolean;
  regenError?: string | null;
  justRegenerated?: boolean;
  issues?: string[];
  hasPolicyIssue?: boolean;
  onAutoFixScene?: () => void;
  autoFixLoading?: boolean;
  autoFixError?: string | null;
  autoFixRemainingWarning?: string | null;
}

export function SceneCard({
  scene, aiTool, isFirst, isLast = false, characterAnchor, referencePhotos,
  onRegenerateScene, regenLoading = false, regenError = null, justRegenerated = false, issues = [],
  hasPolicyIssue = false, onAutoFixScene, autoFixLoading = false, autoFixError = null, autoFixRemainingWarning = null,
}: SceneCardProps) {
  const [refOpen, setRefOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const isFlagged = issues.length > 0;

  const tool = AI_TOOLS.find(t => t.value === aiTool);
  const charLimit = tool?.charLimit || 400;
  const promptLen = scene.ai_ready_prompt?.length || 0;
  const promptOver = promptLen > charLimit;

  const sceneColor = isFirst
    ? 'var(--vf-accent-warning)'
    : isLast
      ? 'var(--vf-accent-cta)'
      : 'var(--vf-accent-secondary)';

  const sceneEmoji = isFirst ? '🎣' : isLast ? '📣' : '📖';
  const sceneLabel = (scene.scene_type || 'scene').replace(/_/g, ' ').toUpperCase();

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid var(--vf-border)`, borderLeft: `4px solid ${sceneColor}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ background: 'var(--vf-bg-elevated)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: sceneColor, color: 'white' }}>
            {sceneEmoji} SCENE {scene.scene_number} — {sceneLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
            {scene.duration_seconds}s · {scene.speech_pace} · maks {scene.max_words} kata
          </span>
          {justRegenerated ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--vf-accent-success)' }}>
              🔄 Baru diregenerate
            </span>
          ) : isFlagged ? (
            <button
              onClick={() => setIssuesOpen(!issuesOpen)}
              title={issues.join('\n')}
              className="text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer"
              style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--vf-accent-warning)' }}
            >
              ⚠️ Flagged ({issues.length})
            </button>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--vf-accent-success)' }}>
              ✅ OK
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasPolicyIssue && onAutoFixScene && (
            <button
              onClick={onAutoFixScene}
              disabled={autoFixLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all disabled:opacity-60"
              style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)', border: '1px solid var(--vf-accent-primary)' }}
            >
              {autoFixLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {autoFixLoading ? 'Memperbaiki...' : '✨ Perbaiki otomatis'}
            </button>
          )}
          {onRegenerateScene && (
            <button
              onClick={onRegenerateScene}
              disabled={regenLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all disabled:opacity-60"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
            >
              {regenLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {regenLoading ? 'Regenerating...' : '🔄 Regenerate scene ini'}
            </button>
          )}
        </div>
      </div>

      {regenError && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)', borderBottom: '1px solid var(--vf-border)' }}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Gagal regenerate scene ini: {regenError}. Scene lama tetap dipakai.</span>
        </div>
      )}

      {autoFixError && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)', borderBottom: '1px solid var(--vf-border)' }}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Gagal memperbaiki otomatis: {autoFixError}. Scene lama tetap dipakai.</span>
        </div>
      )}

      {!autoFixError && autoFixRemainingWarning && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)', borderBottom: '1px solid var(--vf-border)' }}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Sebagian pelanggaran masih tersisa setelah 1x percobaan perbaikan: {autoFixRemainingWarning}</span>
        </div>
      )}

      {issuesOpen && isFlagged && (
        <div className="px-4 py-2.5 text-xs space-y-1" style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid var(--vf-border)' }}>
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2" style={{ color: 'var(--vf-accent-warning)' }}>
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 space-y-4" style={{ background: 'var(--vf-bg-secondary)' }}>
        {/* Script narration */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--vf-text-secondary)' }}>📝 SCRIPT NARASI</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)' }}>🇮🇩 Bahasa Indonesia — narasi yang diucapkan / di-dubbing</span>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-elevated)' }}>
            <p className="italic" style={{ color: 'var(--vf-text-primary)' }}>"{scene.script_narration}"</p>
            <p className="text-xs mt-1.5" style={{ color: scene.script_word_count > scene.max_words ? 'var(--vf-accent-danger)' : 'var(--vf-accent-success)' }}>
              {scene.script_word_count > scene.max_words ? '⚠️' : '✅'} {scene.script_word_count} kata — {scene.script_fit_confirmation}
            </p>
          </div>
          {scene.script_subtitle && (
            <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--vf-bg-elevated)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--vf-text-muted)' }}>🔤 SUBTITLE</p>
              <p className="text-sm italic" style={{ color: 'var(--vf-text-secondary)' }}>"{scene.script_subtitle}"</p>
            </div>
          )}
        </div>

        {/* AI Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--vf-text-secondary)' }}>🎥 PROMPT VIDEO — {tool?.label || aiTool}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--vf-accent-secondary)' }}>🇬🇧 English — di-paste ke AI video generator</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded cursor-help"
                style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-muted)' }}
                title="Prompt video selalu dalam Bahasa Inggris karena AI video generator (Veo3, Kling, Runway, dll.) hanya memahami English. Bahasa Indonesia yang kamu pilih di form = bahasa narasi yang diucapkan di video."
              >
                ⓘ
              </span>
            </div>
          </div>
          <div className="p-3 rounded-lg font-mono text-sm" style={{ background: 'var(--vf-bg-elevated)', fontFamily: "'JetBrains Mono', Fira Code, monospace", color: 'var(--vf-text-primary)' }}>
            {scene.ai_ready_prompt}
          </div>
          <div className="flex items-center justify-between mt-2">
            <CopyButton text={JSON.stringify(scene, null, 2)} label={`⎘ Copy Prompt Scene ${scene.scene_number}`} />
            <span className="text-xs" style={{ color: promptOver ? 'var(--vf-accent-danger)' : 'var(--vf-accent-success)' }}>
              {promptLen} / {charLimit} chars {promptOver ? '⚠️' : '✅'}
            </span>
          </div>
        </div>

        {/* Character Anchor */}
        {characterAnchor && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--vf-text-secondary)' }}>🧬 CHARACTER ANCHOR (selalu ada di prompt ini)</span>
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--vf-accent-primary)', color: 'var(--vf-accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {characterAnchor}
            </div>
          </div>
        )}

        {/* Reference Images */}
        {referencePhotos && referencePhotos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--vf-text-secondary)' }}>📸 REFERENCE IMAGES</span>
            </div>
            <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--vf-bg-elevated)' }}>
              <div className="flex flex-wrap gap-2">
                {referencePhotos.map((photo, idx) => (
                  <img key={idx} src={photo} alt={`Reference ${idx + 1}`}
                    className="w-20 h-20 rounded-lg object-cover"
                    style={{ border: '2px solid var(--vf-border)' }}
                  />
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
                Upload foto ini ke AI video tool sebagai Image Reference atau Style Reference saat generate scene.
              </p>
              <div className="text-xs space-y-1" style={{ color: 'var(--vf-text-secondary)' }}>
                <p><strong>Google Flow (Veo3):</strong> Klik 'Add reference' → upload foto ini sebelum generate</p>
                <p><strong>Kling AI:</strong> Pilih 'Image to Video' → upload foto ini sebagai Start Frame atau Style</p>
                <p><strong>Runway Gen-4:</strong> Klik 'Reference Image' → upload foto ini</p>
              </div>
            </div>
          </div>
        )}

        {/* Visual Brief (collapsible) */}
        <SceneVisualBrief scene={scene} />

        {/* Reference Frame Guide (collapsible) */}
        <div>
          <button
            onClick={() => setRefOpen(!refOpen)}
            className="flex items-center gap-2 w-full text-left text-xs font-semibold py-2"
            style={{ color: 'var(--vf-text-secondary)' }}
          >
            🔗 REFERENCE FRAME GUIDE
            {refOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {refOpen && (
            <RefFrameGuide aiTool={aiTool} sceneNumber={scene.scene_number} isFirst={isFirst} />
          )}
        </div>
      </div>
    </div>
  );
}
