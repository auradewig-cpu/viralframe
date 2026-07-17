import { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { generateWithFallback, ApiCallError, ProgressEvent } from '../lib/apiClient';
import { validateFormData, getFormWarnings } from '../lib/validation';
import { getContentType } from '../lib/registry';
import { getSceneIssuesMap } from '../lib/sceneStatus';
import { VideoJSON } from '../types';

// Persentase progress per (provider, stage) — dibaca dari ProgressEvent terstruktur apiClient,
// BUKAN dari parsing teks pesan (pola lama yang rusak diam-diam saat label provider berubah).
const PROGRESS_PERCENT: Record<string, number> = {
  'gemini:calling': 15, 'gemini:parsing': 40, 'gemini:retrying': 42, 'gemini:failed': 45,
  'groq:calling': 55, 'groq:parsing': 70, 'groq:retrying': 60, 'groq:failed': 75,
  'openrouter:calling': 80, 'openrouter:parsing': 90, 'openrouter:retrying': 85,
};

export function useGenerationPipeline() {
  const formData = useAppStore(s => s.formData);
  const setFormData = useAppStore(s => s.setFormData);
  const activeContentTypeId = useAppStore(s => s.activeContentTypeId);
  const contentType = getContentType(activeContentTypeId);
  const isShortVideo = contentType.id === 'short_video';
  const generatedOutput = useAppStore(s => s.generatedOutput);
  const setGeneratedOutput = useAppStore(s => s.setGeneratedOutput);
  const masterPrompt = useAppStore(s => s.masterPrompt);
  const setMasterPrompt = useAppStore(s => s.setMasterPrompt);
  const isGenerating = useAppStore(s => s.isGenerating);
  const setIsGenerating = useAppStore(s => s.setIsGenerating);
  const setGenerateProgress = useAppStore(s => s.setGenerateProgress);
  const generateError = useAppStore(s => s.generateError);
  const setGenerateError = useAppStore(s => s.setGenerateError);
  const generateWarnings = useAppStore(s => s.generateWarnings);
  const setGenerateWarnings = useAppStore(s => s.setGenerateWarnings);
  const setGenerateWarningsByScene = useAppStore(s => s.setGenerateWarningsByScene);
  const generateProgressPercent = useAppStore(s => s.generateProgressPercent);
  const setGenerateProgressPercent = useAppStore(s => s.setGenerateProgressPercent);
  const providerStatus = useAppStore(s => s.providerStatus);
  const setProviderStatus = useAppStore(s => s.setProviderStatus);
  const resetProviderStatus = useAppStore(s => s.resetProviderStatus);
  const lastUsedProvider = useAppStore(s => s.lastUsedProvider);
  const setLastUsedProvider = useAppStore(s => s.setLastUsedProvider);
  const groqQuotaPercent = useAppStore(s => s.groqQuotaPercent);
  const setGroqQuotaPercent = useAppStore(s => s.setGroqQuotaPercent);
  const settings = useAppStore(s => s.settings);
  const addHistory = useAppStore(s => s.addHistory);

  const [showModeSelector, setShowModeSelector] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [showOutput, setShowOutput] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const currentProviderRef = useRef<'gemini' | 'groq' | 'openrouter' | null>(null);

  const handleGenerate = async (mode: 'direct' | 'manual') => {
    setFormData({ mode });
    setGenerateError('');
    setGenerateWarnings('');
    setGenerateProgressPercent(0);
    resetProviderStatus();
    setLastUsedProvider(null);
    setGroqQuotaPercent(null);
    currentProviderRef.current = null;
    setFormErrors([]);

    const prompt = contentType.buildMasterPrompt({ ...formData, mode }, settings.narrationWPM || 165);
    setMasterPrompt(prompt);

    if (mode === 'manual') {
      setShowOutput(true);
      return;
    }

    setIsGenerating(true);
    setShowOutput(true);
    try {
      const keys = {
        gemini: settings.geminiApiKey,
        groq: settings.groqApiKey,
        openrouter: settings.openrouterApiKey,
      };
      const onProgress = (ev: ProgressEvent) => {
        setGenerateProgress(ev.message);
        if (!ev.provider) return;
        currentProviderRef.current = ev.provider;
        const status = ev.stage === 'failed' ? 'failed' : ev.stage === 'success' ? 'success' : 'trying';
        setProviderStatus(ev.provider, status);
        const percent = ev.stage === 'success' ? 95 : PROGRESS_PERCENT[`${ev.provider}:${ev.stage}`];
        if (percent !== undefined) setGenerateProgressPercent(percent);
      };
      let json = await generateWithFallback(prompt, keys, contentType.parseOutput, onProgress, (percent) => setGroqQuotaPercent(percent), settings.geminiModel || 'gemini-3.5-flash', settings.providerOrder);
      if (json) contentType.applyPostProcess?.(json, formData);

      let validation = contentType.validateOutput(json, formData);
      let policyMsgs = contentType.checkPolicy(json, formData);

      if (!validation.valid || validation.warnings.length > 0 || policyMsgs.length > 0) {
        const problems = [...validation.errors, ...validation.warnings, ...policyMsgs];
        try {
          setGenerateProgress('Memperbaiki output yang tidak sesuai aturan...');
          setGenerateProgressPercent(96);
          const repairPrompt = contentType.buildRepairPrompt(json, problems, formData);
          const repaired = await generateWithFallback(repairPrompt, keys, contentType.parseOutput, () => {}, undefined, settings.geminiModel || 'gemini-3.5-flash', settings.providerOrder);
          if (repaired) {
            contentType.applyPostProcess?.(repaired, formData);
            const revalidation = contentType.validateOutput(repaired, formData);
            const rePolicyMsgs = contentType.checkPolicy(repaired, formData);
            const before = problems.length;
            const after = revalidation.errors.length + revalidation.warnings.length + rePolicyMsgs.length;
            if (revalidation.valid && after < before) {
              json = repaired;
              validation = revalidation;
              policyMsgs = rePolicyMsgs;
            }
          }
        } catch {
          // Repair gagal — tetap pakai hasil pertama
        }
      }

      setGenerateProgressPercent(100);
      if (currentProviderRef.current) setLastUsedProvider(currentProviderRef.current);
      setGeneratedOutput(contentType.id, json);
      const allMsgs = [...validation.errors, ...validation.warnings, ...policyMsgs];
      setGenerateWarnings(allMsgs.length > 0 ? allMsgs.join('\n') : '');
      setGenerateWarningsByScene(contentType.id === 'short_video' ? getSceneIssuesMap(json as VideoJSON, formData) : {});
      addHistory({
        id: Date.now().toString(),
        timestamp: Date.now(),
        label: contentType.getHistoryLabel?.(formData) || formData.productDescription.slice(0, 50) || 'Generate tanpa judul',
        formData: { ...formData, mode },
        masterPrompt: prompt,
        contentTypeId: contentType.id,
        output: json,
      });
    } catch (e: unknown) {
      const err = e as ApiCallError;
      let msg = err.message || 'Terjadi kesalahan tidak diketahui.';
      if (err.code === 'JSON_PARSE_ERROR' && contentType.id === 'content_calendar') {
        const slots = formData.calendarDays * formData.postsPerDay;
        if (slots > 40) msg += ' Kemungkinan output terpotong — kurangi jumlah hari/post (saat ini ' + slots + ' slot).';
      }
      setGenerateError(msg);
    } finally {
      setIsGenerating(false);
      setGenerateProgress('');
    }
  };

  const handleGenerateClick = () => {
    if (isShortVideo) {
      const errors = validateFormData(formData as unknown as Record<string, unknown>);
      setFormErrors(errors);
      if (errors.length > 0) return;

      const warnings = getFormWarnings(formData as unknown as Record<string, unknown>);
      const warningList: string[] = [];
      if (warnings.hookDurationWarning) warningList.push(warnings.hookDurationWarning);
      if (warnings.totalDurationWarning) warningList.push(warnings.totalDurationWarning);
      if (warnings.locationRefWarning) warningList.push(warnings.locationRefWarning);
      if (warnings.propertyTourWarning) warningList.push(warnings.propertyTourWarning);
      const hasApiKey = !!(settings.geminiApiKey || settings.groqApiKey || settings.openrouterApiKey);
      if (!hasApiKey) warningList.push('API key belum dikonfigurasi. Konfigurasi di Settings atau gunakan Manual Prompt Mode.');
      setFormWarnings(warningList);
    } else if (contentType.validateForm) {
      // Content type single-page: validasi field inti sebelum generate — tanpa ini, prompt
      // ter-compile dengan topik/niche kosong dan membakar kuota untuk output tak berguna.
      const errors = contentType.validateForm(formData);
      setFormErrors(errors);
      if (errors.length > 0) return;
    }

    const hasApiKey = !!(settings.geminiApiKey || settings.groqApiKey || settings.openrouterApiKey);
    if (settings.defaultMode === 'direct' && hasApiKey) {
      handleGenerate('direct');
    } else if (settings.defaultMode === 'manual') {
      handleGenerate('manual');
    } else {
      setShowModeSelector(true);
    }
  };

  const handleJsonValidated = (json: unknown) => {
    contentType.applyPostProcess?.(json, formData);
    setGeneratedOutput(contentType.id, json);
    setGenerateWarningsByScene(contentType.id === 'short_video' ? getSceneIssuesMap(json as VideoJSON, formData) : {});
    addHistory({
      id: Date.now().toString(),
      timestamp: Date.now(),
      label: contentType.getHistoryLabel?.(formData) || formData.productDescription.slice(0, 50) || 'Generate Manual Mode',
      formData: { ...formData },
      masterPrompt,
      contentTypeId: contentType.id,
      output: json,
    });
  };

  const handleRegenerate = () => {
    setGeneratedOutput(contentType.id, null);
    setGenerateWarnings('');
    setShowOutput(false);
    handleGenerate(formData.mode);
  };

  const handleEdit = () => {
    setGeneratedOutput(contentType.id, null);
    setShowOutput(false);
  };

  return {
    contentType,
    isShortVideo,
    generatedOutput,
    masterPrompt,
    isGenerating,
    generateError,
    generateWarnings,
    generateProgressPercent,
    providerStatus,
    lastUsedProvider,
    groqQuotaPercent,
    settings,
    formData,
    showModeSelector, setShowModeSelector,
    formErrors, setFormErrors,
    formWarnings, setFormWarnings,
    showOutput, setShowOutput,
    showSaveTemplate, setShowSaveTemplate,
    handleGenerateClick,
    handleGenerate,
    handleJsonValidated,
    handleRegenerate,
    handleEdit,
  };
}
