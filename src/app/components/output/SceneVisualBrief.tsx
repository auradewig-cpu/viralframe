import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SceneData } from '../../types';

export function SceneVisualBrief({ scene }: { scene: SceneData }) {
  const [briefOpen, setBriefOpen] = useState(false);
  return (
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
  );
}
