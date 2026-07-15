import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
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
