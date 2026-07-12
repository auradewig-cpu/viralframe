import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FormData, AppSettings, HistoryRecord, Template, VideoJSON, DEFAULT_FORM, DEFAULT_SETTINGS } from './types';
import { PRESET_TEMPLATES } from './lib/maps';

export type ProviderKey = 'gemini' | 'groq' | 'openrouter';
export type ProviderStatus = 'idle' | 'trying' | 'success' | 'failed';

interface AppState {
  // Form
  formData: FormData;
  currentStep: number;
  setFormData: (data: Partial<FormData>) => void;
  setCurrentStep: (step: number) => void;
  resetForm: () => void;
  loadFormData: (data: FormData) => void;

  // Output
  generatedOutput: { contentTypeId: string; data: VideoJSON } | null;
  masterPrompt: string;
  isGenerating: boolean;
  generateProgress: string;
  generateError: string;
  generateWarnings: string;
  setGeneratedOutput: (contentTypeId: string, data: VideoJSON | null) => void;
  setMasterPrompt: (prompt: string) => void;
  setIsGenerating: (v: boolean) => void;
  setGenerateProgress: (msg: string) => void;
  setGenerateError: (err: string) => void;
  setGenerateWarnings: (w: string) => void;
  generateProgressPercent: number;
  setGenerateProgressPercent: (percent: number) => void;
  providerStatus: Record<ProviderKey, ProviderStatus>;
  setProviderStatus: (provider: ProviderKey, status: ProviderStatus) => void;
  resetProviderStatus: () => void;
  lastUsedProvider: ProviderKey | null;
  setLastUsedProvider: (provider: ProviderKey | null) => void;
  groqQuotaPercent: number | null;
  setGroqQuotaPercent: (percent: number | null) => void;

  // Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;

  // History
  history: HistoryRecord[];
  addHistory: (record: HistoryRecord) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;

  // Templates
  customTemplates: Template[];
  addTemplate: (t: Template) => void;
  removeTemplate: (id: string) => void;
  getPresetTemplates: () => Template[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      formData: { ...DEFAULT_FORM },
      currentStep: 0,
      setFormData: (data) => set((s) => ({ formData: { ...s.formData, ...data } })),
      setCurrentStep: (step) => set({ currentStep: step }),
      resetForm: () => set({ formData: { ...DEFAULT_FORM }, currentStep: 0, generatedOutput: null, masterPrompt: '', generateError: '', generateWarnings: '', generateProgressPercent: 0, providerStatus: { gemini: 'idle', groq: 'idle', openrouter: 'idle' }, lastUsedProvider: null, groqQuotaPercent: null }),
      loadFormData: (data) => set({
        formData: {
          ...DEFAULT_FORM,
          ...data,
          // data lama (History/Template) sebelum talentStyle ada — derive dari useCharacter agar tidak crash/berubah perilaku.
          talentStyle: data.talentStyle ?? (data.useCharacter ? 'visible_character' : 'product_only'),
        },
        currentStep: 0,
        generatedOutput: null,
        masterPrompt: '',
      }),

      generatedOutput: null,
      masterPrompt: '',
      isGenerating: false,
      generateProgress: '',
      generateError: '',
      generateWarnings: '',
      setGeneratedOutput: (contentTypeId, data) => set({ generatedOutput: data ? { contentTypeId, data } : null }),
      setMasterPrompt: (prompt) => set({ masterPrompt: prompt }),
      setIsGenerating: (v) => set({ isGenerating: v }),
      setGenerateProgress: (msg) => set({ generateProgress: msg }),
      setGenerateError: (err) => set({ generateError: err }),
      setGenerateWarnings: (w) => set({ generateWarnings: w }),
      generateProgressPercent: 0,
      setGenerateProgressPercent: (percent) => set({ generateProgressPercent: percent }),
      providerStatus: { gemini: 'idle', groq: 'idle', openrouter: 'idle' },
      setProviderStatus: (provider, status) => set((s) => ({ providerStatus: { ...s.providerStatus, [provider]: status } })),
      resetProviderStatus: () => set({ providerStatus: { gemini: 'idle', groq: 'idle', openrouter: 'idle' } }),
      lastUsedProvider: null,
      setLastUsedProvider: (provider) => set({ lastUsedProvider: provider }),
      groqQuotaPercent: null,
      setGroqQuotaPercent: (percent) => set({ groqQuotaPercent: percent }),

      settings: { ...DEFAULT_SETTINGS },
      setSettings: (s) => set((prev) => ({ settings: { ...prev.settings, ...s } })),

      history: [],
      addHistory: (record) => set((s) => {
        const cleanRecord = {
          ...record,
          formData: { ...record.formData, referencePhotos: [] },
        };
        const updated = [cleanRecord, ...s.history].slice(0, 50);
        return { history: updated };
      }),
      removeHistory: (id) => set((s) => ({ history: s.history.filter(r => r.id !== id) })),
      clearHistory: () => set({ history: [] }),

      customTemplates: [],
      addTemplate: (t) => set((s) => ({ customTemplates: [...s.customTemplates, t] })),
      removeTemplate: (id) => set((s) => ({ customTemplates: s.customTemplates.filter(t => t.id !== id) })),
      getPresetTemplates: () => PRESET_TEMPLATES as Template[],
    }),
    {
      name: 'viralframe-store',
      version: 2,
      // v1 -> v2: HistoryRecord.videoJSON berganti nama jadi { contentTypeId, output }.
      // Record lama tanpa contentTypeId diperlakukan sebagai 'short_video' — history/template lama tetap terbaca.
      migrate: (persistedState, version) => {
        const state = persistedState as { history?: Array<Record<string, unknown>> } | undefined;
        if (version < 2 && state?.history) {
          state.history = state.history.map((r) => {
            if ('contentTypeId' in r && 'output' in r) return r;
            const { videoJSON, ...rest } = r as Record<string, unknown> & { videoJSON?: VideoJSON | null };
            return { ...rest, contentTypeId: (r.contentTypeId as string) || 'short_video', output: videoJSON ?? null };
          });
        }
        return state;
      },
      partialize: (s) => ({
        settings: s.settings,
        history: s.history,
        customTemplates: s.customTemplates,
      }),
    }
  )
);
