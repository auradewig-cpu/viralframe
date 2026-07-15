import { useState } from 'react';
import { useAppStore } from '../../store';
import { NICHES, TARGET_AUDIENCES, PLATFORMS, CONTENT_GOALS, GROWTH_ALLOWED_CTAS } from '../../lib/maps';
import { CONTENT_STYLES } from '../../lib/contentStyles';
import { getContentType, DEFAULT_CONTENT_TYPE_ID } from '../../lib/registry';
import { FieldLabel, FormCard, SelectField, TextareaField, InputField } from './FormFields';
import { VisualReferenceSection } from './VisualReferenceSection';

const formSections = getContentType(DEFAULT_CONTENT_TYPE_ID).formSections;

export function Step1Business() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);

  const toggleAudience = (val: string) => {
    const curr = formData.targetAudience;
    setFormData({ targetAudience: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  const togglePlatform = (val: string) => {
    const curr = formData.platforms;
    setFormData({ platforms: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  const clearPipeline = () => setFormData({ pipelineBrief: '', pipelineSource: '' });
  const [briefOpen, setBriefOpen] = useState(false);

  return (
    <div className="space-y-6">
      {formData.pipelineBrief && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--vf-accent-primary)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: 'var(--vf-accent-primary)' }}>📋 Brief dari pipeline aktif</p>
              {formData.pipelineSource && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--vf-text-muted)' }}>Sumber: {formData.pipelineSource}</p>
              )}
              <button
                type="button"
                onClick={() => setBriefOpen(!briefOpen)}
                className="text-xs mt-1"
                style={{ color: 'var(--vf-accent-primary)' }}
              >
                {briefOpen ? '▲ Sembunyikan brief' : '▼ Lihat brief'}
              </button>
              {briefOpen && (
                <pre className="text-xs mt-2 p-2 rounded whitespace-pre-wrap font-sans" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
                  {formData.pipelineBrief}
                </pre>
              )}
            </div>
            <button
              type="button"
              onClick={clearPipeline}
              className="p-1.5 rounded-lg shrink-0"
              style={{ color: 'var(--vf-accent-danger)' }}
              title="Hapus brief pipeline"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {formSections.includes('business_context') && (
      <FormCard title="🏢 Konteks Bisnis">
        <div>
          <FieldLabel>Tujuan Konten *</FieldLabel>
          <div className="flex flex-col gap-2 mt-1">
            {CONTENT_GOALS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.contentGoal === value}
                  onChange={() => {
                    const updates: Partial<typeof formData> = { contentGoal: value as typeof formData.contentGoal };
                    if (value === 'growth' && !GROWTH_ALLOWED_CTAS.includes(formData.ctaType)) {
                      updates.ctaType = 'follow_more';
                    }
                    setFormData(updates);
                  }}
                  className="accent-indigo-500"
                />
                <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{label}</span>
              </label>
            ))}
          </div>
          {formData.contentGoal === 'growth' && (
            <p className="text-xs mt-2 p-2 rounded" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
              🌱 Mode Growth: NOL bahasa jualan (beli, checkout, promo, diskon). Konten murni value-first (edukasi/rekomendasi jujur), CTA hanya seputar follow/save/share.
            </p>
          )}
        </div>

        <SelectField
          label="Gaya Konten *"
          value={formData.contentStyle}
          onChange={v => setFormData({ contentStyle: v })}
          options={CONTENT_STYLES.map(cs => ({ value: cs.value, label: cs.label }))}
          placeholder="Pilih gaya/struktur konten"
        />
        {CONTENT_STYLES.find(cs => cs.value === formData.contentStyle) && (
          <p className="text-xs -mt-2" style={{ color: 'var(--vf-text-muted)' }}>
            {CONTENT_STYLES.find(cs => cs.value === formData.contentStyle)?.description}
          </p>
        )}
        <SelectField
          label="Jenis Bisnis / Niche *"
          value={formData.niche}
          onChange={v => setFormData({ niche: v })}
          options={NICHES}
          placeholder="Pilih niche bisnis kamu"
        />

        <div>
          <FieldLabel>Deskripsi Produk / Layanan *</FieldLabel>
          <TextareaField
            value={formData.productDescription}
            onChange={v => setFormData({ productDescription: v })}
            placeholder={`Contoh: Sepatu lari wanita anti-slip "RunFast Pro", harga Rp299.000, cocok untuk gym dan outdoor. Sudah terjual 10.000+ pasang.\nKeunggulan: sol anti-licin, material breathable, tersedia 8 warna.\nTarget pain point: kaki pegal dan mudah terpeleset saat olahraga.`}
            maxLength={500}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>Minimum 30 karakter. Lebih detail → narasi lebih spesifik.</span>
            <span className="text-xs" style={{ color: formData.productDescription.length > 450 ? 'var(--vf-accent-warning)' : 'var(--vf-text-muted)' }}>
              {formData.productDescription.length}/500
            </span>
          </div>
        </div>

        <InputField
          label="Unique Selling Point (USP) *"
          value={formData.usp}
          onChange={v => setFormData({ usp: v })}
          placeholder="Contoh: Satu-satunya sepatu lari lokal bersertifikat anti-licin SNI"
          maxLength={150}
        />

        <VisualReferenceSection />

        {/* 📍 Deskripsi Lokasi (fallback global, tetap ada — dipakai jika tidak pakai Referensi Visual) */}
        <InputField
          label="📍 Deskripsi Lokasi / Properti (Opsional, untuk niche properti & F&B)"
          value={formData.locationDescription}
          onChange={v => setFormData({ locationDescription: v })}
          placeholder='Contoh: Ruko 2 lantai, fasad merah-putih, lokasi Jl. Garuda Solo, area parkir depan, crane konstruksi terlihat di belakang'
          maxLength={200}
        />
      </FormCard>
      )}

      {formSections.includes('target_distribution') && (
      <FormCard title="🎯 Target & Distribusi">
        <div>
          <FieldLabel>Target Audiens</FieldLabel>
          <div className="flex items-center gap-2 mt-2 mb-2">
            <button
              type="button"
              onClick={() => {
                const allSelected = TARGET_AUDIENCES.every(a => formData.targetAudience.includes(a.value));
                setFormData({ targetAudience: allSelected ? [] : TARGET_AUDIENCES.map(a => a.value) });
              }}
              className="text-xs px-2.5 py-1 rounded transition-all"
              style={{
                background: TARGET_AUDIENCES.every(a => formData.targetAudience.includes(a.value)) ? 'var(--vf-accent-primary)' : 'var(--vf-bg-elevated)',
                color: TARGET_AUDIENCES.every(a => formData.targetAudience.includes(a.value)) ? 'white' : 'var(--vf-text-secondary)',
                border: '1px solid var(--vf-border)',
              }}
            >
              {TARGET_AUDIENCES.every(a => formData.targetAudience.includes(a.value)) ? '☑ Pilih Semua' : '☐ Pilih Semua'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TARGET_AUDIENCES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleAudience(value)}
                className="px-3 py-1.5 rounded-full text-sm transition-all"
                style={{
                  background: formData.targetAudience.includes(value) ? 'var(--vf-accent-primary)' : 'var(--vf-bg-elevated)',
                  color: formData.targetAudience.includes(value) ? 'white' : 'var(--vf-text-secondary)',
                  border: `1px solid ${formData.targetAudience.includes(value) ? 'var(--vf-accent-primary)' : 'var(--vf-border)'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Platform Distribusi Video *</FieldLabel>
          <p className="text-xs mb-2" style={{ color: 'var(--vf-text-muted)' }}>Platform pertama yang dipilih = platform PRIMER</p>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                const allSelected = PLATFORMS.every(p => formData.platforms.includes(p.value));
                setFormData({ platforms: allSelected ? [] : PLATFORMS.map(p => p.value) });
              }}
              className="text-xs px-2.5 py-1 rounded transition-all"
              style={{
                background: PLATFORMS.every(p => formData.platforms.includes(p.value)) ? 'var(--vf-accent-primary)' : 'var(--vf-bg-elevated)',
                color: PLATFORMS.every(p => formData.platforms.includes(p.value)) ? 'white' : 'var(--vf-text-secondary)',
                border: '1px solid var(--vf-border)',
              }}
            >
              {PLATFORMS.every(p => formData.platforms.includes(p.value)) ? '☑ Pilih Semua' : '☐ Pilih Semua'}
            </button>
          </div>
          <div className="space-y-2">
            {PLATFORMS.map(({ value, label, ratio, duration }) => {
              const checked = formData.platforms.includes(value);
              const isPrimer = formData.platforms[0] === value && checked;
              return (
                <label
                  key={value}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: checked ? 'rgba(99,102,241,0.1)' : 'var(--vf-bg-elevated)',
                    border: `1px solid ${checked ? 'var(--vf-accent-primary)' : 'var(--vf-border)'}`,
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => togglePlatform(value)} className="accent-indigo-500 w-4 h-4" />
                  <span className="flex-1" style={{ color: 'var(--vf-text-primary)' }}>{label}</span>
                  {isPrimer && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>PRIMER</span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>{ratio} · {duration}</span>
                </label>
              );
            })}
          </div>
        </div>
      </FormCard>
      )}
    </div>
  );
}
