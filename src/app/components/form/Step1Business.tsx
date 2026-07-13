import { useRef, useState } from 'react';
import { Upload, X, ImageOff, Plus, Download, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { useAppStore } from '../../store';
import { NICHES, TARGET_AUDIENCES, PLATFORMS, CONTENT_GOALS, GROWTH_ALLOWED_CTAS } from '../../lib/maps';
import { CONTENT_STYLES } from '../../lib/contentStyles';
import { ROOM_IDENTITIES } from '../../lib/roomIdentities';
import { getContentType, DEFAULT_CONTENT_TYPE_ID } from '../../lib/registry';
import { LocationRef } from '../../types';
import { buildCanonicalName, inferExtension, resolveUniqueCanonicalName, CanonicalNameInput } from '../../lib/canonicalRefNames';
import { getReferenceEntries, addReferenceSectionToZip } from '../../lib/referenceZip';
import { putImage, deleteImage } from '../../lib/refImageDB';
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
  const referenceFiles = useAppStore(s => s.referenceFiles);
  const setReferenceFile = useAppStore(s => s.setReferenceFile);
  const removeReferenceFile = useAppStore(s => s.removeReferenceFile);
  const referenceHydrating = useAppStore(s => s.referenceHydrating);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [swapNotice, setSwapNotice] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const toggleAudience = (val: string) => {
    const curr = formData.targetAudience;
    setFormData({ targetAudience: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  const togglePlatform = (val: string) => {
    const curr = formData.platforms;
    setFormData({ platforms: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] });
  };

  // === Referensi Visual — upload = sumber sourceName + blob sesi (non-persist). Prompt/ZIP HANYA
  // pakai ref.file (nama kanonik), sourceName cuma kunci permanen ke referenceFiles. ===
  const getUrl = (sourceName?: string) => (sourceName ? referenceFiles[sourceName]?.url : undefined);
  const getBlob = (sourceName?: string) => (sourceName ? referenceFiles[sourceName]?.blob : undefined);

  const trackedFileNames = () => new Set<string>([
    ...formData.locationRefs.map(r => r.file.trim()).filter(Boolean),
    ...(formData.characterRefFile.trim() ? [formData.characterRefFile.trim()] : []),
  ]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const existing = trackedFileNames();
    const usedScenes = new Set(formData.locationRefs.filter(r => r.sceneNumber !== null).map(r => r.sceneNumber as number));
    const newRefs: LocationRef[] = [];
    const fileEntries: File[] = [];
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

      // Belum diidentifikasi → ref.file TETAP nama asli sampai user pilih identitas (Tugas 2).
      newRefs.push({ file: file.name, identity: '', keterangan: '', sceneNumber, sourceName: file.name });
      fileEntries.push(file);
      existing.add(file.name);
      slotsLeft--;
    });

    if (newRefs.length > 0) {
      setFormData({ locationRefs: [...formData.locationRefs, ...newRefs] });
      fileEntries.forEach(f => {
        setReferenceFile(f.name, URL.createObjectURL(f), f);
        putImage(f.name, f); // fire-and-forget — persistensi IndexedDB, tidak menahan render
      });
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

  // Nama entry lain yang sudah "dipakai" — dasar anti-tabrakan rename kanonik (Tugas 2/5).
  const otherFileNames = (excludeIndex: number | 'character'): Set<string> => {
    const names = new Set<string>();
    formData.locationRefs.forEach((r, i) => {
      if (excludeIndex !== 'character' && i === excludeIndex) return;
      if (r.file.trim()) names.add(r.file.trim());
    });
    if (excludeIndex !== 'character' && formData.characterRefFile.trim()) names.add(formData.characterRefFile.trim());
    return names;
  };

  // Recompute nama kanonik untuk entry lokasi ber-sourceName (upload) — entry manual (tanpa
  // sourceName) TIDAK PERNAH di-rename, fungsi ini return null untuk itu (biarkan file apa adanya).
  const recomputeLocationCanonical = (idx: number, overrides: Partial<Pick<LocationRef, 'identity' | 'keterangan' | 'sceneNumber'>>): string | null => {
    const ref = formData.locationRefs[idx];
    if (!ref.sourceName) return null;
    const merged: CanonicalNameInput = {
      kind: 'location',
      identity: overrides.identity ?? ref.identity,
      keterangan: overrides.keterangan ?? ref.keterangan,
      sceneNumber: overrides.sceneNumber !== undefined ? overrides.sceneNumber : ref.sceneNumber,
    };
    const ext = inferExtension(ref.sourceName, getBlob(ref.sourceName));
    const desired = buildCanonicalName(merged, ext);
    return resolveUniqueCanonicalName(desired, otherFileNames(idx));
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

  // Identitas & scene WAJIB lewat sini (bukan updateLocationRef) — memicu rename kanonik otomatis
  // untuk entry ber-sourceName, sudah collision-free jadi tidak pernah kena tolak isDuplicateFile.
  const applyLocationChange = (idx: number, changes: Partial<Pick<LocationRef, 'identity' | 'keterangan' | 'sceneNumber'>>) => {
    const canonical = recomputeLocationCanonical(idx, changes);
    const patch: Partial<LocationRef> = { ...changes };
    if (canonical) patch.file = canonical;
    const updated = formData.locationRefs.map((r, i) => i === idx ? { ...r, ...patch } : r);
    setFormData({ locationRefs: updated });
  };

  const removeLocationRef = (idx: number) => {
    const ref = formData.locationRefs[idx];
    if (ref?.sourceName) {
      if (referenceFiles[ref.sourceName]) removeReferenceFile(ref.sourceName);
      deleteImage(ref.sourceName); // fire-and-forget — hapus juga salinan IndexedDB
    }
    setFormData({ locationRefs: formData.locationRefs.filter((_, i) => i !== idx) });
  };

  const removeCharacterRef = () => {
    if (formData.characterRefSourceName) {
      if (referenceFiles[formData.characterRefSourceName]) removeReferenceFile(formData.characterRefSourceName);
      deleteImage(formData.characterRefSourceName);
    }
    setFormData({ characterRefFile: '', characterRefSourceName: '' });
  };

  const notifySwap = (msg: string) => {
    setSwapNotice(msg);
    setTimeout(() => setSwapNotice(null), 5000);
  };

  // identity !== 'custom' → keterangan auto-terisi label preset (tetap editable). Pilih "👤 Karakter"
  // → pindahkan file ke characterRefFile (di-rename kanonik "karakter.<ext>" kalau ber-sourceName);
  // kalau sudah ada foto karakter lain, foto lama dikembalikan jadi entry locationRefs biasa.
  const selectLocationIdentity = (idx: number, identityValue: string) => {
    if (identityValue === CHARACTER_IDENTITY) {
      const ref = formData.locationRefs[idx];
      if (!ref.file.trim()) return;
      const prevCharacterFile = formData.characterRefFile;
      const prevCharacterSource = formData.characterRefSourceName;
      let remaining = formData.locationRefs.filter((_, i) => i !== idx);
      if (prevCharacterFile && prevCharacterFile !== ref.file) {
        remaining = [...remaining, {
          file: prevCharacterFile, identity: '', keterangan: '', sceneNumber: null,
          sourceName: prevCharacterSource || undefined,
        }];
        notifySwap(`Foto karakter sebelumnya ("${prevCharacterFile}") dikembalikan sebagai referensi lokasi/produk.`);
      }
      let newCharacterFile = ref.file;
      if (ref.sourceName) {
        const ext = inferExtension(ref.sourceName, getBlob(ref.sourceName));
        const desired = buildCanonicalName({ kind: 'character' }, ext);
        const taken = new Set(remaining.map(r => r.file.trim()).filter(Boolean));
        newCharacterFile = resolveUniqueCanonicalName(desired, taken);
      }
      setFormData({ characterRefFile: newCharacterFile, characterRefSourceName: ref.sourceName || '', locationRefs: remaining });
      return;
    }
    const identity = ROOM_IDENTITIES.find(r => r.value === identityValue);
    applyLocationChange(idx, {
      identity: identityValue,
      keterangan: identityValue === 'custom' ? '' : (identity?.label || ''),
    });
  };

  // Un-mark kartu karakter kembali jadi referensi lokasi/produk biasa.
  const selectCharacterCardIdentity = (identityValue: string) => {
    if (identityValue === CHARACTER_IDENTITY) return;
    const identity = ROOM_IDENTITIES.find(r => r.value === identityValue);
    const keterangan = identityValue === 'custom' ? '' : (identity?.label || '');
    const file = formData.characterRefFile;
    const sourceName = formData.characterRefSourceName;
    let newFile = file;
    if (sourceName) {
      const ext = inferExtension(sourceName, getBlob(sourceName));
      const desired = buildCanonicalName({ kind: 'location', identity: identityValue, keterangan, sceneNumber: null }, ext);
      const taken = new Set(formData.locationRefs.map(r => r.file.trim()).filter(Boolean));
      newFile = resolveUniqueCanonicalName(desired, taken);
    }
    setFormData({
      characterRefFile: '',
      characterRefSourceName: '',
      locationRefs: [...formData.locationRefs, {
        file: newFile, identity: identityValue, keterangan, sceneNumber: null,
        sourceName: sourceName || undefined,
      }],
    });
  };

  // Scene tertinggi yang ditugaskan di antara SEMUA entry — dasar banner & tombol "Set jumlah scene".
  const assignedSceneNumbers = formData.locationRefs.filter(r => r.sceneNumber !== null).map(r => r.sceneNumber as number);
  const maxAssignedScene = assignedSceneNumbers.length > 0 ? Math.max(...assignedSceneNumbers) : null;
  const setSceneCountTo = (n: number) => setFormData({ sceneCount: Math.max(2, Math.min(20, n)), sceneDurations: [] });

  // Scene di luar jumlah scene saat ini tapi masih <=20 → resolvable sekali klik (naikkan sceneCount).
  // >20 (di luar batas maksimal aplikasi) → TIDAK bisa diselesaikan satu klik, tetap tampil merah per-kartu.
  const outOfRangeRefs = formData.locationRefs.filter(r => r.sceneNumber !== null && (r.sceneNumber as number) > formData.sceneCount);
  const resolvableOutOfRangeCount = outOfRangeRefs.filter(r => (r.sceneNumber as number) <= 20).length;
  const resolveSceneCountTarget = maxAssignedScene !== null ? Math.min(maxAssignedScene, 20) : null;

  // Duplikat penugasan scene — 2+ entry menunjuk scene sama, hanya yang pertama (index terkecil)
  // yang benar-benar dipakai binding (lihat lib/locationRefs.ts getSceneLocationRef).
  const sceneAssignmentCounts = new Map<number, number>();
  formData.locationRefs.forEach(r => {
    if (r.sceneNumber !== null) sceneAssignmentCounts.set(r.sceneNumber, (sceneAssignmentCounts.get(r.sceneNumber) || 0) + 1);
  });

  const nextFreeSceneExcluding = (idx: number) => {
    const used = new Set(formData.locationRefs.filter((r, i) => i !== idx && r.sceneNumber !== null).map(r => r.sceneNumber as number));
    for (let i = 1; i <= 20; i++) if (!used.has(i)) return i;
    return 1;
  };

  // Foto terupload tapi belum diberi identitas/keterangan sama sekali.
  const unidentifiedCount = formData.locationRefs.filter(r => r.sourceName && !r.identity && !r.keterangan.trim()).length;

  const totalTracked = trackedFileNames().size;
  const identifiedCount = formData.locationRefs.filter(r => r.identity).length + (formData.characterRefFile.trim() ? 1 : 0);

  const hasVisualRefs = formData.characterRefFile.trim() || formData.locationRefs.length > 0;

  // === Download Bahan (ZIP) — Tugas 4 ===
  const downloadableCount = getReferenceEntries(formData).filter(e => getBlob(e.sourceName)).length;

  const downloadBahan = async () => {
    if (downloadableCount === 0) return;
    const zip = new JSZip();
    addReferenceSectionToZip(zip, formData, getBlob);
    const blob = await zip.generateAsync({ type: 'blob' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `viralframe_bahan_${dateStr}.zip`; a.click();
    URL.revokeObjectURL(url);

    setDownloadNotice('Lampirkan isi ZIP ini di AI video tool — nama file sudah cocok dengan prompt.');
    setTimeout(() => setDownloadNotice(null), 6000);
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

        {/* 🖼️ Referensi Visual — upload sumber nama file + grid identifikasi + canonical rename */}
        <div>
          <FieldLabel>🖼️ Referensi Visual (Opsional)</FieldLabel>
          <p className="text-xs mb-2" style={{ color: 'var(--vf-text-muted)' }}>
            Foto TIDAK dikirim ke AI — upload di sini hanya untuk identifikasi otomatis nama file + mapping
            per scene. Nama file upload BEBAS; setelah kamu identifikasi (identitas + scene), sistem menamai
            ulang otomatis (nama kanonik) dan itulah yang disebut di prompt. Download ZIP-nya lewat tombol
            "Download Bahan" di bawah, lalu lampirkan isinya langsung di AI video tool (mis. Google Flow).
            Maks {MAX_REFS} file, format jpg/png/webp, maks 5MB per file.
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
            <p className="text-xs mt-1" style={{ color: 'var(--vf-text-muted)' }}>{totalTracked}/{MAX_REFS} foto — {identifiedCount} teridentifikasi</p>
          </div>
          {uploadNotice && (
            <p className="text-xs mt-2" style={{ color: 'var(--vf-accent-warning)' }}>⚠️ {uploadNotice}</p>
          )}
          {swapNotice && (
            <p className="text-xs mt-2" style={{ color: 'var(--vf-accent-primary)' }}>ℹ️ {swapNotice}</p>
          )}
          {resolvableOutOfRangeCount > 0 && resolveSceneCountTarget !== null && (
            <div className="mt-2 p-3 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)' }}>
              <span>⚠️ {resolvableOutOfRangeCount} foto menunjuk scene di luar jumlah scene saat ini ({formData.sceneCount}).</span>
              <button
                type="button"
                onClick={() => setSceneCountTo(resolveSceneCountTarget)}
                className="px-2.5 py-1 rounded-md font-medium shrink-0"
                style={{ background: 'var(--vf-accent-warning)', color: 'white' }}
              >
                Set jumlah scene ke {resolveSceneCountTarget}
              </button>
            </div>
          )}

          {hasVisualRefs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {formData.characterRefFile.trim() && (() => {
                const url = getUrl(formData.characterRefSourceName);
                const hasBlob = !!getBlob(formData.characterRefSourceName);
                return (
                  <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--vf-bg-secondary)', border: '1px solid var(--vf-accent-primary)' }}>
                    <div className="flex items-start gap-2">
                      {url ? (
                        <img src={url} alt={formData.characterRefFile} className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ border: '1px solid var(--vf-border)' }} />
                      ) : (
                        <div className="w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 gap-0.5" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                          <ImageOff size={16} style={{ color: 'var(--vf-text-muted)' }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>👤 KARAKTER</span>
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--vf-text-primary)' }} title={formData.characterRefFile}>{formData.characterRefFile}</p>
                        {formData.characterRefSourceName && formData.characterRefSourceName !== formData.characterRefFile && (
                          <p className="text-[11px] truncate" style={{ color: 'var(--vf-text-muted)' }}>dari: {formData.characterRefSourceName}</p>
                        )}
                        <RoomIdentityCombobox value={CHARACTER_IDENTITY} options={IDENTITY_OPTIONS} onSelect={selectCharacterCardIdentity} />
                        {!hasBlob && (
                          <p className="text-[11px]" style={{ color: 'var(--vf-text-muted)' }}>
                            {formData.characterRefSourceName ? 'Preview tidak tersimpan & tidak ikut Download Bahan (tanpa file di sesi ini).' : 'Referensi manual — tidak ikut Download Bahan.'}
                          </p>
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
                );
              })()}

              {formData.locationRefs.map((ref, idx) => {
                const isInvalid = ref.sceneNumber !== null && ref.sceneNumber > formData.sceneCount;
                const isDuplicateScene = ref.sceneNumber !== null && (sceneAssignmentCounts.get(ref.sceneNumber) || 0) >= 2;
                const url = getUrl(ref.sourceName);
                const hasBlob = !!getBlob(ref.sourceName);
                const isUploaded = !!ref.sourceName;
                return (
                  <div key={idx} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--vf-bg-secondary)', border: '1px solid var(--vf-border)' }}>
                    <div className="flex items-start gap-2">
                      {url ? (
                        <img src={url} alt={ref.file || 'referensi'} className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ border: '1px solid var(--vf-border)' }} />
                      ) : (
                        <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                          <ImageOff size={16} style={{ color: 'var(--vf-text-muted)' }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        {isUploaded ? (
                          <div className="px-1">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--vf-text-primary)' }} title={ref.file}>{ref.file}</p>
                            {ref.sourceName && ref.sourceName !== ref.file && (
                              <p className="text-[11px] truncate" style={{ color: 'var(--vf-text-muted)' }}>dari: {ref.sourceName}</p>
                            )}
                          </div>
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
                        <div>
                          <FieldLabel>Identifikasi Scene</FieldLabel>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0" style={{ color: 'var(--vf-text-secondary)' }}>
                              <input
                                type="checkbox"
                                checked={ref.sceneNumber === null}
                                onChange={e => applyLocationChange(idx, { sceneNumber: e.target.checked ? null : nextFreeSceneExcluding(idx) })}
                                className="accent-indigo-500"
                              />
                              Semua scene
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              disabled={ref.sceneNumber === null}
                              value={ref.sceneNumber === null ? '' : ref.sceneNumber}
                              onChange={e => applyLocationChange(idx, { sceneNumber: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                              placeholder="No."
                              className="w-20 px-2 py-1.5 rounded-lg text-sm outline-none disabled:opacity-50"
                              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
                            />
                            {isInvalid && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--vf-accent-warning)' }}
                                title={`Scene ${ref.sceneNumber} tidak ada — jumlah scene sekarang ${formData.sceneCount}`}
                              >
                                Scene {ref.sceneNumber} ⚠
                              </span>
                            )}
                          </div>
                        </div>
                        {!hasBlob && (
                          <p className="text-[11px]" style={{ color: 'var(--vf-text-muted)' }}>
                            {isUploaded ? 'Preview tidak tersimpan & tidak ikut Download Bahan (tanpa file di sesi ini).' : 'Referensi manual — tidak ikut Download Bahan.'}
                          </p>
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
                    {isInvalid && (ref.sceneNumber as number) > 20 && (
                      <p className="text-xs" style={{ color: 'var(--vf-accent-danger)' }}>
                        ⚠️ Scene {ref.sceneNumber} di luar batas maksimal (20) — tidak bisa diperbaiki otomatis, ubah nomor scene-nya. Baris ini akan diabaikan saat generate.
                      </p>
                    )}
                    {isDuplicateScene && (
                      <p className="text-xs" style={{ color: 'var(--vf-accent-warning)' }}>
                        ⚠️ {sceneAssignmentCounts.get(ref.sceneNumber as number)} foto menunjuk Scene {ref.sceneNumber} — hanya yang pertama dipakai.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={addManualLocationRef}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-accent-primary)', border: '1px solid var(--vf-accent-primary)' }}
            >
              <Plus size={14} /> Tambah referensi manual (tanpa upload)
            </button>
            <button
              type="button"
              onClick={downloadBahan}
              disabled={downloadableCount === 0 || referenceHydrating}
              title={referenceHydrating ? 'Memulihkan foto referensi tersimpan...' : (downloadableCount === 0 ? 'Upload & identifikasi foto dulu — preview foto hanya hidup selama sesi.' : undefined)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
            >
              {referenceHydrating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {referenceHydrating ? ' Memulihkan foto...' : ` ⬇️ Download Bahan (ZIP)${downloadableCount > 0 ? ` (${downloadableCount})` : ''}`}
            </button>
          </div>
          {downloadNotice && (
            <p className="text-xs mt-2" style={{ color: 'var(--vf-accent-success)' }}>✅ {downloadNotice}</p>
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
