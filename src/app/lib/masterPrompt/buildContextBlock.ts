import { CompileContext } from './context';

export function buildContextBlock(ctx: CompileContext): string {
  const { form, nicheData, platformPrimer, langInstruction, advancedBlocks } = ctx;
  return `

[BLOK 2: KONTEKS BISNIS DAN PRODUK]

NICHE: ${form.niche}
PRODUK/LAYANAN: ${form.productDescription}
USP: "${form.usp}" → Tegaskan minimal 2x dalam video.
TARGET AUDIENS: ${form.targetAudience.join(', ')}
PSIKOGRAFIS: ${nicheData.psikografis}
PAIN POINT: ${nicheData.painPoint}
PLATFORM PRIMER: ${platformPrimer}
BAHASA: ${form.language}
  ${langInstruction}
${advancedBlocks}`;
}
