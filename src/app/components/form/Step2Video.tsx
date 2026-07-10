import { useAppStore } from '../../store';
import { AI_TOOLS, RATIOS, LANGUAGES } from '../../lib/maps';
import { getLipsyncSpec } from '../../lib/lipsync';
import { FieldLabel, FormCard, SelectField, NumberInput } from './FormFields';

export function Step2Video() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const settings = useAppStore(s => s.settings);

  const sceneCount = formData.sceneCount;

  const handleSceneDurationChange = (idx: number, val: number) => {
    const durations = [...(formData.sceneDurations.length >= sceneCount
      ? formData.sceneDurations
      : Array(sceneCount).fill(formData.uniformDuration))];
    durations[idx] = val;
    setFormData({ sceneDurations: durations });
  };

  const getSceneDurations = () => {
    if (formData.durationMode === 'uniform') return Array(sceneCount).fill(formData.uniformDuration);
    const d = [...formData.sceneDurations];
    while (d.length < sceneCount) d.push(formData.uniformDuration);
    return d.slice(0, sceneCount);
  };

  const durations = getSceneDurations();
  const totalDuration = durations.reduce((a, b) => a + b, 0);

  const getSceneType = (i: number) => {
    if (i === 0) return 'Hook';
    if (i === sceneCount - 1) return 'CTA';
    return 'Body';
  };

  const selectedTool = AI_TOOLS.find(t => t.value === formData.aiTool);

  return (
    <div className="space-y-6">
      <FormCard title="🎬 Spesifikasi Video">
        <div>
          <FieldLabel>AI Video Tool *</FieldLabel>
          <select
            value={formData.aiTool}
            onChange={e => setFormData({ aiTool: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
          >
            <option value="">Pilih AI video generator</option>
            {AI_TOOLS.map(t => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.charLimit} chars {t.supportsRef ? '✅ Ref Image' : ''}
              </option>
            ))}
          </select>
          {selectedTool && (
            <div className="mt-2 flex gap-4 text-xs" style={{ color: 'var(--vf-text-secondary)' }}>
              <span>Batas prompt: <strong>{selectedTool.charLimit}</strong> karakter</span>
              <span style={{ color: selectedTool.supportsRef ? 'var(--vf-accent-success)' : 'var(--vf-text-muted)' }}>
                {selectedTool.supportsRef ? '✅ Mendukung Reference Image' : '❌ Teks saja'}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Jumlah Scene (2–20) *"
            value={sceneCount}
            onChange={v => {
              const n = Math.max(2, Math.min(20, v));
              setFormData({ sceneCount: n, sceneDurations: [] });
            }}
            min={2}
            max={20}
          />
          <div>
            <FieldLabel>Rasio Video</FieldLabel>
            <SelectField
              value={formData.ratio}
              onChange={v => setFormData({ ratio: v })}
              options={RATIOS}
            />
          </div>
        </div>

        <SelectField
          label="Bahasa Narasi"
          value={formData.language}
          onChange={v => setFormData({ language: v })}
          options={LANGUAGES}
        />
      </FormCard>

      <FormCard title="⏱️ Durasi Per Scene">
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={formData.durationMode === 'uniform'}
              onChange={() => setFormData({ durationMode: 'uniform' })}
              className="accent-indigo-500"
            />
            <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>Seragam (Mode A)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={formData.durationMode === 'manual'}
              onChange={() => setFormData({ durationMode: 'manual' })}
              className="accent-indigo-500"
            />
            <span className="text-sm" style={{ color: 'var(--vf-text-primary)' }}>Manual per Scene (Mode B)</span>
          </label>
        </div>

        {formData.durationMode === 'uniform' ? (
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>Durasi setiap scene:</span>
            <input
              type="number"
              value={formData.uniformDuration}
              onChange={e => setFormData({ uniformDuration: Math.max(2, Math.min(30, Number(e.target.value))) })}
              min={2} max={30}
              className="w-20 px-2 py-1.5 rounded-lg text-sm outline-none text-center"
              style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
            />
            <span className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>detik</span>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: sceneCount }, (_, i) => {
              const d = durations[i] || formData.uniformDuration;
              const spec = getLipsyncSpec(d, settings.narrationWPM || 165);
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--vf-bg-secondary)' }}>
                  <span className="text-sm w-16 shrink-0" style={{ color: 'var(--vf-text-secondary)' }}>
                    Scene {i + 1} <span className="text-xs" style={{ color: i === 0 ? 'var(--vf-accent-warning)' : i === sceneCount - 1 ? 'var(--vf-accent-cta)' : 'var(--vf-accent-secondary)' }}>({getSceneType(i)})</span>
                  </span>
                  <input
                    type="number"
                    value={d}
                    onChange={e => handleSceneDurationChange(i, Math.max(2, Math.min(30, Number(e.target.value))))}
                    min={2} max={30}
                    className="w-16 px-2 py-1 rounded text-sm outline-none text-center"
                    style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>detik</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--vf-text-secondary)' }}>
                    maks {spec.maxWords} kata · {spec.pace}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--vf-border)' }}>
          <span className="text-sm" style={{ color: 'var(--vf-text-secondary)' }}>Total durasi: <strong>{totalDuration} detik</strong></span>
          <span className="text-xs" style={{ color: totalDuration > 180 ? 'var(--vf-accent-warning)' : 'var(--vf-text-muted)' }}>
            {totalDuration > 180 ? '⚠️ Lebih dari 3 menit' : '✅ Optimal'}
          </span>
        </div>
      </FormCard>
    </div>
  );
}
