import { FormData, VideoJSON, SceneData } from '../types';
import { getLipsyncSpec } from './lipsync';
import { AI_TOOLS, NICHE_DATA, AI_TOOL_FORMAT } from './maps';
import { CONTENT_STYLES } from './contentStyles';
import { NEGATIVE_PROMPT_BLOCK, CAMERA_REF_RULE, SPOKEN_NUMBER_RULE } from './negativePrompt';
import { ValidationResult } from './jsonParser';
import { checkScene } from './sceneChecks';
import { parseJsonResponse } from './registry/shared';
import {
  getValidLocationRefs, getSceneLocationRef, buildReferenceImageJson, buildBindingSentence, buildPromptHintsSentence,
  buildCharacterBindingSentence, getCharacterRefFileName, ResolvedLocationRef,
} from './locationRefs';

// Fondasi Tugas 1 — regenerate SATU scene tanpa membakar quota untuk scene lain yang sudah bagus.
// Bukan bagian dari registry/shortVideo.tsx supaya bisa dipakai langsung dari komponen output
// (SceneCard/DirectPanel) tanpa melewati alur buildMasterPrompt/validateOutput full-video.

export interface SceneRegenExpectation {
  sceneNumber: number;
  durationSeconds: number;
  maxWords: number;
  charLimit: number;
  characterAnchor: string;
  locationRef: ResolvedLocationRef | null;
  characterBindingSentence: string | null;
  characterRefFileName: string;
  aiTool: string;
}

export function getSceneRegenExpectation(videoJSON: VideoJSON, sceneIndex: number, form: FormData, narrationWPM: number): SceneRegenExpectation {
  const scene = videoJSON.scenes[sceneIndex];
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
    aiTool: form.aiTool || videoJSON.video_metadata?.ai_video_tool || '',
  };
}

