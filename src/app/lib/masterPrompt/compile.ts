import { FormData } from '../../types';
import { NICHE_DATA, AI_TOOL_FORMAT, AI_TOOLS, PLATFORM_BEHAVIOR } from '../maps';
import { CONTENT_STYLES } from '../contentStyles';
import { getLipsyncSpec } from '../lipsync';
import {
  getValidLocationRefs, getSceneLocationRef, buildReferenceImageJson, buildBindingSentence,
  buildPromptHintsSentence, buildCharacterBindingSentence, getCharacterRefFileName, sanitizeRefText,
} from '../locationRefs';
import { getSceneDurations, buildCharacterBlock, buildCharacterAnchor, BAHASA_LABEL, buildLangInstruction, buildContentGoalBlock, buildAdvancedBlocks } from './helpers';
import { CompileContext } from './context';
import { buildRoleBlock } from './buildRoleBlock';
import { buildContextBlock } from './buildContextBlock';
import { buildSpecBlock } from './buildSpecBlock';
import { buildViralBlock } from './buildViralBlock';
import { buildSchemaBlock } from './buildSchemaBlock';

export function compileMasterPrompt(form: FormData, narrationWPM: number = 165): string {
  const durations = getSceneDurations(form);
  const nicheData = NICHE_DATA[form.niche] || { psikografis: '-', painPoint: '-' };
  const toolData = AI_TOOLS.find(t => t.value === form.aiTool);
  const charLimit = toolData?.charLimit || 400;
  const toolFormat = AI_TOOL_FORMAT[form.aiTool] || '';
  const spokenLanguageLabel = BAHASA_LABEL[form.language] || 'Bahasa Indonesia';
  const effectiveStyle = CONTENT_STYLES.find(cs => cs.value === form.contentStyle) || CONTENT_STYLES.find(cs => cs.value === 'direct_response')!;

  const platformList = form.platforms.join(', ');
  const platformPrimer = form.platforms[0] || '-';
  const platformBehavior = PLATFORM_BEHAVIOR[platformPrimer] || '-';

  const sceneDurationTable = durations.map((d, i) => {
    const spec = getLipsyncSpec(d, narrationWPM);
    const type = effectiveStyle.getSceneRole(i, form.sceneCount, form);
    return `Scene ${i + 1} [${type}]: ${d}s → maks ${spec.maxWords} kata (${spec.pace}) — ${spec.instruction}`;
  }).join('\n');

  const characterBlock = buildCharacterBlock(form);
  const characterAnchor = buildCharacterAnchor(form);
  const isFacelessPov = form.talentStyle === 'faceless_pov';
  const characterSheetUsed = form.useCharacter || isFacelessPov;
  const hasLocation = !!form.locationDescription;

  const validLocationRefs = getValidLocationRefs(form);
  const sceneLocationRefTable = durations.map((_, i) => {
    const sceneNum = i + 1;
    const ref = getSceneLocationRef(validLocationRefs, sceneNum);
    if (!ref) return `Scene ${sceneNum}: reference_image = null (tidak ada foto referensi untuk scene ini).`;
    const label = ref.role === 'environment' ? 'lokasi' : 'produk';
    const hints = buildPromptHintsSentence(ref);
    return `Scene ${sceneNum}: reference_image WAJIB PERSIS ${buildReferenceImageJson(ref)} — ai_ready_prompt WAJIB sertakan kalimat singkat mengikuti pola ini: "${buildBindingSentence(ref)}" — bagian keterangan setelah nama file BOLEH diterjemahkan ke English presisi, TAPI nama file "${sanitizeRefText(ref.file)}" WAJIB persis tidak berubah sedikit pun. Deskripsi ${label} HANYA boleh berasal dari keterangan ini + label scene, JANGAN mengarang detail generik di luar itu (contoh larangan eksplisit: "a modern luxury house").${hints ? ` Panduan tambahan untuk area ini (terapkan ke camera_direction/ai_ready_prompt scene ini): ${hints}.` : ''}`;
  }).join('\n');
  const hasEnvironmentRef = validLocationRefs.some(r => r.role === 'environment');
  const scene1LocationRef = getSceneLocationRef(validLocationRefs, 1);
  const scene1RefJson = scene1LocationRef ? buildReferenceImageJson(scene1LocationRef) : 'null';

  const characterBindingSentence = buildCharacterBindingSentence(form);
  const characterLocationInstruction = (form.characterLocationNote?.trim() && getCharacterRefFileName(form))
    ? `\nLATAR/LOKASI KARAKTER (dari referensi foto karakter): ${form.characterLocationNote.trim()} — WAJIB konsisten sebagai environment/latar di SEMUA scene yang TIDAK punya referensi lokasi spesifik sendiri (locationRefs scene-specific TETAP prioritas lebih tinggi kalau ada). Terjemahkan ke English presisi saat menyertakan di ai_ready_prompt/visual_description tiap scene, ikuti pola terjemahan character anchor yang sudah ada.`
    : '';
  const characterRefInstruction = characterBindingSentence
    ? (isFacelessPov
      ? `\nCHARACTER REFERENCE PHOTO: The hands in every scene must match the attached reference photo "${sanitizeRefText(form.characterRefFile)}" exactly — same hands, skin tone, nails, and accessories. No face visible. CHARACTER ANCHOR STRING di atas TETAP menentukan detail deskriptif dan TETAP wajib jadi awalan setiap ai_ready_prompt; foto ini memperkuat konsistensi tangan, bukan menggantikan anchor. SETIAP ai_ready_prompt WAJIB menyertakan kalimat pengikat SINGKAT setelah character anchor: "${characterBindingSentence}" — tanpa kalimat ini, AI video tool (Google Flow dll) akan mengabaikan foto referensi dan mengarang ulang tangan/aksesorinya. Tetap jaga kalimat ini SINGKAT, batas ${charLimit} karakter per ai_ready_prompt tetap berlaku.${characterLocationInstruction}`
      : `\nCHARACTER REFERENCE PHOTO: Character must match the attached reference photo "${sanitizeRefText(form.characterRefFile)}" exactly — same face, hair, outfit/uniform, and body type. CHARACTER ANCHOR STRING di atas TETAP menentukan detail deskriptif dan TETAP wajib jadi awalan setiap ai_ready_prompt; foto ini memperkuat konsistensi wajah, bukan menggantikan anchor. SETIAP ai_ready_prompt WAJIB menyertakan kalimat pengikat SINGKAT setelah character anchor: "${characterBindingSentence}" — tanpa kalimat ini, AI video tool (Google Flow dll) akan mengabaikan foto referensi dan mengarang ulang wajah/seragam/pakaiannya. Tetap jaga kalimat ini SINGKAT, batas ${charLimit} karakter per ai_ready_prompt tetap berlaku.${characterLocationInstruction}`)
    : '';

  const langInstruction = buildLangInstruction(form.language);
  const contentGoalBlock = buildContentGoalBlock(form.contentGoal);
  const advancedBlocks = buildAdvancedBlocks(form);

  const ctx: CompileContext = {
    form, narrationWPM, durations, nicheData, effectiveStyle, charLimit, toolFormat,
    spokenLanguageLabel, platformList, platformPrimer, platformBehavior, sceneDurationTable,
    characterBlock, characterAnchor, isFacelessPov, characterSheetUsed, hasLocation,
    validLocationRefs, sceneLocationRefTable, hasEnvironmentRef, scene1RefJson,
    characterBindingSentence: characterBindingSentence ?? '', characterLocationInstruction, characterRefInstruction,
    langInstruction, contentGoalBlock, advancedBlocks,
  };

  return [
    buildRoleBlock(ctx),
    buildContextBlock(ctx),
    buildSpecBlock(ctx),
    buildViralBlock(ctx),
    buildSchemaBlock(ctx),
  ].join('');
}
