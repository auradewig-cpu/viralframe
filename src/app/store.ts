import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FormData, AppSettings, HistoryRecord, Template, DEFAULT_FORM, DEFAULT_SETTINGS } from './types';
import { PRESET_TEMPLATES } from './lib/maps';
import { migratePersistedState } from './lib/storeMigrations';

// String literal, BUKAN import dari lib/registry — registry entries (mis. youtubeLong.tsx) mengimpor
// useAppStore dari file ini, jadi mengimpor balik dari registry di sini akan membuat circular import.
const DEFAULT_CONTENT_TYPE_ID = 'short_video';

export type ProviderKey = 'gemini' | 'groq' | 'openrouter';
export type ProviderStatus = 'idle' | 'trying' | 'success' | 'failed';

interface AppState {
  // Form
  formData: FormData;
  currentStep: number;
  activeContentTypeId: string;
  setActiveContentTypeId: (id: string) => void;
  setFormData: (data: Partial<FormData>) => void;
  setCurrentStep: (step: number) => void;
  resetForm: () => void;
  loadFormData: (data: FormData) => void;

  // Output
  generatedOutput: { contentTypeId: string; data: unknown } | null;
  masterPrompt: string;
  isGenerating: boolean;
  generateProgress: string;
  generateError: string;
  generateWarnings: string;
  // Struktur per-scene (scene_number -> daftar masalah) — dipakai badge Flagged/OK di SceneCard
  // (Tugas 2). generateWarnings (string gabungan) TETAP ada & dipakai banner warning yang sudah ada;
  // dua-duanya diisi dari sumber yang sama saat generate selesai, tidak saling menggantikan.
  generateWarningsByScene: Record<number, string[]>;
  setGeneratedOutput: (contentTypeId: string, data: unknown) => void;
  setMasterPrompt: (prompt: string) => void;
  setIsGenerating: (v: boolean) => void;
  setGenerateProgress: (msg: string) => void;
  setGenerateError: (err: string) => void;
  setGenerateWarnings: (w: string) => void;
  setGenerateWarningsByScene: (m: Record<number, string[]>) => void;
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
  currentHistoryId: string | null;
  setCurrentHistoryId: (id: string | null) => void;
  addHistory: (record: HistoryRecord) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  // Dipakai regenerate per-scene (Tugas 1) — update output record history yang sedang ditampilkan
  // tanpa membuat record baru. Kalau tidak ada currentHistoryId yang cocok (mis. history dihapus
  // manual di tab lain), diam-diam no-op — generatedOutput di store tetap ter-update duluan oleh caller.
  updateHistoryOutput: (id: string, output: unknown) => void;

  // Templates
  customTemplates: Template[];
  addTemplate: (t: Template) => void;
  removeTemplate: (id: string) => void;
  getPresetTemplates: () => Template[];

