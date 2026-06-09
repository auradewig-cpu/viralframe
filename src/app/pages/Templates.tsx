import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppStore } from '../store';
import { PRESET_TEMPLATES } from '../lib/maps';
import { NICHES, PLATFORMS, AI_TOOLS, HOOK_TYPES, CTA_TYPES } from '../lib/maps';
import { DEFAULT_FORM } from '../types';

const nicheEmoji: Record<string, string> = {
  affiliate_product: '🛒', real_estate: '🏠', web_builder: '💻', fashion_beauty: '💄',
  food_beverage: '🍜', education_course: '📚', health_wellness: '🏋️', travel_tourism: '✈️',
  finance_investment: '💰', saas_app: '📱', personal_brand: '🎤',
  dropship_ecommerce: '📦', local_service: '🔧', event_organizer: '🎪',
};

export function Templates() {
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const customTemplates = useAppStore(s => s.customTemplates);
  const removeTemplate = useAppStore(s => s.removeTemplate);
  const loadFormData = useAppStore(s => s.loadFormData);
  const setCurrentStep = useAppStore(s => s.setCurrentStep);
  const navigate = useNavigate();

  const handleUsePreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    const nicheLabel = NICHES.find(n => n.value === preset.niche)?.label || preset.niche;
    const aiToolData = AI_TOOLS.find(t => t.value === preset.aiTool);
    loadFormData({
      ...DEFAULT_FORM,
      niche: preset.niche,
      platforms: [preset.platform],
      aiTool: preset.aiTool,
      sceneCount: preset.sceneCount,
      uniformDuration: preset.durationPerScene,
      hookType: preset.hookType,
      ctaType: preset.ctaType,
      ratio: '9:16',
      productDescription: `Isi deskripsi produk/layanan untuk niche ${nicheLabel}`,
    });
    setCurrentStep(1);
    navigate('/');
  };

  const handleUseCustom = (template: typeof customTemplates[0]) => {
    if (template.formData) {
      loadFormData({ ...DEFAULT_FORM, ...template.formData });
    }
    setCurrentStep(1);
    navigate('/');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--vf-text-primary)' }}>📁 Template Library</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--vf-text-secondary)' }}>
          Mulai cepat dari template siap pakai atau simpan konfigurasi form kamu sebagai template custom.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex mb-6" style={{ borderBottom: '1px solid var(--vf-border)' }}>
        <button
          onClick={() => setActiveTab('preset')}
          className="px-4 py-3 text-sm font-medium transition-colors"
          style={{ color: activeTab === 'preset' ? 'var(--vf-accent-primary)' : 'var(--vf-text-muted)', borderBottom: activeTab === 'preset' ? '2px solid var(--vf-accent-primary)' : '2px solid transparent' }}
        >
          🏷️ Preset Bawaan
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className="px-4 py-3 text-sm font-medium transition-colors"
          style={{ color: activeTab === 'custom' ? 'var(--vf-accent-primary)' : 'var(--vf-text-muted)', borderBottom: activeTab === 'custom' ? '2px solid var(--vf-accent-primary)' : '2px solid transparent' }}
        >
          ⭐ Template Saya {customTemplates.length > 0 && `(${customTemplates.length})`}
        </button>
      </div>

      {activeTab === 'preset' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_TEMPLATES.map(preset => {
            const hookLabel = HOOK_TYPES.find(h => h.value === preset.hookType)?.label || preset.hookType;
            const ctaLabel = CTA_TYPES.find(c => c.value === preset.ctaType)?.label || preset.ctaType;
            const toolLabel = AI_TOOLS.find(t => t.value === preset.aiTool)?.label || preset.aiTool;
            const platformLabel = PLATFORMS.find(p => p.value === preset.platform)?.label || preset.platform;
            const emoji = nicheEmoji[preset.niche] || '📦';
            const totalDuration = preset.sceneCount * preset.durationPerScene;

            return (
              <div key={preset.id} className="rounded-xl p-4 flex flex-col" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                <div className="text-2xl mb-2">{emoji}</div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--vf-text-primary)' }}>{preset.name}</h3>
                <div className="space-y-1 mt-2 mb-4 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{preset.sceneCount} scene · {totalDuration}s</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{platformLabel}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{toolLabel}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>Hook: {hookLabel.replace(/[^\w\s]/gu, '').trim()}</p>
                  <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>CTA: {ctaLabel.replace(/[^\w\s]/gu, '').trim()}</p>
                </div>
                <button
                  onClick={() => handleUsePreset(preset)}
                  className="w-full py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
                >
                  Pakai Template
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'custom' && (
        <div>
          {customTemplates.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ border: '2px dashed var(--vf-border)' }}>
              <p className="text-4xl mb-4">📂</p>
              <p style={{ color: 'var(--vf-text-secondary)' }}>Belum ada template custom.</p>
              <p className="text-sm mt-2 mb-6" style={{ color: 'var(--vf-text-muted)' }}>
                Setelah mengisi form, klik "Simpan sebagai Template" di halaman generate untuk menyimpan konfigurasi ini.
              </p>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
              >
                <Plus size={14} /> Buat Template Baru dari Form
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTemplates.map(template => (
                <div key={template.id} className="rounded-xl p-4 flex flex-col" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--vf-text-primary)' }}>{template.name}</h3>
                    <button onClick={() => removeTemplate(template.id)} style={{ color: 'var(--vf-accent-danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex gap-1.5 mt-2 mb-4 flex-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{template.sceneCount} scene</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>{template.aiTool}</span>
                  </div>
                  <button
                    onClick={() => handleUseCustom(template)}
                    className="w-full py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
                  >
                    Pakai Template
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
