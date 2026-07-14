import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Loader2, Download, AlertCircle, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import {
  HOOK_TYPES, CTA_TYPES, ETHNICITIES, CHARACTER_STYLES, TALENT_STYLES,
  EXPRESSIONS, VISUAL_STYLES, BACKSOUNDS, NARRATIVE_TONES, CAPTION_VARIATION_OPTIONS,
  GROWTH_ALLOWED_CTAS, CHARACTER_BACKGROUNDS
} from '../../lib/maps';
import { TalentStyle } from '../../types';
import { getEffectiveLocationRefs } from '../../lib/locationRefs';
import { buildCanonicalName, resolveUniqueCanonicalName, inferExtension } from '../../lib/canonicalRefNames';
import { buildCharacterPhotoPrompt, buildBackground } from '../../lib/characterPhotoPrompt';
import { generateImageWithFallback, ImageGenError } from '../../lib/imageClient';
import { putImage } from '../../lib/refImageDB';
import { getContentType, DEFAULT_CONTENT_TYPE_ID } from '../../lib/registry';

const formSections = getContentType(DEFAULT_CONTENT_TYPE_ID).formSections;
import { FieldLabel, FormCard, SelectField, InputField, TagsInput } from './FormFields';

// ── Character Photo Generator ─────────────────────────────────

function CharacterPhotoGenerator() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const referenceFiles = useAppStore(s => s.referenceFiles);
  const setReferenceFile = useAppStore(s => s.setReferenceFile);
  const settings = useAppStore(s => s.settings);

  const [generating, setGenerating] = useState(false);
  const [providerLabel, setProviderLabel] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Cari foto produk pertama yang punya blob
  const productRefs = getEffectiveLocationRefs(formData).filter(r => r.role === 'product' && r.sourceName && referenceFiles[r.sourceName]?.blob);
  const productBlob = productRefs[0]?.sourceName ? referenceFiles[productRefs[0].sourceName]?.blob : null;
  const { prompt, needsProductImage } = buildCharacterPhotoPrompt(formData, !!productBlob);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError('');
    setPreviewUrl(null);
    setGeneratedBlob(null);
    setSavedNotice(null);

    try {
      const blob = await generateImageWithFallback(prompt, { ratio: '9:16', inputImage: productBlob || undefined }, {
        geminiApiKey: settings.geminiApiKey,
        geminiImageModel: settings.geminiImageModel,
        puterEnabled: settings.puterEnabled,
        onProviderStatus: (_provider, status) => {
          if (status === 'trying') {
            setProviderLabel('Puter.js');
          }
        },
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setGeneratedBlob(blob);
    } catch (e: unknown) {
      const msg = e instanceof ImageGenError ? e.message : 'Terjadi kesalahan tidak diketahui.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [prompt, productBlob, settings]);

  const handleUseAsCharacter = () => {
    if (!generatedBlob) return;
    const timestamp = Date.now();
    const sourceName = `generated_karakter_${timestamp}.png`;
    const url = URL.createObjectURL(generatedBlob);
    setReferenceFile(sourceName, url, generatedBlob);
    putImage(sourceName, generatedBlob);

    const ext = inferExtension(sourceName);
    const canonical = buildCanonicalName({ kind: 'character' }, ext);
    const existingFiles = new Set([
      ...formData.locationRefs.map(r => r.file.trim()).filter(Boolean),
      ...(formData.characterRefFile.trim() ? [formData.characterRefFile.trim()] : []),
    ]);
    const unique = resolveUniqueCanonicalName(canonical, existingFiles);

    const locationNote = buildBackground(formData);
    setFormData({ characterRefFile: unique, characterRefSourceName: sourceName, characterLocationNote: locationNote });
    if (previewUrl && generatedBlob) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setGeneratedBlob(null);

    const prevFile = formData.characterRefFile;
    setSavedNotice(prevFile ? `✅ Foto karakter diperbarui: "${unique}" (menggantikan "${prevFile}")` : `✅ Foto karakter tersimpan: "${unique}"`);
    setTimeout(() => setSavedNotice(null), 5000);
  };

  const handleRegenerate = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    handleGenerate();
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl; a.download = 'karakter.png'; a.click();
  };

  const hasProductHint = !productBlob && needsProductImage;

  return (
    <div className="space-y-3">
      {!previewUrl && !generating && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
          >
            <Sparkles size={14} />
            ✨ Generate Foto Karakter
          </button>
          {hasProductHint && (
            <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
              💡 Tanpa foto produk — karakter digenerate tanpa memegang produk. Upload foto produk di Step 1 untuk hasil terikat produk.
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
            Hasil generate ikut masuk Download Bahan (ZIP) — pilih "Pakai" untuk menyimpan.
          </p>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center gap-2 p-4 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--vf-accent-primary)' }} />
          <span className="text-xs" style={{ color: 'var(--vf-text-secondary)' }}>Generate foto karakter... (via image engine)</span>
        </div>
      )}

      {error && !previewUrl && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--vf-accent-danger)' }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
          >
            🔄 Coba Lagi
          </button>
        </div>
      )}

      {previewUrl && generatedBlob && (
        <div className="space-y-3 rounded-xl p-3" style={{ background: 'var(--vf-bg-secondary)', border: '1px solid var(--vf-border)' }}>
          <img src={previewUrl} alt="Preview karakter" className="w-full rounded-lg" style={{ maxHeight: 320, objectFit: 'contain', background: 'var(--vf-bg-elevated)' }} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
            >
              <Download size={12} /> ⬇️ Download
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
            >
              🔄 Generate Ulang
            </button>
            <button
              type="button"
              onClick={handleUseAsCharacter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
            >
              ✅ Pakai sebagai Referensi Karakter
            </button>
          </div>
        </div>
      )}

      {savedNotice && (
        <p className="text-xs p-2 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--vf-accent-success)' }}>
          {savedNotice}
        </p>
      )}
    </div>
  );
}

