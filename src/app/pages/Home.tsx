import { useState } from 'react';
import { Zap, Loader2, AlertCircle, BookmarkPlus } from 'lucide-react';
import { useAppStore } from '../store';
import { compileMasterPrompt } from '../lib/masterPrompt';
import { generateWithFallback, ApiCallError } from '../lib/apiClient';
import { validateFormData, getFormWarnings } from '../lib/validation';
import { validateVideoJSON } from '../lib/jsonParser';
import { StepIndicator } from '../components/form/StepIndicator';
import { Step1Business } from '../components/form/Step1Business';
import { Step2Video } from '../components/form/Step2Video';
import { Step3Creative } from '../components/form/Step3Creative';
import { DirectPanel } from '../components/output/DirectPanel';
import { ManualPanel } from '../components/output/ManualPanel';
import { SaveTemplateDialog } from '../components/output/SaveTemplateDialog';
import { VideoJSON } from '../types';

function ModeSelector({ onSelect }: { onSelect: (mode: 'direct' | 'manual') => void }) {
  const settings = useAppStore(s => s.settings);
  const hasGemini = !!settings.geminiApiKey;
  const hasGroq = !!settings.groqApiKey;
  const hasApiKey = hasGemini || hasGroq;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h2 className="text-center mb-2" style={{ color: 'var(--vf-text-primary)' }}>Pilih Mode Generate</h2>
      <p className="text-sm text-center mb-8" style={{ color: 'var(--vf-text-secondary)' }}>
        Bagaimana kamu ingin menghasilkan Scene Cards?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('direct')}
          className="p-6 rounded-xl text-left transition-all hover:scale-105"
          style={{ background: 'var(--vf-bg-elevated)', border: `2px solid ${hasApiKey ? 'var(--vf-accent-primary)' : 'var(--vf-border)'}` }}
        >
          <div className="text-2xl mb-3">⚡</div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--vf-text-primary)' }}>Direct API Mode</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--vf-text-secondary)' }}>
            App generate JSON otomatis via Gemini/Groq API. Scene Cards langsung muncul di app.
          </p>
          <div className="space-y-1">
            {hasApiKey ? (
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--vf-accent-success)' }}>
                ✅ API Terkonfigurasi — {hasGemini ? 'Gemini 2.5 Flash' : 'Groq Llama 3.3'}
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--vf-accent-warning)' }}>
                ⚠️ API key belum dikonfigurasi
              </span>
            )}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--vf-text-muted)' }}>Direkomendasikan · Gratis</p>
        </button>

        <button
          onClick={() => onSelect('manual')}
          className="p-6 rounded-xl text-left transition-all hover:scale-105"
          style={{ background: 'var(--vf-bg-elevated)', border: '2px solid var(--vf-border)' }}
        >
          <div className="text-2xl mb-3">📋</div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--vf-text-primary)' }}>Manual Prompt Mode</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--vf-text-secondary)' }}>
            Kamu copy prompt, paste ke ChatGPT / Claude / Gemini, lalu paste hasilnya kembali ke app.
          </p>
          <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--vf-accent-secondary)' }}>
            ✅ Tidak butuh API key · Selalu tersedia
          </span>
          <p className="text-xs mt-3" style={{ color: 'var(--vf-text-muted)' }}>Fallback universal</p>
        </button>
      </div>
    </div>
  );
}



