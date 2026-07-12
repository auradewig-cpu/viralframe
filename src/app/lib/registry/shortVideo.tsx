import { FormData, VideoJSON } from '../../types';
import { compileMasterPrompt } from '../masterPrompt';
import { parseAiResponse, validateVideoJSON, buildRepairPrompt as buildVideoRepairPrompt } from '../jsonParser';
import { checkPolicyCompliance, formatPolicyViolations } from '../policyCheck';
import { applySceneTypeSlugs } from '../contentStyles';
import { DirectPanel } from '../../components/output/DirectPanel';
import { ManualPanel } from '../../components/output/ManualPanel';
import { ContentTypeDefinition, DirectRendererProps, ManualRendererProps } from './types';

// Pure refactor — bungkus perilaku yang sudah ada (masterPrompt.ts + jsonParser.ts + policyCheck.ts +
// contentStyles.ts + DirectPanel/ManualPanel) tanpa mengubah output sama sekali.

function ShortVideoDirectRenderer({ data, onRegenerate, onEdit, referencePhotos }: DirectRendererProps<VideoJSON>) {
  return <DirectPanel json={data} onRegenerate={onRegenerate} onEdit={onEdit} referencePhotos={referencePhotos} />;
}

function ShortVideoManualRenderer({ masterPrompt, form, onValidated }: ManualRendererProps<VideoJSON>) {
  return (
    <ManualPanel
      masterPrompt={masterPrompt}
      sceneCount={form.sceneCount}
      aiTool={form.aiTool}
      contentStyle={form.contentStyle}
      onJsonValidated={onValidated}
      referencePhotos={form.referencePhotos}
      captionVariationCount={form.captionVariationCount}
    />
  );
}

export const shortVideoContentType: ContentTypeDefinition<VideoJSON> = {
  id: 'short_video',
  label: 'Short Video (TikTok / Reels / Shorts)',
  formSections: [
    'business_context', 'target_distribution', 'video_spec', 'scene_duration',
    'hook_cta', 'character', 'visual_audio', 'advanced',
  ],
  buildMasterPrompt: (form, narrationWPM) => compileMasterPrompt(form, narrationWPM),
  parseOutput: (rawText) => parseAiResponse(rawText),
  validateOutput: (json, form) => validateVideoJSON(json, form.sceneCount, form.captionVariationCount, form.aiTool, form.referencePhotos.length > 0),
  buildRepairPrompt: (json, problems, form) => buildVideoRepairPrompt(json, problems, form.sceneCount, form.captionVariationCount, form.aiTool),
  checkPolicy: (json, form) => formatPolicyViolations(checkPolicyCompliance(json, form.contentGoal)),
  applyPostProcess: (json, form) => {
    if (json.scenes && Array.isArray(json.scenes)) applySceneTypeSlugs(json.scenes, form.contentStyle);
  },
  DirectRenderer: ShortVideoDirectRenderer,
  ManualRenderer: ShortVideoManualRenderer,
};
