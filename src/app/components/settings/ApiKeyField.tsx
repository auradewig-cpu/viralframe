import { useState } from 'react';
import { Eye, EyeOff, Check, X, Loader2, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { AI_TOOLS, PLATFORMS, LANGUAGES } from '../../lib/maps';

export const WPM_OPTIONS = [
  { value: 120, label: '120 WPM — Santai (formal, tenang)' },
  { value: 140, label: '140 WPM — Normal (natural, jelas)' },
  { value: 165, label: '165 WPM — Cepat & Jelas (Direkomendasikan, gaya konten kreator)' },
  { value: 185, label: '185 WPM — Lebih Cepat' },
  { value: 200, label: '200 WPM — Sangat Cepat (berisiko kurang jelas)' },
];

export const GEMINI_MODELS = [
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — Paling pintar (Direkomendasikan)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite — Lebih cepat & hemat' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite — Paling hemat (model lama, masih valid)' },
];

export const IMAGE_MODEL_OPTIONS = [
  { value: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image — Default' },
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  { value: 'gemini-3.1-flash-lite-image', label: 'Gemini 3.1 Flash-Lite Image' },
  { value: 'gemini-3-pro-image', label: 'Gemini 3 Pro Image' },
  { value: '__manual__', label: '✏️ Ketik manual...' },
] as const;

function maskKey(key: string): string {
  if (!key || key.length < 10) return key;
  return key.slice(0, 7) + '•'.repeat(key.length - 12) + key.slice(-5);
}

export function ApiKeyField({
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
