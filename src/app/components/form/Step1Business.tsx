import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { NICHES, TARGET_AUDIENCES, PLATFORMS } from '../../lib/maps';
import { FieldLabel, FormCard, SelectField, TextareaField, InputField } from './FormFields';

export function Step1Business() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const toggleAudience = (val: string) => {
    const curr = formData.targetAudience;
    setFormData({ targetAudience: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  const togglePlatform = (val: string) => {
    const curr = formData.platforms;
    setFormData({ platforms: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const current = [...formData.referencePhotos];
    const remaining = 5 - current.length;
    const validFiles: string[] = [];
    const total = Math.min(files.length, remaining);
    let processed = 0;
    const checkDone = () => {
      if (processed === total) {
        setFormData({ referencePhotos: [...current, ...validFiles] });
      }
    };
    for (let i = 0; i < total; i++) {
      const file = files[i];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        processed++;
        checkDone();
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        processed++;
        checkDone();
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) validFiles.push(dataUrl);
        processed++;
        checkDone();
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (idx: number) => {
    const updated = formData.referencePhotos.filter((_, i) => i !== idx);
    setFormData({ referencePhotos: updated });
  };

  return (
    <div className="space-y-6">
      <FormCard title="🏢 Konteks Bisnis">
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

        {/* 📸 Upload Foto */}
        <div>
          <FieldLabel>📸 Upload Foto Properti / Produk (Opsional)</FieldLabel>
          <p className="text-xs mb-2" style={{ color: 'var(--vf-text-muted)' }}>
            Foto ini akan dijadikan referensi visual di setiap prompt scene. AI video tool akan menggunakan foto ini sebagai acuan tampilan. Maks 5 file, format jpg/png/webp, maks 5MB per file.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className="flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all"
            style={{
              background: dragOver ? 'rgba(99,102,241,0.15)' : 'var(--vf-bg-elevated)',
              border: `2px dashed ${dragOver ? 'var(--vf-accent-primary)' : 'var(--vf-border)'}`,
            }}
          >
            <Upload size={24} style={{ color: 'var(--vf-text-muted)' }} />
            <p className="text-sm mt-2" style={{ color: 'var(--vf-text-secondary)' }}>Klik atau drag & drop foto di sini</p>
            <p className="text-xs mt-1" style={{ color: 'var(--vf-text-muted)' }}>{formData.referencePhotos.length}/5 foto</p>
          </div>
          {formData.referencePhotos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.referencePhotos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img src={photo} alt={`Foto ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover" style={{ border: '2px solid var(--vf-border)' }} />
                  <button onClick={() => removePhoto(idx)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--vf-accent-danger)', color: 'white' }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 📍 Deskripsi Lokasi */}
        <InputField
          label="📍 Deskripsi Lokasi / Properti (Opsional, untuk niche properti & F&B)"
          value={formData.locationDescription}
          onChange={v => setFormData({ locationDescription: v })}
          placeholder='Contoh: Ruko 2 lantai, fasad merah-putih, lokasi Jl. Garuda Solo, area parkir depan, crane konstruksi terlihat di belakang'
          maxLength={200}
        />
      </FormCard>

      <FormCard title="🎯 Target & Distribusi">
        <div>
          <FieldLabel>Target Audiens</FieldLabel>
          <div className="flex flex-wrap gap-2 mt-2">
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
    </div>
  );
}
