import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store';
import {
  HOOK_TYPES, CTA_TYPES, ETHNICITIES, CHARACTER_STYLES,
  EXPRESSIONS, VISUAL_STYLES, BACKSOUNDS, NARRATIVE_TONES, CAPTION_VARIATION_OPTIONS
} from '../../lib/maps';
import { FieldLabel, FormCard, SelectField, InputField, TagsInput } from './FormFields';

export function Step3Creative() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const consistencyScore = () => {
    if (!formData.useCharacter) return null;
    let score = 0;
    const fields = [
      formData.characterGender,
      formData.characterAge > 0 ? 'ok' : '',
      formData.characterEthnicity,
      formData.characterStyle,
      formData.characterTraits,
      formData.expression !== 'auto' ? 'ok' : '',
    ];
    fields.forEach(f => { if (f) score += 16.67; });
    return Math.min(100, Math.round(score));
  };

  const score = consistencyScore();

  return (
    <div className="space-y-6">
      <FormCard title="🎣 Hook & CTA">
        <SelectField
          label="Tipe Hook (Scene 1)"
          value={formData.hookType}
          onChange={v => setFormData({ hookType: v })}
          options={HOOK_TYPES}
        />
        <SelectField
          label="Call to Action (Scene Terakhir)"
          value={formData.ctaType}
          onChange={v => setFormData({ ctaType: v })}
          options={CTA_TYPES}
        />
        {formData.ctaType === 'comment_keyword' && (
          <InputField
            label="Keyword untuk CTA *"
            value={formData.ctaKeyword}
            onChange={v => setFormData({ ctaKeyword: v })}
            placeholder="Contoh: INFO"
          />
        )}
        <SelectField
          label="Variasi Captions & Hashtag"
          value={String(formData.captionVariationCount)}
          onChange={v => setFormData({ captionVariationCount: Number(v) })}
          options={CAPTION_VARIATION_OPTIONS}
        />
      </FormCard>

      <FormCard title="🧍 Karakter dalam Video">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!formData.useCharacter}
              onChange={() => setFormData({ useCharacter: false })}
              className="accent-indigo-500"
            />
            <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>Tanpa Karakter</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={formData.useCharacter}
              onChange={() => setFormData({ useCharacter: true })}
              className="accent-indigo-500"
            />
            <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>Gunakan Karakter</span>
          </label>
        </div>

        {!formData.useCharacter ? (
          <InputField
            label="Visual Anchor (opsional)"
            value={formData.visualAnchor}
            onChange={v => setFormData({ visualAnchor: v })}
            placeholder='Contoh: "tangan model dengan nail art merah", "produk selalu pojok kanan bawah"'
          />
        ) : (
          <div className="space-y-4">
            <div>
              <FieldLabel>Jenis Kelamin</FieldLabel>
              <div className="flex gap-3 mt-1">
                {['male', 'female', 'duo'].map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={formData.characterGender === g} onChange={() => setFormData({ characterGender: g })} className="accent-indigo-500" />
                    <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>
                      {g === 'male' ? 'Pria' : g === 'female' ? 'Wanita' : 'Duo (Pria + Wanita)'}
                    </span>
                  </label>
                ))}
              </div>
              {formData.characterGender === 'duo' && (
                <p className="text-xs mt-2 p-2 rounded" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
                  💡 Untuk Duo, ciri fisik bisa diisi dua deskripsi dipisah koma: "pria rambut pendek, wanita hijab hitam"
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Usia Karakter *</FieldLabel>
                <input
                  type="number"
                  value={formData.characterAge}
                  onChange={e => setFormData({ characterAge: Math.max(18, Math.min(65, Number(e.target.value))) })}
                  min={18} max={65}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
                />
              </div>
              <div>
                <FieldLabel>Ras / Etnik</FieldLabel>
                <select
                  value={formData.characterEthnicity}
                  onChange={e => setFormData({ characterEthnicity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
                >
                  {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <SelectField
              label="Style Penampilan"
              value={formData.characterStyle}
              onChange={v => setFormData({ characterStyle: v })}
              options={CHARACTER_STYLES.map(s => ({ value: s, label: s }))}
            />

            <InputField
              label="Ciri Fisik Khusus (opsional)"
              value={formData.characterTraits}
              onChange={v => setFormData({ characterTraits: v })}
              placeholder='"rambut pendek hitam", "berkacamata"'
            />
            {formData.useCharacter && !formData.characterTraits && (
              <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)', border: '1px solid var(--vf-accent-warning)' }}>
                ⚠️ Rekomendasi: Isi ciri fisik khusus (warna rambut, pakaian spesifik) agar karakter konsisten di semua scene Veo3.
              </div>
            )}

            <SelectField
              label="Ekspresi & Emosi Karakter"
              value={formData.expression}
              onChange={v => setFormData({ expression: v })}
              options={EXPRESSIONS}
            />

            {score !== null && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>🧍 Konsistensi Karakter</span>
                  <span className="text-sm font-bold" style={{ color: score >= 80 ? 'var(--vf-accent-success)' : 'var(--vf-accent-warning)' }}>{score}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--vf-border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: score >= 80 ? 'var(--vf-accent-success)' : 'var(--vf-accent-warning)' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </FormCard>

      <FormCard title="🎨 Gaya Visual & Audio">
        <SelectField
          label="Gaya Visual / Sinematografi"
          value={formData.visualStyle}
          onChange={v => setFormData({ visualStyle: v })}
          options={VISUAL_STYLES}
        />
        <SelectField
          label="Backsound / Musik"
          value={formData.backsound}
          onChange={v => setFormData({ backsound: v })}
          options={BACKSOUNDS}
        />
        <SelectField
          label="Tone Narasi / Gaya Bahasa"
          value={formData.narrativeTone}
          onChange={v => setFormData({ narrativeTone: v })}
          options={NARRATIVE_TONES}
        />
      </FormCard>

      {/* Advanced Settings */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--vf-border)' }}>
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between px-5 py-4"
          style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)' }}
        >
          <span className="font-semibold text-sm">⚙️ Advanced Settings (Opsional)</span>
          {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {advancedOpen && (
          <div className="p-5 space-y-5" style={{ background: 'var(--vf-bg-elevated)' }}>
            <TagsInput
              label="Kata Kunci Wajib Muncul"
              tags={formData.requiredKeywords}
              onChange={v => setFormData({ requiredKeywords: v })}
              placeholder="Ketik kata kunci + Enter"
            />
            <TagsInput
              label="Kata yang Harus Dihindari"
              tags={formData.blacklistWords}
              onChange={v => setFormData({ blacklistWords: v })}
              placeholder="Ketik kata + Enter"
            />
            <InputField
              label="Reference Style"
              value={formData.referenceStyle}
              onChange={v => setFormData({ referenceStyle: v })}
              placeholder='Contoh: "Gaya visual Starbucks Indonesia 2024"'
            />
            <div>
              <FieldLabel>Subtitle Style</FieldLabel>
              <select
                value={formData.subtitleStyle}
                onChange={e => setFormData({ subtitleStyle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
              >
                {['None', 'Bold Caption', 'Minimal', 'Karaoke Style'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.textOverlay}
                onChange={e => setFormData({ textOverlay: e.target.checked })}
                className="accent-indigo-500 w-4 h-4"
              />
              <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>Sertakan saran text overlay per scene</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Brand Color (hex)</FieldLabel>
                <div className="flex gap-2 items-center">
                  <input type="color" value={formData.brandColor || '#6366F1'} onChange={e => setFormData({ brandColor: e.target.value })} className="w-10 h-9 rounded cursor-pointer" style={{ border: '1px solid var(--vf-border)' }} />
                  <input type="text" value={formData.brandColor} onChange={e => setFormData({ brandColor: e.target.value })} placeholder="#6366F1" className="flex-1 px-2 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }} />
                </div>
              </div>
              <div>
                <FieldLabel>Warna Dihindari (hex)</FieldLabel>
                <div className="flex gap-2 items-center">
                  <input type="color" value={formData.avoidColor || '#FF0000'} onChange={e => setFormData({ avoidColor: e.target.value })} className="w-10 h-9 rounded cursor-pointer" style={{ border: '1px solid var(--vf-border)' }} />
                  <input type="text" value={formData.avoidColor} onChange={e => setFormData({ avoidColor: e.target.value })} placeholder="#FF0000" className="flex-1 px-2 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
