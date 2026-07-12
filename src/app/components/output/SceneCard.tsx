import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { SceneData } from '../../types';
import { AI_TOOLS } from '../../lib/maps';

interface SceneCardProps {
  scene: SceneData;
  aiTool: string;
  isFirst: boolean;
  isLast?: boolean;
  characterAnchor?: string;
  referencePhotos?: string[];
  // Regenerate per-scene (Tugas 1) — opsional, hanya tersedia saat SceneCard dirender dari
  // DirectPanel (context videoJSON + form lengkap tersedia). ManualPanel/History tidak mengisi ini.
  onRegenerateScene?: () => void;
  regenLoading?: boolean;
  regenError?: string | null;
  justRegenerated?: boolean;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
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
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied! ✓' : label}
    </button>
  );
}

function RefGuide({ aiTool, sceneNumber, isFirst }: { aiTool: string; sceneNumber: number; isFirst: boolean }) {
  const tool = AI_TOOLS.find(t => t.value === aiTool);
  const toolName = tool?.label || aiTool;
  const supportsRef = tool?.supportsRef || false;

  if (isFirst) {
    return (
      <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
        <p>Scene pertama — tidak perlu referensi dari scene sebelumnya.</p>
        <p className="mt-1">Setelah generate Scene 1: simpan frame terbaik sebagai referensi untuk Scene 2.</p>
        {!supportsRef && <p className="mt-2 text-xs" style={{ color: 'var(--vf-text-muted)' }}>Tool: {toolName} tidak mendukung reference image. Konsistensi dijaga melalui deskripsi karakter identik di setiap prompt.</p>}
      </div>
    );
  }

  const prev = sceneNumber - 1;
  if (!supportsRef) {
    return (
      <div className="p-3 rounded-lg text-sm space-y-1" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
        <p><strong>{toolName}</strong> tidak mendukung reference image.</p>
        <p>Konsistensi dijaga melalui deskripsi teks yang identik. Prompt setiap scene sudah menyertakan deskripsi karakter lengkap dan identik. Generate semua scene dengan prompt yang disediakan.</p>
      </div>
    );
  }

  const steps: Record<string, string[]> = {
    kling_ai: [`Generate Scene ${prev} terlebih dahulu`, 'Pilih frame terbaik → klik "..." → "Save Frame"', 'Di halaman baru: klik "Image to Video"', `Upload frame Scene ${prev} sebagai "Start Frame"`, `Paste prompt Scene ${sceneNumber} di kolom teks`, 'Klik Generate'],
    runway_gen4: [`Generate Scene ${prev}, download hasilnya`, 'Di Runway: pilih "Gen-4" → klik "Reference Image"', `Upload frame dari Scene ${prev}`, `Paste prompt Scene ${sceneNumber} di kolom teks`, 'Generate'],
    luma_dream: [`Generate Scene ${prev}, ambil frame terakhirnya`, 'Di Luma: klik "Keyframe" atau "Image to Video"', `Upload frame Scene ${prev} sebagai "Start Frame"`, `Paste prompt Scene ${sceneNumber}`, 'Generate'],
    minimax_hailuo: [`Generate Scene ${prev}, simpan frame terakhir`, 'Di Minimax: pilih "Subject Reference" atau "Image to Video"', 'Upload frame sebagai referensi', `Paste prompt Scene ${sceneNumber}`, 'Generate'],
    pika_labs: [`Generate Scene ${prev}, download frame terbaik`, 'Di Pika: klik "+" → "Upload Image"', `Upload frame Scene ${prev}`, `Paste prompt Scene ${sceneNumber} di kolom teks`, 'Generate'],
    bytedance_jianying: [`Generate Scene ${prev} di Jianying, simpan frame`, 'Pilih "AI Video" → "Image/Video to Video"', `Upload frame Scene ${prev}`, `Masukkan prompt Scene ${sceneNumber}`, 'Generate'],
    wan21: [`Generate Scene ${prev}, simpan frame terbaik`, 'Di Wan: pilih mode "Image to Video"', `Upload frame Scene ${prev}`, `Paste prompt Scene ${sceneNumber}`, 'Generate'],
  };

  const guideSteps = steps[aiTool] || [`Upload frame Scene ${prev} sebagai referensi di ${toolName}`, `Paste prompt Scene ${sceneNumber}`, 'Generate'];

  return (
    <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
      <p className="font-medium mb-2" style={{ color: 'var(--vf-text-primary)' }}>Tool: {toolName}</p>
      <ol className="space-y-1">
        {guideSteps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SceneCard({ scene, aiTool, isFirst, isLast = false, characterAnchor, referencePhotos, onRegenerateScene, regenLoading = false, regenError = null, justRegenerated = false }: SceneCardProps) {
  const [refOpen, setRefOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  const tool = AI_TOOLS.find(t => t.value === aiTool);
  const charLimit = tool?.charLimit || 400;
  const promptLen = scene.ai_ready_prompt?.length || 0;
  const promptOver = promptLen > charLimit;

  // Warna berdasarkan posisi (bukan slug) agar 8 gaya konten dengan role berbeda tetap terbaca benar.
  const sceneColor = isFirst
    ? 'var(--vf-accent-warning)'
    : isLast
      ? 'var(--vf-accent-cta)'
      : 'var(--vf-accent-secondary)';

  const sceneEmoji = isFirst ? '🎣' : isLast ? '📣' : '📖';
  // Label dari slug scene_type, mis. "hook_masalah" → "HOOK MASALAH".
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
          {justRegenerated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--vf-accent-success)' }}>
              🔄 Baru diregenerate
            </span>
          )}
        </div>
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

      {regenError && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)', borderBottom: '1px solid var(--vf-border)' }}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Gagal regenerate scene ini: {regenError}. Scene lama tetap dipakai.</span>
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
        <div>
          <button
            onClick={() => setBriefOpen(!briefOpen)}
            className="flex items-center gap-2 w-full text-left text-xs font-semibold py-2"
            style={{ color: 'var(--vf-text-secondary)' }}
          >
            🎬 VISUAL BRIEF
            {briefOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {briefOpen && (
            <div className="space-y-2 mt-1">
              <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)' }}>
                <p>{scene.visual_description}</p>
                {scene.camera_direction && <p className="mt-2"><span className="font-medium">📐 Kamera:</span> {scene.camera_direction}</p>}
                {scene.sound_design && <p className="mt-1"><span className="font-medium">🔊 Audio:</span> {scene.sound_design}</p>}
                {scene.transition_to_next && <p className="mt-1"><span className="font-medium">➡️ Transisi:</span> {scene.transition_to_next}</p>}
                {scene.viral_element_in_scene && <p className="mt-1"><span className="font-medium">⚡ Viral:</span> {scene.viral_element_in_scene}</p>}
                {scene.text_overlay && scene.text_overlay !== 'none' && <p className="mt-1"><span className="font-medium">✏️ Overlay:</span> {scene.text_overlay}</p>}
              </div>
            </div>
          )}
        </div>

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
            <RefGuide aiTool={aiTool} sceneNumber={scene.scene_number} isFirst={isFirst} />
          )}
        </div>
      </div>
    </div>
  );
}
