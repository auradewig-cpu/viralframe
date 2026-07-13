import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X, Loader2, Trash2, Download, Sun, Moon, Image } from 'lucide-react';
import { useAppStore } from '../store';
import { AI_TOOLS, PLATFORMS, LANGUAGES } from '../lib/maps';
import { estimateUsage, clearAll as clearAllRefImages } from '../lib/refImageDB';

const WPM_OPTIONS = [
  { value: 120, label: '120 WPM — Santai (formal, tenang)' },
  { value: 140, label: '140 WPM — Normal (natural, jelas)' },
  { value: 165, label: '165 WPM — Cepat & Jelas (Direkomendasikan, gaya konten kreator)' },
  { value: 185, label: '185 WPM — Lebih Cepat' },
  { value: 200, label: '200 WPM — Sangat Cepat (berisiko kurang jelas)' },
];

const GEMINI_MODELS = [
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — Paling pintar (Direkomendasikan)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite — Lebih cepat & hemat' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite — Paling hemat (model lama, masih valid)' },
];

function maskKey(key: string): string {
  if (!key || key.length < 10) return key;
  return key.slice(0, 7) + '•'.repeat(key.length - 12) + key.slice(-5);
}

function ApiKeyField({
  label, storageKey, description, provider, showModelSelect
}: {
  label: string; storageKey: 'geminiApiKey' | 'groqApiKey' | 'openrouterApiKey';
  description: string; provider: 'gemini' | 'groq' | 'openrouter';
  showModelSelect?: boolean;
}) {
  const settings = useAppStore(s => s.settings);
  const setSettings = useAppStore(s => s.setSettings);

  const [inputVal, setInputVal] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const savedKey = settings[storageKey];

  const handleSave = () => {
    if (!inputVal.trim()) return;
    setSettings({ [storageKey]: inputVal.trim() });
    setInputVal('');
    setShowInput(false);
  };

  const handleDelete = () => {
    setSettings({ [storageKey]: '' });
    setTestStatus('idle');
  };

  const handleTest = async () => {
    if (!savedKey) return;
    setTestStatus('testing');
    try {
      if (provider === 'gemini') {
        const modelToTest = settings.geminiModel || 'gemini-3.5-flash';
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': savedKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 5 } }),
        });
        if (resp.ok) { setTestStatus('ok'); setTestMsg('Gemini Flash — Terhubung'); }
        else if (resp.status === 401 || resp.status === 403) { setTestStatus('error'); setTestMsg('API key tidak valid'); }
        else if (resp.status === 404) { setTestStatus('error'); setTestMsg('Model tidak ditemukan — kemungkinan API key dibatasi (restricted) atau region tidak didukung'); }
        else { setTestStatus('error'); setTestMsg(`Gagal terhubung (HTTP ${resp.status})`); }
      } else if (provider === 'groq') {
        const resp = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${savedKey}` } });
        if (resp.ok) { setTestStatus('ok'); setTestMsg('Groq Llama 3.3 70B — Terhubung'); }
        else { setTestStatus('error'); setTestMsg('API key tidak valid'); }
      } else {
        setTestStatus('ok'); setTestMsg('OpenRouter key tersimpan (test tidak tersedia langsung)');
      }
    } catch {
      setTestStatus('error'); setTestMsg('Tidak dapat terhubung. Periksa koneksi internet.');
    }
  };

  return (
    <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--vf-text-primary)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--vf-text-muted)' }}>{description}</p>
        </div>
        {savedKey && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--vf-accent-success)' }}>✅ Tersimpan</span>
        )}
      </div>

      {showModelSelect && (
        <div>
          <label className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>Model</label>
          <select
            value={settings.geminiModel || 'gemini-3.5-flash'}
            onChange={e => setSettings({ geminiModel: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
          >
            {GEMINI_MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {savedKey && !showInput && (
        <div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--vf-bg-secondary)', border: '1px solid var(--vf-border)' }}>
            <span className="flex-1 text-sm font-mono" style={{ color: 'var(--vf-text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {showKey ? savedKey : maskKey(savedKey)}
            </span>
            <button onClick={() => setShowKey(!showKey)} style={{ color: 'var(--vf-text-muted)' }}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
            >
              {testStatus === 'testing' ? <Loader2 size={12} className="animate-spin" /> : null}
              Test Koneksi
            </button>
            <button
              onClick={() => setShowInput(true)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
            >
              Ganti Key
            </button>
            <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)', background: 'var(--vf-bg-secondary)' }}>
              <Trash2 size={12} /> Hapus Key
            </button>
          </div>
          {testStatus !== 'idle' && testStatus !== 'testing' && (
            <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: testStatus === 'ok' ? 'var(--vf-accent-success)' : 'var(--vf-accent-danger)' }}>
              {testStatus === 'ok' ? <Check size={12} /> : <X size={12} />}
              {testMsg}
            </div>
          )}
        </div>
      )}

      {(!savedKey || showInput) && (
        <div>
          <div className="flex gap-2">
            <input
              type="password"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder={`Masukkan ${label}`}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
            />
            <button onClick={handleSave} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-primary)', color: 'white' }} disabled={!inputVal.trim()}>
              Simpan
            </button>
            {showInput && <button onClick={() => setShowInput(false)} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>Batal</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReferenceImageStorageSection() {
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

export function Settings() {
  const settings = useAppStore(s => s.settings);
  const setSettings = useAppStore(s => s.setSettings);
  const clearHistory = useAppStore(s => s.clearHistory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExportHistory = () => {
    const history = useAppStore.getState().history;
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'viralframe-history-all.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 style={{ color: 'var(--vf-text-primary)' }}>⚙️ Settings</h1>

      {/* API Configuration */}
      <section>
        <h2 className="mb-4" style={{ color: 'var(--vf-text-primary)' }}>🔑 API Configuration</h2>
        <div className="space-y-4">
          <ApiKeyField
            label="Google Gemini API Key (Direkomendasikan — Gratis)"
            storageKey="geminiApiKey"
            description="250 req/hari · 1M token/hari · CORS supported"
            provider="gemini"
            showModelSelect
          />
          <ApiKeyField
            label="Groq API Key (Backup Otomatis)"
            storageKey="groqApiKey"
            description="~1000 req/hari · Llama 3.3 70B · Auto-fallback jika Gemini gagal"
            provider="groq"
          />
          <ApiKeyField
            label="OpenRouter API Key (Opsional)"
            storageKey="openrouterApiKey"
            description="Akses berbagai model · Bergantung pada model yang dipilih"
            provider="openrouter"
          />
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-text-secondary)' }}>
            🔒 API key kamu disimpan hanya di browser ini (localStorage). Tidak pernah dikirim ke server ViralFrame. Hanya dikirim langsung ke Google/Groq saat generate.
          </div>
        </div>
      </section>

      {/* Default Preferences */}
      <section>
        <h2 className="mb-4" style={{ color: 'var(--vf-text-primary)' }}>🎛️ Preferensi Default</h2>
        <div className="space-y-4 p-4 rounded-xl" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--vf-text-primary)' }}>Default AI Video Tool</label>
              <select value={settings.defaultAiTool} onChange={e => setSettings({ defaultAiTool: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}>
                <option value="">— Tidak ada default —</option>
                {AI_TOOLS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--vf-text-primary)' }}>Default Platform</label>
              <select value={settings.defaultPlatform} onChange={e => setSettings({ defaultPlatform: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}>
                <option value="">— Tidak ada default —</option>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--vf-text-primary)' }}>Default Bahasa</label>
              <select value={settings.defaultLanguage} onChange={e => setSettings({ defaultLanguage: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--vf-text-primary)' }}>Default Mode Generate</label>
              <div className="flex gap-4 mt-2">
                {(['direct', 'manual'] as const).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={settings.defaultMode === m} onChange={() => setSettings({ defaultMode: m })} className="accent-indigo-500" />
                    <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{m === 'direct' ? '⚡ Direct API' : '📋 Manual Prompt'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--vf-text-primary)' }}>Tema UI</label>
              <div className="flex gap-4 mt-2">
                {[{ value: true, label: '🌙 Dark Mode', icon: Moon }, { value: false, label: '☀️ Light Mode', icon: Sun }].map(({ value, label }) => (
                  <label key={String(value)} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={settings.darkMode === value} onChange={() => setSettings({ darkMode: value })} className="accent-indigo-500" />
                    <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>Kecepatan Narasi Target (WPM)</label>
            <p className="text-xs mt-0.5" style={{ color: 'var(--vf-text-muted)' }}>Mengatur jumlah kata maksimal per scene agar sesuai kecepatan bicara yang kamu mau. Makin tinggi = makin banyak kata, makin cepat harus diucapkan.</p>
            <select
              value={settings.narrationWPM || 165}
              onChange={e => setSettings({ narrationWPM: Number(e.target.value) })}
              className="w-full mt-2 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
            >
              {WPM_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <ReferenceImageStorageSection />

      {/* Data & Privacy */}
      <section>
        <h2 className="mb-4" style={{ color: 'var(--vf-text-primary)' }}>🔒 Data & Privacy</h2>
        <div className="space-y-3 p-4 rounded-xl" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
          <button
            onClick={handleExportHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
          >
            <Download size={14} /> Export Semua History (.json)
          </button>
          {!showClearConfirm ? (
            <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}>
              <Trash2 size={14} /> Hapus Semua History
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { clearHistory(); setShowClearConfirm(false); }} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-danger)', color: 'white' }}>Konfirmasi Hapus</button>
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>Batal</button>
            </div>
          )}
          <button
            onClick={() => { setSettings({ geminiApiKey: '', groqApiKey: '', openrouterApiKey: '' }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}
          >
            <Trash2 size={14} /> Hapus Semua API Key
          </button>
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
              Reset Semua Settings
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setSettings({ defaultAiTool: '', defaultPlatform: '', defaultLanguage: 'id', defaultMode: 'direct' }); setShowResetConfirm(false); }} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-warning)', color: 'white' }}>Konfirmasi Reset</button>
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>Batal</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
