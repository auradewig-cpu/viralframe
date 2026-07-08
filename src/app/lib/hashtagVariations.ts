function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateHashtagVariations(hashtagStrategy: { primary: string[]; secondary: string[]; niche: string[] }): string[][] {
  const allTags = [...new Set([
    ...(hashtagStrategy.primary || []),
    ...(hashtagStrategy.secondary || []),
    ...(hashtagStrategy.niche || []),
  ])];
  const variations: string[][] = [];
  for (let i = 0; i < 5; i++) {
    variations.push(seededShuffle(allTags, i + 1));
  }
  return variations;
}
