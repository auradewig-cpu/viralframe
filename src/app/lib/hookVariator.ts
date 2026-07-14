import { FormData, VideoJSON, SceneData } from '../types';
import { getLipsyncSpec } from './lipsync';
import { AI_TOOLS, NICHE_DATA, AI_TOOL_FORMAT } from './maps';
import { CONTENT_STYLES } from './contentStyles';
import { NEGATIVE_PROMPT_BLOCK, SPOKEN_NUMBER_RULE } from './negativePrompt';
import { countWords, ValidationResult } from './jsonParser';
import { parseJsonResponse } from './registry/shared';
import {
  getValidLocationRefs, getSceneLocationRef, buildReferenceImageJson, buildBindingSentence, buildPromptHintsSentence,
  buildCharacterBindingSentence, getCharacterRefFileName,
} from './locationRefs';

export interface HookVariantsOutput {
  variants: SceneData[];
}

export function buildHookVariantsPrompt(videoJSON: VideoJSON, form: FormData, narrationWPM: number = 165, variantCount: number = 3): string {
  const scene = videoJSON.scenes[0];
  const exp = buildHookExpectation(videoJSON, form, narrationWPM);
  const currentHookType = scene.viral_element_in_scene || 'unknown';
  const nicheData = NICHE_DATA[form.niche] || { psikografis: '-', painPoint: '-' };
  const effectiveStyle = CONTENT_STYLES.find(cs => cs.value === form.contentStyle) || CONTENT_STYLES.find(cs => cs.value === 'direct_response')!;
  const spec = getLipsyncSpec(scene.duration_seconds, narrationWPM);

  const contentGoalNote = form.contentGoal === 'growth'
    ? 'TUJUAN KONTEN: Growth akun — TANPA bahasa jualan, hook ke save/follow.'
    : form.contentGoal === 'engagement'
      ? 'TUJUAN KONTEN: Engagement — pancing komentar/interaksi.'
      : 'TUJUAN KONTEN: Konversi — CTA sesuai gaya konten standar.';

  const hookTypeList = [
    'shock_fact', 'open_question', 'bold_claim', 'before_after_teaser',
    'pain_point_attack', 'secret_reveal', 'pattern_interrupt', 'social_proof_number',
    'controversy', 'fomo', 'story_in_progress', 'visual_shock',
  ].filter(t => t !== currentHookType).join(', ');

  return `Kamu adalah AI video prompt engineer yang membuat VARIASI HOOK untuk scene 1 dari video pendek.
Tugasmu: output ${variantCount} varian scene 1, masing-masing dengan TEKNIK HOOK BERBEDA dari daftar di bawah.

INSTRUKSI KRITIS: Output kamu HANYA objek JSON: { "variants": [ <SceneData>, ... ] }. Mulai {, akhiri }.
Tidak ada teks lain, tidak ada markdown wrapper.

[KONTEKS RINGKAS]
NICHE: ${form.niche}
PRODUK/LAYANAN: ${form.productDescription}
PSIKOGRAFIS: ${nicheData.psikografis}
GAYA KONTEN: ${effectiveStyle.label}
${contentGoalNote}
AI TOOL: ${form.aiTool} — batas karakter ai_ready_prompt: ${exp.charLimit}
BAHASA NARASI: ${form.language}

[SCENE 1 — SAAT INI (jadikan konteks, JANGAN disalin)]
Teknik hook saat ini: ${currentHookType}
Narasi: "${scene.script_narration || ''}"
Prompt: ${scene.ai_ready_prompt || ''}

Scene ini TIDAK BOLEH diubah nilai-nilainya: scene_number=${exp.sceneNumber}, duration_seconds=${exp.durationSeconds}, max_words=${exp.maxWords}, scene_type="${scene.scene_type}", speech_pace="${scene.speech_pace}".

[GLOBAL STYLE — LOCKED]
${JSON.stringify(videoJSON.global_style, null, 2)}

${videoJSON.character_sheet?.used ? `[CHARACTER ANCHOR — VERBATIM]
'${exp.characterAnchor}'
ai_ready_prompt SETIAP varian WAJIB dimulai dengan string ini PERSIS kata per kata.` : ''}
${exp.characterBindingSentence ? `\n[CHARACTER BINDING — WAJIB] SETIAP ai_ready_prompt WAJIB menyertakan: "${exp.characterBindingSentence}"` : ''}

[REFERENCE IMAGE — SALIN PERSIS]
${exp.locationRef
    ? `reference_image PERSIS: ${buildReferenceImageJson(exp.locationRef)}. ai_ready_prompt sertakan: "${buildBindingSentence(exp.locationRef)}".`
    : (scene.reference_image ? `reference_image salin verbatim: ${JSON.stringify(scene.reference_image)}` : 'reference_image = null')}

[TEKNIK HOOK — PERSIS ${variantCount} VARIAN, @@@ MASING-MASING TEKNIK BERBEDA @@@]
Daftar teknik hook yang BOLEH dipakai (JANGAN pakai teknik yang sama dengan scene 1 saat ini "${currentHookType}"):
${hookTypeList}

WAJIB:
- ${variantCount} varian, masing-masing teknik HOOK BERBEDA dari daftar di atas (JANGAN ulangi).
- HOOK FRONT-LOADED: kalimat pertama script_narration = inti hook langsung, BUKAN basa-basi.
- viral_element_in_scene tiap varian menyebut teknik hook yang dipakai.
- scene_number, duration_seconds, max_words TIDAK BOLEH berubah.
- Jumlah kata script_narration aktual: 85%-100% dari ${exp.maxWords} kata.

${NEGATIVE_PROMPT_BLOCK}
${SPOKEN_NUMBER_RULE}

[OUTPUT — ARRAY ${variantCount} SceneData]
{ "variants": [
  // scene 1 varian 1 (teknik A)
  // scene 1 varian 2 (teknik B)
  // scene 1 varian 3 (teknik C)
] }`;
}

