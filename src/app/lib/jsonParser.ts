import { AI_TOOLS } from './maps';
import { VideoJSON } from '../types';

export function parseAiResponse(rawText: string): VideoJSON | null {
  // Step 1: try direct parse
  try { return JSON.parse(rawText) as VideoJSON; } catch {}

  // Step 2: auto-strip — find first { and last }
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(rawText.slice(start, end + 1)) as VideoJSON; } catch {}
  }

  return null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateVideoJSON(json: VideoJSON, expectedSceneCount: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const aiTool = json.video_metadata?.ai_video_tool || '';
  const toolInfo = AI_TOOLS.find(t => t.value === aiTool);
  const charLimit = toolInfo?.charLimit || 500;

  if (!json.video_metadata) errors.push('Field "video_metadata" tidak ditemukan.');
  if (!json.global_style) errors.push('Field "global_style" tidak ditemukan.');
  if (!json.character_sheet) errors.push('Field "character_sheet" tidak ditemukan.');
  if (!json.scenes || !Array.isArray(json.scenes)) {
    errors.push('Field "scenes" tidak ditemukan atau bukan array.');
  } else {
    if (json.scenes.length !== expectedSceneCount) {
      errors.push(`Jumlah scene tidak sesuai. Diharapkan ${expectedSceneCount}, dapat ${json.scenes.length}.`);
    }
    json.scenes.forEach((scene, i) => {
      if (!scene.ai_ready_prompt) errors.push(`Scene ${i + 1}: field "ai_ready_prompt" kosong.`);
      else if (scene.ai_ready_prompt.length > charLimit) {
        warnings.push(`Scene ${i + 1}: panjang prompt (${scene.ai_ready_prompt.length} chars) melebihi batas tool ${charLimit} chars.`);
      }
      if (scene.script_word_count > scene.max_words) {
        warnings.push(`Scene ${i + 1}: jumlah kata (${scene.script_word_count}) melebihi batas (${scene.max_words}).`);
      }
      if (!scene.script_narration) warnings.push(`Scene ${i + 1}: "script_narration" kosong.`);
    });
  }
  if (!json.production_notes) warnings.push('Field "production_notes" tidak ditemukan.');

  return { valid: errors.length === 0, errors, warnings };
}
