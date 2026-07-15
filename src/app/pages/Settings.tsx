import { useState } from 'react';
import { Sun, Moon, Download, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { AI_TOOLS, PLATFORMS, LANGUAGES } from '../lib/maps';
import { ApiKeyField, WPM_OPTIONS, GEMINI_MODELS, IMAGE_MODEL_OPTIONS } from '../components/settings/ApiKeyField';
import { ReferenceImageStorageSection } from '../components/settings/ReferenceImageStorageSection';

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

          {/* Provider Order */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--vf-text-primary)' }}>Urutan Fallback Provider</p>
            <p className="text-xs mb-2" style={{ color: 'var(--vf-text-muted)' }}>Atur prioritas provider — ▲ naikkan prioritas, ▼ turunkan. Provider tanpa API key otomatis dilewati.</p>
            <div className="space-y-1">
              {(() => {
                const currentOrder = settings.providerOrder || ['gemini', 'groq', 'openrouter'];
                return currentOrder.map((p, i) => (
                  <div key={p} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                    <span className="text-xs font-mono flex-1" style={{ color: 'var(--vf-text-primary)' }}>
                      {i + 1}. {p === 'gemini' ? 'Gemini Flash' : p === 'groq' ? 'Groq Llama 3.3' : 'OpenRouter'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const order = [...currentOrder];
                          if (i > 0) { [order[i - 1], order[i]] = [order[i], order[i - 1]]; setSettings({ providerOrder: order }); }
                        }}
                        disabled={i === 0}
                        className="px-1.5 py-0.5 rounded text-xs disabled:opacity-30"
                        style={{ color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
                      >▲</button>
                      <button
                        type="button"
                        onClick={() => {
                          const order = [...currentOrder];
                          if (i < order.length - 1) { [order[i], order[i + 1]] = [order[i + 1], order[i]]; setSettings({ providerOrder: order }); }
                        }}
                        disabled={i === currentOrder.length - 1}
                        className="px-1.5 py-0.5 rounded text-xs disabled:opacity-30"
                        style={{ color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
                      >▼</button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Image Engine */}
      <section>
        <h2 className="mb-4" style={{ color: 'var(--vf-text-primary)' }}>🎨 Image Engine</h2>
        <div className="space-y-4 p-4 rounded-xl" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
          <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
            Generate gambar langsung di app (dipakai Thumbnail Pack). Urutan fallback: Puter.js → Pollinations → Gemini Image.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.puterEnabled}
              onChange={e => setSettings({ puterEnabled: e.target.checked })}
              className="accent-indigo-500 w-4 h-4"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>Aktifkan Puter.js</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--vf-text-muted)' }}>
                Model User-Pays — panggilan pertama bisa memunculkan popup login/login wall. Gratis dengan batas wajar.
                Puter hanya dipakai kalau tidak ada input gambar (txt2img murni).
              </p>
            </div>
          </label>
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: 'var(--vf-text-primary)' }}>Model Gemini Image</label>
            <select
              value={settings.geminiImageModel}
              onChange={e => setSettings({ geminiImageModel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
            >
              {IMAGE_MODEL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {(IMAGE_MODEL_OPTIONS.map(o => o.value) as string[]).includes(settings.geminiImageModel) ? null : (
              <input
                type="text"
                value={settings.geminiImageModel}
                onChange={e => setSettings({ geminiImageModel: e.target.value })}
                className="w-full mt-2 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
                placeholder="ketik nama model..."
              />
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--vf-text-muted)' }}>
              Model image generation Gemini yang valid. Juga dipakai untuk image+text→image (support input gambar).
            </p>
          </div>
          <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: 'rgba(99,102,241,0.05)', color: 'var(--vf-text-secondary)' }}>
            <p><strong style={{ color: 'var(--vf-text-primary)' }}>Urutan Chain (read-only):</strong></p>
            <p>1. Puter.js — {settings.puterEnabled ? '✅ Aktif' : '⛔ Nonaktif'} — gratis, user-pays (popup login), tanpa input gambar</p>
            <p>2. Pollinations — ✅ Selalu tersedia — gratis, tanpa input gambar</p>
            <p>3. Gemini Image — {settings.geminiApiKey ? '✅ API key terisi' : '⛔ Tidak ada API key'} — butuh API key, support input gambar</p>
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
