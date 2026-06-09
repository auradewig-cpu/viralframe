import { ReactNode } from 'react';

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--vf-text-primary)' }}>{children}</label>;
}

export function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl p-5 space-y-5" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
      <h3 className="font-semibold" style={{ color: 'var(--vf-text-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

interface SelectOption { value: string; label: string; }

export function SelectField({ label, value, onChange, options, placeholder }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: SelectOption[]; placeholder?: string;
}) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
        style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function TextareaField({ value, onChange, placeholder, maxLength, rows = 5 }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; maxLength?: number; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
      style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
    />
  );
}

export function InputField({ label, value, onChange, placeholder, maxLength, type = 'text' }: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; maxLength?: number; type?: string;
}) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
      />
    </div>
  );
}

export function NumberInput({ label, value, onChange, min, max }: {
  label?: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
      />
    </div>
  );
}

export function TagsInput({ label, tags, onChange, placeholder }: {
  label?: string; tags: string[]; onChange: (tags: string[]) => void; placeholder?: string;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && e.currentTarget.value.trim()) {
      e.preventDefault();
      const val = e.currentTarget.value.trim().replace(/,/g, '');
      if (val && !tags.includes(val)) onChange([...tags, val]);
      e.currentTarget.value = '';
    }
  };

  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="rounded-lg p-2 flex flex-wrap gap-2" style={{ background: 'var(--vf-bg-secondary)', border: '1px solid var(--vf-border)', minHeight: '42px' }}>
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:opacity-70">×</button>
          </span>
        ))}
        <input
          type="text"
          onKeyDown={handleKey}
          placeholder={tags.length === 0 ? placeholder : 'Tambah...'}
          className="flex-1 min-w-20 bg-transparent outline-none text-sm"
          style={{ color: 'var(--vf-text-primary)' }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--vf-text-muted)' }}>Tekan Enter atau koma untuk menambah</p>
    </div>
  );
}