export function buildSceneRegenPrompt(videoJSON: VideoJSON, sceneIndex: number, form: FormData, narrationWPM: number = 165): string {
  const scene = videoJSON.scenes[sceneIndex];
  const prevScene = sceneIndex > 0 ? videoJSON.scenes[sceneIndex - 1] : null;
  const nextScene = sceneIndex < videoJSON.scenes.length - 1 ? videoJSON.scenes[sceneIndex + 1] : null;
  const exp = getSceneRegenExpectation(videoJSON, sceneIndex, form, narrationWPM);
  const nicheData = NICHE_DATA[form.niche] || { psikografis: '-', painPoint: '-' };
  const effectiveStyle = CONTENT_STYLES.find(cs => cs.value === form.contentStyle) || CONTENT_STYLES.find(cs => cs.value === 'direct_response')!;
  const toolFormat = AI_TOOL_FORMAT[form.aiTool] || '';
  const spec = getLipsyncSpec(scene.duration_seconds, narrationWPM);

  const contentGoalNote = form.contentGoal === 'growth'
    ? 'TUJUAN KONTEN: Growth akun — TANPA bahasa jualan, hook ke save/follow.'
    : form.contentGoal === 'engagement'
      ? 'TUJUAN KONTEN: Engagement — pancing komentar/interaksi.'
      : 'TUJUAN KONTEN: Konversi — CTA sesuai gaya konten standar.';

  return `Kamu adalah AI video prompt engineer yang meregenerate SATU scene dari sebuah video pendek,
tanpa mengubah scene lain. Scene lain SUDAH FINAL dan menjadi konteks yang WAJIB kamu ikuti persis.

INSTRUKSI KRITIS: Output kamu HANYA satu objek JSON scene tunggal (skema SceneData persis, BUKAN
array, BUKAN dibungkus objek lain). Mulai dengan { dan akhiri dengan }. Tidak ada teks lain, tidak
ada markdown wrapper seperti \`\`\`json.

[KONTEKS RINGKAS]
NICHE: ${form.niche}
PRODUK/LAYANAN: ${form.productDescription}
PSIKOGRAFIS: ${nicheData.psikografis}
GAYA KONTEN: ${effectiveStyle.label} — ${effectiveStyle.narrativeVoiceGuidance}
${contentGoalNote}
AI TOOL: ${form.aiTool} — batas karakter ai_ready_prompt: ${exp.charLimit}. Format: ${toolFormat}
BAHASA NARASI: ${form.language}

[SCENE YANG DIREGENERATE]
Scene number: ${exp.sceneNumber} (scene_type: "${scene.scene_type}")
Durasi: ${exp.durationSeconds} detik — TIDAK BOLEH berubah.
Max words narasi: ${exp.maxWords} kata (dihitung ulang dari durasi via lipsync spec, TIDAK BOLEH berubah) — ${spec.instruction}

[GLOBAL STYLE — LOCKED CONTEXT, WAJIB DIIKUTI PERSIS]
${JSON.stringify(videoJSON.global_style, null, 2)}

${videoJSON.character_sheet?.used ? `[CHARACTER SHEET — VERBATIM, WAJIB JADI AWALAN ai_ready_prompt]
'${exp.characterAnchor}'
Definisi (ikuti pola consistency_note): ai_ready_prompt scene baru WAJIB dimulai dengan string ini
PERSIS kata per kata, baru kemudian deskripsi aksi scene. Tanpa anchor identik, karakter akan
terlihat berbeda dari scene lain di video yang sama.` : ''}
${exp.characterBindingSentence ? `\n[CHARACTER REFERENCE PHOTO — WAJIB]\nai_ready_prompt scene baru WAJIB menyertakan kalimat pengikat SINGKAT setelah character anchor: "${exp.characterBindingSentence}" — tanpa kalimat ini, AI video tool mengabaikan foto referensi karakter. Tetap jaga SINGKAT, batas ${exp.charLimit} karakter tetap berlaku.` : ''}

${prevScene ? `[PREVIOUS SCENE ANCHOR — scene ${prevScene.scene_number}, JANGAN diubah, hanya konteks]
${JSON.stringify(prevScene, null, 2)}
Scene baru WAJIB nyambung secara natural dari transition_to_next scene ini — jangan buat lompatan
visual/narasi yang janggal.` : '[Scene ini adalah scene PERTAMA — tidak ada scene sebelumnya.]'}

${nextScene ? `[NEXT SCENE ANCHOR — scene ${nextScene.scene_number}, JANGAN diubah, hanya konteks]
${JSON.stringify(nextScene, null, 2)}
cliffhanger_to_next pada scene baru WAJIB mengarah masuk akal ke scene ini — jaga kontinuitas
visual/lighting/wardrobe supaya transisi ke scene ini tetap mulus.` : '[Scene ini adalah scene TERAKHIR — tidak ada scene sesudahnya.]'}

[REFERENCE IMAGE]
${exp.locationRef
    ? `Scene ini WAJIB pakai reference_image PERSIS: ${buildReferenceImageJson(exp.locationRef)}\nai_ready_prompt WAJIB sertakan kalimat singkat mengikuti pola ini: "${buildBindingSentence(exp.locationRef)}" — bagian keterangan setelah nama file BOLEH diterjemahkan ke English presisi, TAPI nama file "${exp.locationRef.file}" WAJIB persis tidak berubah sedikit pun. Deskripsi ${exp.locationRef.role === 'environment' ? 'lokasi' : 'produk'} HANYA boleh dari keterangan ini + label scene, JANGAN mengarang detail generik di luar itu.${buildPromptHintsSentence(exp.locationRef) ? `\nPanduan tambahan untuk area ini (terapkan ke camera_direction/ai_ready_prompt): ${buildPromptHintsSentence(exp.locationRef)}.` : ''}`
    : (scene.reference_image ? `WAJIB disalin verbatim persis seperti ini ke field "reference_image" scene baru:\n${JSON.stringify(scene.reference_image, null, 2)}` : 'Tidak ada reference_image di scene ini — field "reference_image" tetap null.')}
${exp.locationRef?.role === 'environment' ? `\n${CAMERA_REF_RULE}` : ''}

${(exp.aiTool === 'google_flow' || exp.aiTool === 'veo3')
    ? `[AUDIO/DIALOG — WAJIB untuk ${exp.aiTool}]\nSetelah deskripsi visual scene selesai, ai_ready_prompt WAJIB sisipkan dialog sebagai kalimat TERKUTIP LANGSUNG persis begini: [Subjek] says, "<script_narration WORD-FOR-WORD, SAMA PERSIS dengan field script_narration, JANGAN diterjemahkan/diparafrase>" (no subtitles). Ini konvensi RESMI Veo3 — model menyimpulkan bahasa ucapan dari ISI kalimat yang ditulis di dalam kutip, BUKAN dari label bahasa. PRIORITAS: dialog terkutip TIDAK BOLEH dipotong/disingkat demi charLimit — PERSINGKAT deskripsi visual/kamera secukupnya. Tutup dengan [${exp.durationSeconds}s, 9:16 vertical frame].`
    : ''}

---

${NEGATIVE_PROMPT_BLOCK}

${SPOKEN_NUMBER_RULE}

---

[OUTPUT — SATU OBJEK JSON SceneData PERSIS SKEMA INI]
{
  "scene_number": ${exp.sceneNumber},
  "scene_type": "${scene.scene_type}",
  "duration_seconds": ${exp.durationSeconds},
  "max_words": ${exp.maxWords},
  "speech_pace": "${scene.speech_pace}",
  "ai_ready_prompt": "WAJIB diawali character_sheet verbatim (jika ada), max ${exp.charLimit} karakter.${(exp.aiTool === 'google_flow' || exp.aiTool === 'veo3') ? ` WAJIB sisipkan dialog terkutip: [Subjek] says, \\"<script_narration verbatim>\\" (no subtitles).` : ''}",
  "script_narration": "narasi baru, maks ${exp.maxWords} kata, bahasa ${form.language}",
  "script_subtitle": ${scene.script_subtitle ? '"string atau null sesuai aturan bahasa video ini"' : 'null'},
  "script_word_count": 0,
  "script_fit_confirmation": "X kata, muat Y detik",
  "visual_description": "string",
  "camera_direction": "string",
  "character_action": "string",
  "character_expression": "string",
  "text_overlay": "string atau none",
  "sound_design": "string",
  "transition_to_next": "string",
  "viral_element_in_scene": "string",
  "cliffhanger_to_next": "string",
  "reference_image": ${exp.locationRef ? buildReferenceImageJson(exp.locationRef) : (scene.reference_image ? JSON.stringify(scene.reference_image) : 'null')}
}

GUARDRAIL: scene_number, duration_seconds, dan max_words TIDAK BOLEH berubah dari nilai di atas.
Output JSON murni, mulai {, akhiri }.`;
}

