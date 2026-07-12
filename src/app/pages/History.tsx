import { useState } from 'react';
import { Trash2, RefreshCw, Eye, Download } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppStore } from '../store';
import { SceneCard } from '../components/output/SceneCard';

export function History() {
  const history = useAppStore(s => s.history);
  const removeHistory = useAppStore(s => s.removeHistory);
  const clearHistory = useAppStore(s => s.clearHistory);
  const loadFormData = useAppStore(s => s.loadFormData);
  const setGeneratedOutput = useAppStore(s => s.setGeneratedOutput);
  const setMasterPrompt = useAppStore(s => s.setMasterPrompt);
  const navigate = useNavigate();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const viewingRecord = history.find(r => r.id === viewingId);

  const handleLoad = (id: string) => {
    const record = history.find(r => r.id === id);
    if (!record) return;
    loadFormData(record.formData);
    setGeneratedOutput(record.contentTypeId || 'short_video', record.output);
    setMasterPrompt(record.masterPrompt);
    navigate('/');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'viralframe-history.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ color: 'var(--vf-text-primary)' }}>📜 History Generate</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
            <Download size={14} /> Export JSON
          </button>
          {!showClearConfirm ? (
            <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}>
              <Trash2 size={14} /> Hapus Semua
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { clearHistory(); setShowClearConfirm(false); }} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-danger)', color: 'white' }}>
                Konfirmasi Hapus
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📭</p>
          <p style={{ color: 'var(--vf-text-secondary)' }}>Belum ada history generate.</p>
          <p className="text-sm mt-2" style={{ color: 'var(--vf-text-muted)' }}>History akan muncul setelah kamu generate video pertamamu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(record => (
            <div key={record.id} className="rounded-xl p-4" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--vf-text-primary)' }}>{record.label}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: 'var(--vf-text-muted)' }}>
                    <span>{new Date(record.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {record.formData.niche && <span>📂 {record.formData.niche}</span>}
                    {record.formData.aiTool && <span>🎬 {record.formData.aiTool}</span>}
                    <span>🎬 {record.formData.sceneCount} scene</span>
                    <span className={record.output ? 'text-green-500' : ''} style={{ color: record.output ? 'var(--vf-accent-success)' : 'var(--vf-text-muted)' }}>
                      {record.output ? '✅ Direct API' : '📋 Manual'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {record.output && (
                    <button
                      onClick={() => setViewingId(viewingId === record.id ? null : record.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
                      style={{ background: viewingId === record.id ? 'var(--vf-accent-secondary)' : 'var(--vf-bg-secondary)', color: viewingId === record.id ? 'white' : 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
                    >
                      <Eye size={12} /> Scene Cards
                    </button>
                  )}
                  <button
                    onClick={() => handleLoad(record.id)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
                    style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
                  >
                    <RefreshCw size={12} /> Load Ulang
                  </button>
                  <button
                    onClick={() => removeHistory(record.id)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
                    style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {viewingId === record.id && record.output && (
                <div className="mt-4 space-y-3">
                  {record.output.scenes.map((scene, i) => (
                    <SceneCard key={i} scene={scene} aiTool={record.formData.aiTool} isFirst={i === 0} characterAnchor={record.output?.character_sheet?.description} />
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-center text-xs mt-4" style={{ color: 'var(--vf-text-muted)' }}>
            {history.length}/50 record tersimpan
          </p>
        </div>
      )}
    </div>
  );
}
