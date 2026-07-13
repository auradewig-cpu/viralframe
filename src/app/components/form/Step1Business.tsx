import { useRef, useState } from 'react';
import { Upload, X, ImageOff, Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import { NICHES, TARGET_AUDIENCES, PLATFORMS, CONTENT_GOALS, GROWTH_ALLOWED_CTAS } from '../../lib/maps';
import { CONTENT_STYLES } from '../../lib/contentStyles';
import { ROOM_IDENTITIES } from '../../lib/roomIdentities';
import { getContentType, DEFAULT_CONTENT_TYPE_ID } from '../../lib/registry';
import { LocationRef } from '../../types';
import { FieldLabel, FormCard, SelectField, TextareaField, InputField } from './FormFields';
import { RoomIdentityCombobox, ComboboxOption } from './RoomIdentityCombobox';

const formSections = getContentType(DEFAULT_CONTENT_TYPE_ID).formSections;

// Batas total entry Referensi Visual yang dilacak sekaligus (locationRefs + characterRefFile) —
// properti butuh ±7 lokasi + 1 karakter, kasih ruang lebih dari cukup.
const MAX_REFS = 15;
const CHARACTER_IDENTITY = '__character__';
const IDENTITY_OPTIONS: ComboboxOption[] = [
  { value: CHARACTER_IDENTITY, label: '👤 Karakter' },
  ...ROOM_IDENTITIES.map(r => ({ value: r.value, label: r.label })),
];

export function Step1Business() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const referenceObjectUrls = useAppStore(s => s.referenceObjectUrls);
  const setReferenceObjectUrl = useAppStore(s => s.setReferenceObjectUrl);
  const removeReferenceObjectUrl = useAppStore(s => s.removeReferenceObjectUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [swapNotice, setSwapNotice] = useState<string | null>(null);

  const toggleAudience = (val: string) => {
    const curr = formData.targetAudience;
    setFormData({ targetAudience: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  const togglePlatform = (val: string) => {
    const curr = formData.platforms;
    setFormData({ platforms: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  // === Referensi Visual (Tugas 1 & 2 — redesain) ===
  // Upload di sini HANYA sumber nama file + preview sesi (object URL) — TIDAK pernah ditulis base64
  // ke referencePhotos/localStorage. Tiap file baru langsung jadi entry locationRefs.
  const trackedFileNames = () => new Set<string>([
    ...formData.locationRefs.map(r => r.file.trim()).filter(Boolean),
    ...(formData.characterRefFile.trim() ? [formData.characterRefFile.trim()] : []),
  ]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const existing = trackedFileNames();
    const usedScenes = new Set(formData.locationRefs.filter(r => r.sceneNumber !== null).map(r => r.sceneNumber as number));
    const newRefs: LocationRef[] = [];
    const urlEntries: [string, string][] = [];
    const dupNames: string[] = [];
    const typeRejected: string[] = [];
    const sizeRejected: string[] = [];
    let slotsLeft = MAX_REFS - existing.size;

    Array.from(files).forEach(file => {
      if (slotsLeft <= 0) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { typeRejected.push(file.name); return; }
      if (file.size > 5 * 1024 * 1024) { sizeRejected.push(file.name); return; }
      if (existing.has(file.name)) { dupNames.push(file.name); return; }

      // Auto-guess scene dari pola nama file, mis. "scene3_foto.jpg" → Scene 3.
      const match = /scene[\s_-]?(\d+)/i.exec(file.name);
      let sceneNumber: number | null = null;
      if (match) {
        const n = Number(match[1]);
        if (n >= 1 && n <= 20) sceneNumber = n;
      }
      if (sceneNumber === null) {
        for (let i = 1; i <= formData.sceneCount; i++) {
          if (!usedScenes.has(i)) { sceneNumber = i; break; }
        }
      }
      if (sceneNumber !== null) usedScenes.add(sceneNumber);

      newRefs.push({ file: file.name, identity: '', keterangan: '', sceneNumber });
      urlEntries.push([file.name, URL.createObjectURL(file)]);
      existing.add(file.name);
      slotsLeft--;
    });

    if (newRefs.length > 0) {
      setFormData({ locationRefs: [...formData.locationRefs, ...newRefs] });
      urlEntries.forEach(([f, u]) => setReferenceObjectUrl(f, u));
    }

    if (dupNames.length > 0) {
      setUploadNotice(`Nama file sudah dipakai referensi lain, dilewati: ${dupNames.join(', ')}`);
    } else if (sizeRejected.length > 0) {
      setUploadNotice(`Ukuran file melebihi 5MB, dilewati: ${sizeRejected.join(', ')}`);
    } else if (typeRejected.length > 0) {
      setUploadNotice(`Format tidak didukung (harus jpg/png/webp), dilewati: ${typeRejected.join(', ')}`);
    } else if (newRefs.length === 0 && slotsLeft <= 0) {
      setUploadNotice(`Sudah mencapai batas maksimal ${MAX_REFS} foto referensi.`);
    } else {
      setUploadNotice(null);
    }
  };

  const isDuplicateFile = (name: string, opts?: { skipIndex?: number }) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const dupInLocations = formData.locationRefs.some((r, i) => i !== opts?.skipIndex && r.file.trim() === trimmed);
    const dupInCharacter = formData.characterRefFile.trim() === trimmed;
    return dupInLocations || dupInCharacter;
  };

  // Auto-mapping: entry manual baru ditugaskan ke scene terkecil yang belum punya referensi.
  const addManualLocationRef = () => {
    const usedScenes = new Set(formData.locationRefs.filter(r => r.sceneNumber !== null).map(r => r.sceneNumber as number));
    let nextScene: number | null = null;
    for (let i = 1; i <= formData.sceneCount; i++) {
      if (!usedScenes.has(i)) { nextScene = i; break; }
    }
    setFormData({ locationRefs: [...formData.locationRefs, { file: '', identity: '', keterangan: '', sceneNumber: nextScene }] });
  };

  const updateLocationRef = (idx: number, patch: Partial<LocationRef>) => {
    if (patch.file !== undefined && isDuplicateFile(patch.file, { skipIndex: idx })) {
      setUploadNotice(`Nama file "${patch.file.trim()}" sudah dipakai referensi lain.`);
      return;
    }
    const updated = formData.locationRefs.map((r, i) => i === idx ? { ...r, ...patch } : r);
    setFormData({ locationRefs: updated });
  };

  const removeLocationRef = (idx: number) => {
    const ref = formData.locationRefs[idx];
    if (ref && referenceObjectUrls[ref.file]) removeReferenceObjectUrl(ref.file);
    setFormData({ locationRefs: formData.locationRefs.filter((_, i) => i !== idx) });
  };

  const removeCharacterRef = () => {
    if (formData.characterRefFile && referenceObjectUrls[formData.characterRefFile]) removeReferenceObjectUrl(formData.characterRefFile);
    setFormData({ characterRefFile: '' });
  };

  const notifySwap = (msg: string) => {
    setSwapNotice(msg);
    setTimeout(() => setSwapNotice(null), 5000);
  };

  // identity !== 'custom' → keterangan auto-terisi label preset (tetap editable). Pilih "👤 Karakter"
  // → pindahkan file ke characterRefFile; kalau sudah ada foto karakter lain, foto lama dikembalikan
  // jadi entry locationRefs biasa (HANYA SATU foto karakter yang aktif).
  const selectLocationIdentity = (idx: number, identityValue: string) => {
    if (identityValue === CHARACTER_IDENTITY) {
      const ref = formData.locationRefs[idx];
      if (!ref.file.trim()) return;
      const prevCharacter = formData.characterRefFile;
      let remaining = formData.locationRefs.filter((_, i) => i !== idx);
      if (prevCharacter && prevCharacter !== ref.file) {
        remaining = [...remaining, { file: prevCharacter, identity: '', keterangan: '', sceneNumber: null }];
        notifySwap(`Foto karakter sebelumnya ("${prevCharacter}") dikembalikan sebagai referensi lokasi/produk.`);
      }
      setFormData({ characterRefFile: ref.file, locationRefs: remaining });
      return;
    }
    const identity = ROOM_IDENTITIES.find(r => r.value === identityValue);
    updateLocationRef(idx, {
      identity: identityValue,
      keterangan: identityValue === 'custom' ? '' : (identity?.label || ''),
    });
  };

  // Un-mark kartu karakter kembali jadi referensi lokasi/produk biasa.
  const selectCharacterCardIdentity = (identityValue: string) => {
    if (identityValue === CHARACTER_IDENTITY) return;
    const identity = ROOM_IDENTITIES.find(r => r.value === identityValue);
    const file = formData.characterRefFile;
    setFormData({
      characterRefFile: '',
      locationRefs: [...formData.locationRefs, {
        file,
        identity: identityValue,
        keterangan: identityValue === 'custom' ? '' : (identity?.label || ''),
        sceneNumber: null,
      }],
    });
  };

  // Saran jumlah scene: kalau baris ber-scene-spesifik unik melebihi sceneCount saat ini.
  const uniqueRefScenes = new Set(formData.locationRefs.filter(r => r.sceneNumber !== null).map(r => r.sceneNumber as number));
  const suggestedSceneCount = uniqueRefScenes.size > formData.sceneCount ? uniqueRefScenes.size : null;

  // Foto terupload (punya object URL sesi) tapi belum diberi identitas/keterangan sama sekali.
  const unidentifiedCount = formData.locationRefs.filter(r => referenceObjectUrls[r.file] && !r.identity && !r.keterangan.trim()).length;

  const hasVisualRefs = formData.characterRefFile.trim() || formData.locationRefs.length > 0;

  return (
    <div className="space-y-6">
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

        {/* 🖼️ Referensi Visual — upload sumber nama file + grid identifikasi (redesain) */}
        <div>
          <FieldLabel>🖼️ Referensi Visual (Opsional)</FieldLabel>
          <p className="text-xs mb-2" style={{ color: 'var(--vf-text-muted)' }}>
            Foto TIDAK dikirim ke AI — upload di sini hanya untuk identifikasi otomatis nama file + mapping
            per scene. Lampirkan foto aslinya langsung di AI video tool (mis. Google Flow) dengan nama file
            yang sama persis. Maks {MAX_REFS} file, format jpg/png/webp, maks 5MB per file.
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
            <p className="text-xs mt-1" style={{ color: 'var(--vf-text-muted)' }}>{trackedFileNames().size}/{MAX_REFS} foto teridentifikasi</p>
          </div>
          {uploadNotice && (
            <p className="text-xs mt-2" style={{ color: 'var(--vf-accent-warning)' }}>⚠️ {uploadNotice}</p>
          )}
          {swapNotice && (
            <p className="text-xs mt-2" style={{ color: 'var(--vf-accent-primary)' }}>ℹ️ {swapNotice}</p>
          )}

          {hasVisualRefs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {formData.characterRefFile.trim() && (
                <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--vf-bg-secondary)', border: '1px solid var(--vf-accent-primary)' }}>
                  <div className="flex items-start gap-2">
                    {referenceObjectUrls[formData.characterRefFile] ? (
                      <img src={referenceObjectUrls[formData.characterRefFile]} alt={formData.characterRefFile} className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ border: '1px solid var(--vf-border)' }} />
                    ) : (
                      <div className="w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 gap-0.5" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                        <ImageOff size={16} style={{ color: 'var(--vf-text-muted)' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>👤 KARAKTER</span>
                      <p className="text-sm truncate" style={{ color: 'var(--vf-text-primary)' }} title={formData.characterRefFile}>{formData.characterRefFile}</p>
                      <RoomIdentityCombobox value={CHARACTER_IDENTITY} options={IDENTITY_OPTIONS} onSelect={selectCharacterCardIdentity} />
                      {!referenceObjectUrls[formData.characterRefFile] && (
                        <p className="text-[11px]" style={{ color: 'var(--vf-text-muted)' }}>Preview tidak tersimpan, mapping tetap aktif.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={removeCharacterRef}
                      className="p-2 rounded-lg shrink-0"
                      style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}
                      aria-label="Hapus referensi karakter"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {formData.locationRefs.map((ref, idx) => {
                const isInvalid = ref.sceneNumber !== null && ref.sceneNumber > formData.sceneCount;
                const objectUrl = referenceObjectUrls[ref.file];
                const isUploaded = !!objectUrl;
                return (
                  <div key={idx} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--vf-bg-secondary)', border: '1px solid var(--vf-border)' }}>
                    <div className="flex items-start gap-2">
                      {objectUrl ? (
                        <img src={objectUrl} alt={ref.file || 'referensi'} className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ border: '1px solid var(--vf-border)' }} />
                      ) : (
                        <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                          <ImageOff size={16} style={{ color: 'var(--vf-text-muted)' }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        {isUploaded ? (
                          <p className="text-sm truncate px-1" style={{ color: 'var(--vf-text-primary)' }} title={ref.file}>{ref.file}</p>
                        ) : (
                          <InputField
                            value={ref.file}
                            onChange={v => updateLocationRef(idx, { file: v })}
                            placeholder='Nama file, mis: "scene1_foto.jpg"'
                          />
                        )}
                        <RoomIdentityCombobox value={ref.identity} options={IDENTITY_OPTIONS} onSelect={v => selectLocationIdentity(idx, v)} />
                        <InputField
                          value={ref.keterangan}
                          onChange={v => updateLocationRef(idx, { keterangan: v })}
                          placeholder='Apa ini + ciri khasnya, mis: fasad — rumah 2 lantai putih, pagar hitam'
                        />
                        <select
                          value={ref.sceneNumber === null ? 'all' : String(ref.sceneNumber)}
                          onChange={e => updateLocationRef(idx, { sceneNumber: e.target.value === 'all' ? null : Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
                        >
                          <option value="all">Semua scene</option>
                          {Array.from({ length: formData.sceneCount }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>Scene {n}</option>
                          ))}
                        </select>
                        {!isUploaded && (
                          <p className="text-[11px]" style={{ color: 'var(--vf-text-muted)' }}>Preview tidak tersimpan, mapping tetap aktif.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLocationRef(idx)}
                        className="p-2 rounded-lg shrink-0"
                        style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-accent-danger)', border: '1px solid var(--vf-border)' }}
                        aria-label="Hapus referensi"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {isInvalid && (
                      <p className="text-xs" style={{ color: 'var(--vf-accent-danger)' }}>
                        ⚠️ Scene {ref.sceneNumber} tidak ada — jumlah scene sekarang {formData.sceneCount}. Baris ini akan diabaikan saat generate.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addManualLocationRef}
            className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-accent-primary)', border: '1px solid var(--vf-accent-primary)' }}
          >
            <Plus size={14} /> Tambah referensi manual (tanpa upload)
          </button>

          {suggestedSceneCount && (
            <div className="mt-3 p-3 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--vf-accent-primary)' }}>
              <span>💡 Kamu punya {suggestedSceneCount} foto lokasi — set jumlah scene jadi {suggestedSceneCount}?</span>
              <button
                type="button"
                onClick={() => setFormData({ sceneCount: Math.max(2, Math.min(20, suggestedSceneCount)), sceneDurations: [] })}
                className="px-2.5 py-1 rounded-md font-medium shrink-0"
                style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
              >
                Set ke {suggestedSceneCount}
              </button>
            </div>
          )}

          {unidentifiedCount > 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--vf-accent-warning)' }}>
              ⚠️ {unidentifiedCount} foto belum diidentifikasi — tidak akan dipakai efektif di prompt. Pilih identitasnya di grid di atas.
            </p>
          )}
        </div>

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
