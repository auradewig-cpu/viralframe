import { FormData } from '../types';
import { ETHNICITY_FEATURES } from './masterPrompt';

const BACKGROUND_MAP: Record<string, string> = {
  studio_kreator: 'A modern content creator studio with a neutral backdrop and ring light, clean and professional',
  kamar_aesthetic: 'A tidy aesthetic bedroom with natural window lighting, cozy decor, neat bedding',
  dapur_modern: 'A modern minimalist kitchen with clean countertops, warm ambient lighting, neatly arranged',
  ruang_tamu: 'A minimalist living room with a comfortable sofa, indoor plants, cozy warm atmosphere',
  outdoor_taman: 'An outdoor garden setting with lush greenery, soft morning sunlight, natural environment',
  kantor_modern: 'A modern office with a desk, monitor, clean white lighting, professional atmosphere',
};

export function buildCharacterPhotoPrompt(form: FormData, hasProductBlob: boolean): { prompt: string; needsProductImage: boolean } {
  const needsProductImage = hasProductBlob;

  if (form.talentStyle === 'faceless_pov') {
    return buildFacelessPrompt(form, needsProductImage);
  }
  return buildVisiblePrompt(form, needsProductImage);
}

function buildVisiblePrompt(form: FormData, needsProductImage: boolean): { prompt: string; needsProductImage: boolean } {
  const gender = form.characterGender === 'male' ? 'male' : form.characterGender === 'duo' ? 'male and female' : 'female';
  const ethnicity = ETHNICITY_FEATURES[form.characterEthnicity] || form.characterEthnicity;
  const age = form.characterAge;
  const style = form.characterStyle;
  const traits = form.characterTraits ? `, ${form.characterTraits} (interpret any non-English descriptors accurately)` : '';
  const background = buildBackground(form);
  const productInstruction = needsProductImage
    ? ', holding/presenting the product from the attached reference image, keep the product design exactly as shown'
    : '';
  const duoInstruction = form.characterGender === 'duo'
    ? ' Both a male and a female character together in the frame.'
    : '';

  // "no watermark/no ADDED logos" — jangan tulis "no logo" mentah: traits user bisa memuat logo
  // seragam (mis. "kemeja berlogo SBP") yang justru WAJIB dirender, bukan dihapus.
  const prompt = `A ${age}-year-old ${ethnicity} ${gender} in ${style} style${traits}${duoInstruction}. Shot in 3/4 body portrait${productInstruction}. Setting: ${background}. Photorealistic, natural lighting, sharp focus, high detail skin texture, 9:16 portrait orientation. No watermark, no text overlay, no added logos other than those described above.`;

  return { prompt, needsProductImage };
}

function buildFacelessPrompt(form: FormData, needsProductImage: boolean): { prompt: string; needsProductImage: boolean } {
  const handDesc = form.handDescription || 'hands';
  const background = buildBackground(form);
  const productInstruction = needsProductImage
    ? ', holding and presenting the product naturally'
    : '';
  const prompt = `First-person POV shot, only hands visible, no face visible, no reflection showing face. ${handDesc}${productInstruction}. Setting: ${background}. Photorealistic, natural lighting, sharp focus on hands and product, 9:16 portrait orientation. No watermark, no text overlay, no added logos other than those described above.`;

  return { prompt, needsProductImage };
}

function buildBackground(form: FormData): string {
  if (form.characterBackground === 'custom' && form.characterBackgroundCustom.trim()) {
    return form.characterBackgroundCustom.trim();
  }
  const preset = BACKGROUND_MAP[form.characterBackground];
  return preset || 'A clean neutral indoor setting with soft natural lighting';
}