export function Step3Creative() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isGrowthGoal = formData.contentGoal === 'growth';
  const ctaOptions = isGrowthGoal ? CTA_TYPES.filter(c => GROWTH_ALLOWED_CTAS.includes(c.value)) : CTA_TYPES;

  useEffect(() => {
    if (isGrowthGoal && !GROWTH_ALLOWED_CTAS.includes(formData.ctaType)) {
      setFormData({ ctaType: GROWTH_ALLOWED_CTAS[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGrowthGoal]);

  const consistencyScore = () => {
    if (formData.talentStyle !== 'visible_character') return null;
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
      {formSections.includes('hook_cta') && (
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
          options={ctaOptions}
        />
        {isGrowthGoal && (
          <p className="text-xs -mt-2" style={{ color: 'var(--vf-text-muted)' }}>
            🌱 Mode Growth aktif: pilihan CTA dibatasi ke follow/save/share/comment — CTA jualan disembunyikan.
          </p>
        )}
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
      )}

      {formSections.includes('character') && (
      <FormCard title="🧍 Karakter dalam Video">
        <div>
          <FieldLabel>Gaya Talent</FieldLabel>
          <div className="flex flex-col gap-2 mt-1">
            {TALENT_STYLES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.talentStyle === value}
                  onChange={() => setFormData({ talentStyle: value as TalentStyle, useCharacter: value === 'visible_character' })}
                  className="accent-indigo-500"
                />
                <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {formData.talentStyle === 'product_only' && (
          <InputField
            label="Visual Anchor (opsional)"
            value={formData.visualAnchor}
            onChange={v => setFormData({ visualAnchor: v })}
            placeholder='Contoh: "tangan model dengan nail art merah", "produk selalu pojok kanan bawah"'
          />
        )}

        {formData.talentStyle === 'faceless_pov' && (
          <div className="space-y-3">
            <InputField
              label="Deskripsi Tangan *"
              value={formData.handDescription}
              onChange={v => setFormData({ handDescription: v })}
              placeholder='Contoh: "kulit sawo matang, kuku pendek natural, memakai cincin perak tipis di jari manis, jam tangan hitam di pergelangan kiri"'
            />
            <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
              Deskripsi ini (warna kulit, kuku, aksesori seperti cincin/jam) akan di-lock identik di setiap scene demi konsistensi tangan talent — wajah tidak akan tampil (mode POV first-person).
            </p>
            {!formData.handDescription && (
              <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)', border: '1px solid var(--vf-accent-warning)' }}>
                ⚠️ Isi deskripsi tangan agar tangan talent konsisten di semua scene.
              </div>
            )}
          </div>
        )}

        {formData.talentStyle !== 'product_only' && (
          <div className="pt-1">
            {formData.characterRefFile.trim() ? (
              <p className="text-xs p-2 rounded" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
                📎 Foto referensi karakter: <strong>{formData.characterRefFile}</strong> — atur/ganti di seksi Referensi Visual, Step 1.
              </p>
            ) : (
              <CharacterPhotoGenerator />
            )}
          </div>
        )}

        {formData.talentStyle === 'visible_character' && (
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
            <p className="text-xs -mt-2" style={{ color: 'var(--vf-text-secondary)' }}>
              Boleh ditulis Bahasa Indonesia — sistem otomatis menerjemahkan istilah visual ke English presisi di prompt video.
            </p>
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

            <SelectField
              label="Latar Foto Karakter"
              value={formData.characterBackground}
              onChange={v => setFormData({ characterBackground: v })}
              options={CHARACTER_BACKGROUNDS}
            />
            {formData.characterBackground === 'custom' && (
              <InputField
                label="Deskripsi Latar Custom *"
                value={formData.characterBackgroundCustom}
                onChange={v => setFormData({ characterBackgroundCustom: v })}
                placeholder='Contoh: "kafe outdoor beralas kerikil dengan lampu senar di atas"'
              />
            )}

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

        {formData.characterRefFile.trim() && formData.talentStyle === 'product_only' && (
          <p className="text-xs p-2 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--vf-accent-warning)' }}>
            ℹ️ Referensi karakter tidak akan dipakai karena Talent Style = Produk Saja.
          </p>
        )}
      </FormCard>
      )}

      {formSections.includes('visual_audio') && (
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
      )}

      {/* Advanced Settings */}
      {formSections.includes('advanced') && (
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
      )}
    </div>
  );
}