export function buildHookExpectation(videoJSON: VideoJSON, form: FormData, narrationWPM: number) {
  const scene = videoJSON.scenes[0];
  const spec = getLipsyncSpec(scene.duration_seconds, narrationWPM);
  const toolInfo = AI_TOOLS.find(t => t.value === (form.aiTool || videoJSON.video_metadata?.ai_video_tool));
  const characterAnchor = videoJSON.character_sheet?.used ? (videoJSON.character_sheet.description || '').trim() : '';
  const locationRef = getSceneLocationRef(getValidLocationRefs(form), scene.scene_number);
  return {
    sceneNumber: scene.scene_number,
    durationSeconds: scene.duration_seconds,
    maxWords: spec.maxWords,
    charLimit: toolInfo?.charLimit || 400,
    characterAnchor,
    locationRef,
    characterBindingSentence: buildCharacterBindingSentence(form),
    characterRefFileName: getCharacterRefFileName(form),
  };
}

export function parseHookVariantsResponse(rawText: string): HookVariantsOutput | null {
  return parseJsonResponse<HookVariantsOutput>(rawText);
}

export function validateHookVariants(output: HookVariantsOutput, expectedCount: number, expectation: ReturnType<typeof buildHookExpectation>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!output.variants || !Array.isArray(output.variants)) {
    errors.push('Field "variants" tidak ditemukan atau bukan array.');
    return { valid: false, errors, warnings };
  }

  if (output.variants.length !== expectedCount) {
    errors.push(`Jumlah varian tidak sesuai. Diharapkan ${expectedCount}, dapat ${output.variants.length}.`);
  }

  // Validasi tiap varian, tandai per-varian
  const perVariantErrors: string[] = [];
  output.variants.forEach((v, i) => {
    const requiredFields: (keyof SceneData)[] = ['ai_ready_prompt', 'script_narration', 'visual_description', 'camera_direction'];
    const fieldErrors: string[] = [];
    requiredFields.forEach(f => { if (!v[f]) fieldErrors.push(`Field "${f}" kosong.`); });
    if (v.scene_number !== expectation.sceneNumber) fieldErrors.push(`scene_number berubah.`);
    if (v.duration_seconds !== expectation.durationSeconds) fieldErrors.push(`duration_seconds berubah.`);
    if (v.max_words !== expectation.maxWords) fieldErrors.push(`max_words berubah.`);
    // Varian yang merusak konsistensi karakter TIDAK boleh bisa di-splice — tidak ada repair loop
    // di jalur ini, jadi anchor/binding yang rusak digating sebagai error per-varian (bukan warning
    // seperti di sceneRegen yang masih punya kesempatan repair).
    if (expectation.characterAnchor && v.ai_ready_prompt && !v.ai_ready_prompt.startsWith(expectation.characterAnchor)) {
      fieldErrors.push('ai_ready_prompt tidak diawali character anchor verbatim.');
    }
    if (expectation.characterRefFileName && v.ai_ready_prompt && !v.ai_ready_prompt.includes(expectation.characterRefFileName)) {
      fieldErrors.push(`ai_ready_prompt tidak menyebut foto karakter "${expectation.characterRefFileName}".`);
    }

    if (v.ai_ready_prompt && v.ai_ready_prompt.length > expectation.charLimit) {
      warnings.push(`Varian ${i + 1}: prompt ${v.ai_ready_prompt.length} chars melebihi batas ${expectation.charLimit}.`);
    }

    if (v.script_narration && expectation.maxWords > 0) {
      const actual = countWords(v.script_narration);
      if (actual > expectation.maxWords) {
        warnings.push(`Varian ${i + 1}: narasi ${actual} kata melebihi batas ${expectation.maxWords}.`);
      }
    }

    if (fieldErrors.length > 0) {
      perVariantErrors.push(`Varian ${i + 1}: ${fieldErrors.join('; ')}`);
    }
  });

  if (perVariantErrors.length === output.variants.length) {
    // Semua varian invalid
    errors.push(`Semua ${output.variants.length} varian tidak valid. ${perVariantErrors.join(' | ')}`);
  } else if (perVariantErrors.length > 0) {
    warnings.push(`Beberapa varian tidak valid dan tidak akan ditampilkan: ${perVariantErrors.join(' | ')}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
