import { useState, useEffect } from 'react';
import { Trash2, Loader2, Image } from 'lucide-react';
import { useAppStore } from '../../store';
import { estimateUsage, clearAll as clearAllRefImages } from '../../lib/refImageDB';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReferenceImageStorageSection() {
  const clearReferenceFiles = useAppStore(s => s.clearReferenceFiles);
  const [usage, setUsage] = useState<{ count: number; totalBytes: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refreshUsage = () => { estimateUsage().then(setUsage); };
  useEffect(() => { refreshUsage(); }, []);

  const handleClearAll = async () => {
    setClearing(true);
    await clearAllRefImages();
    clearReferenceFiles();
    setClearing(false);
    setShowConfirm(false);
    refreshUsage();
  };

  return (
    <section>
      <h2 className="mb-4" style={{ color: 'var(--vf-text-primary)' }}>🖼️ Penyimpanan Foto Referensi</h2>
      <div className="space-y-3 p-4 rounded-xl" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
        <div className="flex items-center gap-3">
          <Image size={20} style={{ color: 'var(--vf-text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>
            {usage === null ? 'Menghitung...' : `${usage.count} foto tersimpan · ${formatBytes(usage.totalBytes)}`}
          </p>
        </div>
        <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
          Foto referensi (karakter, lokasi, produk) disimpan di IndexedDB browser ini supaya tetap
          ada setelah reload atau saat dibuka lagi dari History — bukan di localStorage, jadi tidak
          berisiko penuh (QuotaExceeded).
        </p>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!usage || usage.count === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}
          >
            <Trash2 size={14} /> Bersihkan semua foto tersimpan
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--vf-accent-warning)' }}>
              ⚠️ Ini hanya menghapus FILE foto tersimpan. Mapping nama file & prompt yang sudah
              digenerate TIDAK ikut terhapus — kamu perlu upload ulang foto kalau ingin
              menyertakannya lagi di ZIP.
            </p>
            <div className="flex gap-2">
              <button onClick={handleClearAll} disabled={clearing} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-danger)', color: 'white' }}>
                {clearing ? <Loader2 size={14} className="animate-spin" /> : null} Konfirmasi Hapus
              </button>
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
