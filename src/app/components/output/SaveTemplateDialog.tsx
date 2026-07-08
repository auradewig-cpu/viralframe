import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store';
import { FormData } from '../../types';

interface SaveTemplateDialogProps {
  formData: FormData;
  onClose: () => void;
}

export function SaveTemplateDialog({ formData, onClose }: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const addTemplate = useAppStore(s => s.addTemplate);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    addTemplate({
      id: Date.now().toString(),
      name: name.trim(),
      niche: formData.niche,
      platform: formData.platforms[0] || '',
      sceneCount: formData.sceneCount,
      durationPerScene: formData.uniformDuration,
      hookType: formData.hookType,
      ctaType: formData.ctaType,
      aiTool: formData.aiTool,
      isPreset: false,
      formData: { ...formData, referencePhotos: [] },
    });
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 rounded-xl p-6"
        style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--vf-text-primary)' }}>
            {saved ? '✅ Tersimpan!' : '💾 Simpan sebagai Template'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--vf-text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        {!saved ? (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--vf-text-secondary)' }}>
              Simpan konfigurasi form ini sebagai template custom untuk digunakan lagi nanti.
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nama template (contoh: Affiliate RunFast)"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
              >
                Simpan Template
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--vf-accent-success)' }}>
            Template "{name}" berhasil disimpan.
          </p>
        )}
      </div>
    </div>
  );
}