export function Home() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const currentStep = useAppStore(s => s.currentStep);
  const setCurrentStep = useAppStore(s => s.setCurrentStep);
  const outputJSON = useAppStore(s => s.outputJSON);
  const setOutputJSON = useAppStore(s => s.setOutputJSON);
  const masterPrompt = useAppStore(s => s.masterPrompt);
  const setMasterPrompt = useAppStore(s => s.setMasterPrompt);
  const isGenerating = useAppStore(s => s.isGenerating);
  const setIsGenerating = useAppStore(s => s.setIsGenerating);
  const generateProgress = useAppStore(s => s.generateProgress);
  const setGenerateProgress = useAppStore(s => s.setGenerateProgress);
  const generateError = useAppStore(s => s.generateError);
  const setGenerateError = useAppStore(s => s.setGenerateError);
  const generateWarnings = useAppStore(s => s.generateWarnings);
  const setGenerateWarnings = useAppStore(s => s.setGenerateWarnings);
  const settings = useAppStore(s => s.settings);
  const addHistory = useAppStore(s => s.addHistory);

  const [showModeSelector, setShowModeSelector] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [showOutput, setShowOutput] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const steps = ['Konteks Bisnis', 'Spesifikasi Video', 'Parameter Kreatif'];

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else if (currentStep === 1) setCurrentStep(0);
  };

  const handleModeSelect = (mode: 'direct' | 'manual') => {
    setFormData({ mode });
    setShowModeSelector(false);
    handleGenerate(mode);
  };

  const handleGenerateClick = () => {
    const errors = validateFormData(formData as unknown as Record<string, unknown>);
    setFormErrors(errors);
    if (errors.length > 0) return;

    const warnings = getFormWarnings(formData as unknown as Record<string, unknown>);
    const warningList: string[] = [];
    if (warnings.hookDurationWarning) warningList.push(warnings.hookDurationWarning);
    if (warnings.totalDurationWarning) warningList.push(warnings.totalDurationWarning);
    const hasApiKey = !!(settings.geminiApiKey || settings.groqApiKey || settings.openrouterApiKey);
    if (!hasApiKey) warningList.push('API key belum dikonfigurasi. Konfigurasi di Settings atau gunakan Manual Prompt Mode.');
    setFormWarnings(warningList);

    if (settings.defaultMode === 'direct' && hasApiKey) {
      handleGenerate('direct');
    } else if (settings.defaultMode === 'manual') {
      handleGenerate('manual');
    } else {
      setShowModeSelector(true);
    }
  };

  const handleGenerate = async (mode: 'direct' | 'manual') => {
    setFormData({ mode });
    setGenerateError('');
    setGenerateWarnings('');
    setFormErrors([]);

    const prompt = compileMasterPrompt({ ...formData, mode });
    setMasterPrompt(prompt);

    if (mode === 'manual') {
      setShowOutput(true);
      return;
    }

    // Direct API mode
    setIsGenerating(true);
    try {
      const keys = {
        gemini: settings.geminiApiKey,
        groq: settings.groqApiKey,
        openrouter: settings.openrouterApiKey,
      };
      const json = await generateWithFallback(prompt, keys, (msg) => setGenerateProgress(msg));
      setOutputJSON(json);
      const validation = validateVideoJSON(json, formData.sceneCount);
      if (!validation.valid || validation.warnings.length > 0) {
        const msgs = [...validation.errors, ...validation.warnings];
        setGenerateWarnings(msgs.join('\n'));
      } else {
        setGenerateWarnings('');
      }
      addHistory({
        id: Date.now().toString(),
        timestamp: Date.now(),
        label: formData.productDescription.slice(0, 50) || 'Generate tanpa judul',
        formData: { ...formData, mode },
        masterPrompt: prompt,
        videoJSON: json,
      });
      setShowOutput(true);
    } catch (e: unknown) {
      const err = e as ApiCallError;
      setGenerateError(err.message || 'Terjadi kesalahan tidak diketahui.');
    } finally {
      setIsGenerating(false);
      setGenerateProgress('');
    }
  };

  const handleJsonValidated = (json: VideoJSON) => {
    setOutputJSON(json);
    addHistory({
      id: Date.now().toString(),
      timestamp: Date.now(),
      label: formData.productDescription.slice(0, 50) || 'Generate Manual Mode',
      formData: { ...formData },
      masterPrompt,
      videoJSON: json,
    });
  };

  const handleRegenerate = () => {
    setOutputJSON(null);
    setShowOutput(false);
    handleGenerate(formData.mode);
  };

  const handleEdit = () => {
    setOutputJSON(null);
    setShowOutput(false);
    setCurrentStep(1);
  };

  // Show mode selector
  if (showModeSelector) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ModeSelector onSelect={handleModeSelect} />
        <div className="text-center mt-4">
          <button onClick={() => setShowModeSelector(false)} className="text-sm" style={{ color: 'var(--vf-text-muted)' }}>← Kembali ke Form</button>
        </div>
      </div>
    );
  }

  // Show output
  if (showOutput) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        {showSaveTemplate && (
          <SaveTemplateDialog formData={formData} onClose={() => setShowSaveTemplate(false)} />
        )}

        {!isGenerating && !generateError && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowSaveTemplate(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
            >
              <BookmarkPlus size={14} /> Simpan sebagai Template
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-16">
            <Loader2 className="animate-spin mx-auto mb-4" size={40} style={{ color: 'var(--vf-accent-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--vf-text-primary)' }}>{generateProgress || 'Memproses...'}</p>
            <div className="mt-4 space-y-2 max-w-xs mx-auto">
              {['Memanggil Gemini API...', 'Mengurai JSON...', 'Menyiapkan Scene Cards...'].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--vf-text-muted)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: generateProgress.includes(step.split(' ')[0]) ? 'var(--vf-accent-primary)' : 'var(--vf-border)' }} />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isGenerating && generateError && (
          <div className="max-w-2xl mx-auto">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--vf-accent-danger)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} style={{ color: 'var(--vf-accent-danger)' }} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--vf-accent-danger)' }}>Error Generate</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--vf-text-secondary)' }}>{generateError}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => handleGenerate('manual')} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-primary)', border: '1px solid var(--vf-border)' }}>
                📋 Coba Manual Mode
              </button>
              <button onClick={handleEdit} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>
                ✏️ Edit Parameter
              </button>
            </div>
          </div>
        )}

        {!isGenerating && generateWarnings && (
          <div className="max-w-5xl mx-auto mb-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--vf-accent-warning)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} style={{ color: 'var(--vf-accent-warning)' }} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--vf-accent-warning)' }}>⚠️ Hasil Generate Tidak Lengkap</p>
                  <pre className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--vf-text-secondary)' }}>{generateWarnings}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
        {!isGenerating && formData.mode === 'direct' && outputJSON && (
          <DirectPanel json={outputJSON} onRegenerate={handleRegenerate} onEdit={handleEdit} referencePhotos={formData.referencePhotos} />
        )}

        {!isGenerating && !generateError && formData.mode === 'manual' && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--vf-border)', background: 'var(--vf-bg-elevated)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--vf-border)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--vf-text-primary)' }}>📋 Manual Prompt Mode</h3>
            </div>
            <div className="p-4">
              <ManualPanel
                masterPrompt={masterPrompt}
                sceneCount={formData.sceneCount}
                aiTool={formData.aiTool}
                onJsonValidated={handleJsonValidated}
                referencePhotos={formData.referencePhotos}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show step 0 - initial screen before form
  if (currentStep === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--vf-accent-primary)' }}>
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="mb-4" style={{ color: 'var(--vf-text-primary)' }}>ViralFrame Studio</h1>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--vf-text-secondary)' }}>
            AI Video Scene Generator — generate prompt video viral siap pakai per scene, lengkap dengan narasi, visual direction, dan prompt siap di-paste ke AI video generator.
          </p>
          <button
            onClick={() => setCurrentStep(1)}
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
          >
            ⚡ Mulai Generate Video →
          </button>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            {[
              { icon: '📝', title: 'Isi Form 3 Langkah', desc: 'Ceritakan produk, pilih platform, tentukan gaya visual dan karakter.' },
              { icon: '⚡', title: 'Generate via AI API', desc: 'Gemini/Groq generate JSON per scene otomatis — atau copy prompt ke AI lain.' },
              { icon: '🎬', title: 'Dapatkan Scene Cards', desc: 'Setiap scene punya narasi, prompt video, brief, dan panduan konsistensi.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-4 rounded-xl" style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}>
                <div className="text-2xl mb-2">{icon}</div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--vf-text-primary)' }}>{title}</h4>
                <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <StepIndicator currentStep={currentStep} totalSteps={3} labels={steps} />
      </div>

      <div className="max-w-2xl mx-auto">
        {currentStep === 1 && <Step1Business />}
        {currentStep === 2 && <Step2Video />}
        {currentStep === 3 && <Step3Creative />}

        {/* Validation errors */}
        {formErrors.length > 0 && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--vf-accent-danger)' }}>
            {formErrors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--vf-accent-danger)' }}>
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {e}
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {formWarnings.length > 0 && formErrors.length === 0 && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--vf-accent-warning)' }}>
            {formWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--vf-accent-warning)' }}>
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)', border: '1px solid var(--vf-border)' }}
          >
            ← Kembali
          </button>
          <div className="flex gap-3">
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
              >
                Lanjut →
              </button>
            ) : (
              <button
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                ⚡ Generate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
