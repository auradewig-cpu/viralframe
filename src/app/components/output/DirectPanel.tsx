import { useState } from 'react';
import { Copy, Check, Download, RefreshCw, Edit } from 'lucide-react';
import JSZip from 'jszip';
import { VideoJSON } from '../../types';
import { SceneCard } from './SceneCard';
import { useAppStore } from '../../store';

interface DirectPanelProps {
  json: VideoJSON;
  onRegenerate: () => void;
  onEdit: () => void;
  referencePhotos?: string[];
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

function DownloadZIPButton({ json }: { json: VideoJSON }) {
  const download = async () => {
    const zip = new JSZip();
    json.scenes.forEach(scene => {
      const folderName = `scene_${String(scene.scene_number).padStart(2, '0')}_${scene.scene_type}`;
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
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'viralframe-scenes.zip'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
      <Download size={14} /> ↓ Download ZIP Per Scene
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

export function DirectPanel({ json, onRegenerate, onEdit, referencePhotos }: DirectPanelProps) {
  const lastUsedProvider = useAppStore(s => s.lastUsedProvider);
  const totalDuration = json.video_metadata.total_duration_seconds;
  const scoreStr = json.video_metadata.viral_score_estimate || '0/100';
  const aiTool = json.video_metadata.ai_video_tool;

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
          <DownloadZIPButton json={json} />
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
                  {json.production_notes.caption_variations.map((cv, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium flex-1" style={{ color: 'var(--vf-text-primary)' }}>Variasi {i + 1}: "{cv.caption_text}"</p>
                        <HashtagCopyButton text={cv.caption_text} label="Copy Caption" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="flex-1 text-xs" style={{ color: 'var(--vf-text-secondary)' }}>{(cv.hashtags || []).join(' ')}</p>
                        <HashtagCopyButton text={(cv.hashtags || []).join(' ')} label="Copy Hashtag" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scene Cards */}
      <div className="space-y-4">
        {json.scenes.map((scene, i) => (
          <SceneCard key={i} scene={scene} aiTool={aiTool} isFirst={i === 0} characterAnchor={json.character_sheet?.description} referencePhotos={referencePhotos} />
        ))}
      </div>
    </div>
  );
}