export function validateSceneData(scene: SceneData, expectation: SceneRegenExpectation, hookType?: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredFields: (keyof SceneData)[] = ['ai_ready_prompt', 'script_narration', 'visual_description', 'camera_direction'];
  requiredFields.forEach(field => {
    if (!scene[field]) errors.push(`Field "${field}" kosong.`);
  });

  if (scene.scene_number !== expectation.sceneNumber) {
    errors.push(`scene_number berubah (diharapkan ${expectation.sceneNumber}, dapat ${scene.scene_number}).`);
  }
  if (scene.duration_seconds !== expectation.durationSeconds) {
    errors.push(`duration_seconds berubah (diharapkan ${expectation.durationSeconds}, dapat ${scene.duration_seconds}).`);
  }
  if (scene.max_words !== expectation.maxWords) {
    errors.push(`max_words berubah (diharapkan ${expectation.maxWords}, dapat ${scene.max_words}).`);
  }

  // Cek kualitas terpusat — maxWords dari expectation (recompute dari durasi), BUKAN dari
  // scene.max_words yang dilaporkan AI.
  warnings.push(...checkScene(scene, {
    aiTool: expectation.aiTool,
    charLimit: expectation.charLimit,
    characterAnchor: expectation.characterAnchor,
    characterRefFileName: expectation.characterRefFileName,
    expectedLocationRefFile: expectation.locationRef ? expectation.locationRef.file.trim() : undefined,
    maxWords: expectation.maxWords,
    hookType,
  }));

  return { valid: errors.length === 0, errors, warnings };
}

export function buildSceneRegenRepairPrompt(scene: SceneData, problems: string[], expectation: SceneRegenExpectation): string {
  const needsEmbeddedDialogueFix = problems.some(p => p.includes('tidak menyisipkan dialog terkutip'));
  const embeddedDialogueRule = needsEmbeddedDialogueFix
    ? `\n- Masalah dialog tidak tersisip: WAJIB sisipkan dialog sebagai kalimat TERKUTIP LANGSUNG persis begini: [Subjek] says, "<script_narration WORD-FOR-WORD, SAMA PERSIS dengan field script_narration, JANGAN diterjemahkan/diparafrase>" (no subtitles) — ini konvensi RESMI Veo3, BUKAN tag [DIALOGUE: ...]. Model menyimpulkan bahasa ucapan dari ISI kalimat dalam kutip, bukan label bahasa.`
    : '';
  return `Kamu sebelumnya menghasilkan JSON scene tunggal berikut, tetapi validator menemukan masalah.

DAFTAR MASALAH:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ATURAN PERBAIKAN:
- Perbaiki HANYA field yang bermasalah. Field lain WAJIB disalin apa adanya.
- scene_number HARUS PERSIS ${expectation.sceneNumber}, duration_seconds HARUS PERSIS ${expectation.durationSeconds}, max_words HARUS PERSIS ${expectation.maxWords}.
- ai_ready_prompt maksimal ${expectation.charLimit} karakter${expectation.characterAnchor ? `, WAJIB diawali persis: '${expectation.characterAnchor}'` : ''}.${expectation.characterBindingSentence ? ` WAJIB tetap menyertakan kalimat pengikat karakter: "${expectation.characterBindingSentence}".` : ''}${embeddedDialogueRule}
- Jumlah kata script_narration aktual harus antara 85%-100% dari ${expectation.maxWords} kata.
- Output kamu HANYA satu objek JSON scene tunggal yang sudah diperbaiki, struktur identik. Mulai {, akhiri }.

JSON SCENE YANG HARUS DIPERBAIKI:
${JSON.stringify(scene, null, 2)}`;
}

export function parseSceneResponse(rawText: string): SceneData | null {
  return parseJsonResponse<SceneData>(rawText);
}