  // Preview + blob foto Referensi Visual (Step1Business) — key = sourceName (nama file ASLI upload,
  // permanen, lihat LocationRef.sourceName). NON-persist dengan sengaja (blob URL mati begitu tab
  // ditutup/reload) — lihat partialize di bawah. Foto TIDAK pernah disimpan base64/localStorage di
  // jalur ini. blob disimpan (bukan cuma url) supaya bisa di-ZIP langsung oleh Download Bahan.
  referenceFiles: Record<string, { url: string; blob: Blob }>;
  setReferenceFile: (sourceName: string, url: string, blob: Blob) => void;
  removeReferenceFile: (sourceName: string) => void;
  // Dipakai tombol "Bersihkan semua foto tersimpan" di Settings (Tugas 3) — kosongkan preview/blob
  // sesi SAJA, dipasangkan dengan refImageDB.clearAll() di pemanggil untuk hapus salinan IndexedDB.
  clearReferenceFiles: () => void;
  // true selama hydration dari IndexedDB berjalan (lib/referenceHydration.ts) — dipakai Step1Business
  // & DirectPanel untuk menahan sebentar tombol Download Bahan supaya tidak menghasilkan ZIP yang
  // foto referensinya belum lengkap ter-restore.
  referenceHydrating: boolean;
  setReferenceHydrating: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      formData: { ...DEFAULT_FORM },
      currentStep: 0,
      activeContentTypeId: DEFAULT_CONTENT_TYPE_ID,
      setActiveContentTypeId: (id) => set({ activeContentTypeId: id }),
      setFormData: (data) => set((s) => ({ formData: { ...s.formData, ...data } })),
      setCurrentStep: (step) => set({ currentStep: step }),
      resetForm: () => set({ formData: { ...DEFAULT_FORM }, currentStep: 0, activeContentTypeId: DEFAULT_CONTENT_TYPE_ID, generatedOutput: null, masterPrompt: '', generateError: '', generateWarnings: '', generateWarningsByScene: {}, generateProgressPercent: 0, providerStatus: { gemini: 'idle', groq: 'idle', openrouter: 'idle' }, lastUsedProvider: null, groqQuotaPercent: null }),
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
        generateWarningsByScene: {},
      }),

      generatedOutput: null,
      masterPrompt: '',
      isGenerating: false,
      generateProgress: '',
      generateError: '',
      generateWarnings: '',
      generateWarningsByScene: {},
      setGeneratedOutput: (contentTypeId, data) => set({ generatedOutput: data ? { contentTypeId, data } : null }),
      setMasterPrompt: (prompt) => set({ masterPrompt: prompt }),
      setIsGenerating: (v) => set({ isGenerating: v }),
      setGenerateProgress: (msg) => set({ generateProgress: msg }),
      setGenerateError: (err) => set({ generateError: err }),
      setGenerateWarnings: (w) => set({ generateWarnings: w }),
      setGenerateWarningsByScene: (m) => set({ generateWarningsByScene: m }),
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
      currentHistoryId: null,
      setCurrentHistoryId: (id) => set({ currentHistoryId: id }),
      addHistory: (record) => set((s) => {
        const cleanRecord = {
          ...record,
          formData: { ...record.formData, referencePhotos: [] },
        };
        const updated = [cleanRecord, ...s.history].slice(0, 50);
        return { history: updated, currentHistoryId: record.id };
      }),
      removeHistory: (id) => set((s) => ({ history: s.history.filter(r => r.id !== id) })),
      clearHistory: () => set({ history: [] }),
      updateHistoryOutput: (id, output) => set((s) => ({
        history: s.history.map(r => r.id === id ? { ...r, output } : r),
      })),

      customTemplates: [],
      addTemplate: (t) => set((s) => ({ customTemplates: [...s.customTemplates, t] })),
      removeTemplate: (id) => set((s) => ({ customTemplates: s.customTemplates.filter(t => t.id !== id) })),
      getPresetTemplates: () => PRESET_TEMPLATES as Template[],

      referenceFiles: {},
      setReferenceFile: (sourceName, url, blob) => set((s) => ({ referenceFiles: { ...s.referenceFiles, [sourceName]: { url, blob } } })),
      removeReferenceFile: (sourceName) => set((s) => {
        const entry = s.referenceFiles[sourceName];
        if (entry) URL.revokeObjectURL(entry.url);
        const rest = { ...s.referenceFiles };
        delete rest[sourceName];
        return { referenceFiles: rest };
      }),
      clearReferenceFiles: () => set((s) => {
        Object.values(s.referenceFiles).forEach(entry => URL.revokeObjectURL(entry.url));
        return { referenceFiles: {} };
      }),
      referenceHydrating: false,
      setReferenceHydrating: (v) => set({ referenceHydrating: v }),
    }),
    {
      name: 'viralframe-store',
      version: 2,
      // v1 -> v2: HistoryRecord.videoJSON berganti nama jadi { contentTypeId, output }.
      // Record lama tanpa contentTypeId diperlakukan sebagai 'short_video' — history/template lama tetap terbaca.
      migrate: (persistedState, storedVersion) => {
        return migratePersistedState(persistedState as Record<string, unknown>, storedVersion);
      },
      partialize: (s) => ({
        settings: s.settings,
        history: s.history,
        customTemplates: s.customTemplates,
      }),
      onRehydrateStorage: () => () => {
        const s = useAppStore.getState();
        if (s.settings?.geminiImageModel === 'gemini-2.0-flash-exp-image-generation') {
          s.setSettings({ geminiImageModel: DEFAULT_SETTINGS.geminiImageModel });
        }
      },
    }
  )
);
