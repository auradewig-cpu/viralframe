import { useState } from 'react';
import { Copy, Check, Download, RefreshCw, Edit } from 'lucide-react';
import { ValidationResult } from './types';

// UI generik dipakai lintas content type baru — versi content-type-agnostic dari
// tombol-tombol di DirectPanel.tsx (copy/download/regenerate/edit) dan alur paste&validate
// di ManualPanel.tsx, supaya youtube_long/thumbnail_pack/content_calendar tidak menulis ulang UI yang sama.

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
      style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

export function DownloadJSONButton({ data, filename }: { data: unknown; filename: string }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
      <Download size={14} /> ↓ Download JSON
    </button>
  );
}

export function OutputToolbar({ data, filename, onRegenerate, onEdit }: {
  data: unknown; filename: string; onRegenerate: () => void; onEdit: () => void;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--vf-accent-success)' }}>✅ Generate Selesai</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <DownloadJSONButton data={data} filename={filename} />
        <button onClick={onRegenerate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
          <RefreshCw size={14} /> 🔄 Regenerate
        </button>
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}>
          <Edit size={14} /> ✏️ Edit Parameter
        </button>
      </div>
    </div>
  );
}

interface GenericManualPanelProps<T> {
  masterPrompt: string;
  parseOutput: (text: string) => T | null;
  validate: (json: T) => ValidationResult;
  onValidated: (data: T) => void;
  renderPreview: (data: T) => React.ReactNode;
}

// Paste & Validate generik — pengganti ManualPanel.tsx (yang khusus VideoJSON/Scene Cards)
// untuk content type baru yang skema outputnya berbeda-beda.
export function GenericManualPanel<T>({ masterPrompt, parseOutput, validate, onValidated, renderPreview }: GenericManualPanelProps<T>) {
  const [tab, setTab] = useState<'prompt' | 'validate'>('prompt');
  const [pastedJson, setPastedJson] = useState('');
  const [result, setResult] = useState<{ valid: boolean; errors: string[]; warnings: string[]; data: T | null } | null>(null);

  const tokenEstimate = Math.round(masterPrompt.length / 4);

  const handleValidate = () => {
    const json = parseOutput(pastedJson);
    if (!json) {
      setResult({ valid: false, errors: ['JSON tidak valid atau tidak dapat di-parse. Pastikan output AI dimulai dengan { dan diakhiri dengan }.'], warnings: [], data: null });
      return;
    }
    const validation = validate(json);
    setResult({ ...validation, data: validation.valid ? json : null });
    if (validation.valid) onValidated(json);
  };

  return (
    <div className="space-y-0">
      <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid var(--vf-border)' }}>
        {[{ id: 'prompt', label: '📋 Master Prompt' }, { id: 'validate', label: '✅ Paste & Validate' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'prompt' | 'validate')}
            className="px-4 py-3 text-sm whitespace-nowrap transition-colors"
            style={{
              color: tab === t.id ? 'var(--vf-accent-primary)' : 'var(--vf-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--vf-accent-primary)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === 'prompt' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <CopyButton text={masterPrompt} label="⎘ Copy Master Prompt" />
              <span className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>~{tokenEstimate.toLocaleString()} token</span>
            </div>
            <p className="text-xs p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)' }}>
              💡 Paste ke ChatGPT, Claude, atau Gemini. AI akan menghasilkan JSON. Kemudian paste hasilnya di tab "Paste & Validate".
            </p>
            <textarea
              readOnly
              value={masterPrompt}
              rows={20}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none font-mono"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)', fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
        )}

        {tab === 'validate' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>Paste hasil JSON dari AI di sini:</p>
            <textarea
              value={pastedJson}
              onChange={e => setPastedJson(e.target.value)}
              rows={8}
              placeholder={`{\n  ...\n}`}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none font-mono"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)', fontFamily: "'JetBrains Mono', monospace" }}
            />
            <button
              onClick={handleValidate}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
              disabled={!pastedJson.trim()}
            >
              ✓ Validasi JSON
            </button>

            {result && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: result.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  <span className="text-sm font-medium" style={{ color: result.valid ? 'var(--vf-accent-success)' : 'var(--vf-accent-danger)' }}>
                    {result.valid ? '✅ JSON Valid!' : '❌ JSON Tidak Valid'}
                  </span>
                </div>
                {result.errors.map((e, i) => (
                  <div key={i} className="p-2 rounded text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)' }}>{e}</div>
                ))}
                {result.warnings.map((w, i) => (
                  <div key={i} className="p-2 rounded text-sm" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)' }}>{w}</div>
                ))}
              </div>
            )}

            {result?.valid && result.data && (
              <div className="mt-4">{renderPreview(result.data)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
