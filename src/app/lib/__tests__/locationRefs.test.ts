import { describe, it, expect } from 'vitest';
import {
  getEffectiveLocationRefs,
  getValidLocationRefs,
  getInvalidLocationRefs,
  getSceneLocationRef,
  sanitizeRefText,
  buildBindingSentence,
  buildCharacterBindingSentence,
  getCharacterRefFileName,
} from '../locationRefs';
import type { FormData } from '../../types';
import { DEFAULT_FORM } from '../../types';

function makeForm(overrides?: Partial<FormData>): FormData {
  return { ...DEFAULT_FORM, ...overrides };
}

describe('sanitizeRefText', () => {
  it('trims whitespace', () => {
    expect(sanitizeRefText('  hello  ')).toBe('hello');
  });

  it('removes double quotes', () => {
    expect(sanitizeRefText('file"name"')).toBe('filename');
  });

  it('removes only double quotes, keeps other chars', () => {
    expect(sanitizeRefText('"scene 1 - foto.jpg"')).toBe('scene 1 - foto.jpg');
  });

  it('handles empty string', () => {
    expect(sanitizeRefText('')).toBe('');
  });
});

describe('getEffectiveLocationRefs', () => {
  it('returns all refs from locationRefs with derived role', () => {
    const form = makeForm({
      locationRefs: [
        { file: 'scene3_kamar.jpg', identity: 'kamar_tidur', keterangan: 'kamar utama', sceneNumber: 3 },
        { file: 'produk_fasad.jpg', identity: 'fasad', keterangan: 'tampak depan', sceneNumber: null },
      ],
    });
    const result = getEffectiveLocationRefs(form);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('environment');
    expect(result[1].role).toBe('product');
  });

  it('filters out entries with empty file', () => {
    const form = makeForm({
      locationRefs: [
        { file: '', identity: '', keterangan: '', sceneNumber: 1 },
        { file: 'valid.jpg', identity: 'custom', keterangan: '', sceneNumber: 2 },
      ],
    });
    expect(getEffectiveLocationRefs(form)).toHaveLength(1);
  });

  it('returns empty array when locationRefs empty', () => {
    const form = makeForm({ locationRefs: [] });
    expect(getEffectiveLocationRefs(form)).toEqual([]);
  });

  it('sceneNumber !== null → environment, null → product', () => {
    const form = makeForm({
      locationRefs: [
        { file: 'scene1.jpg', identity: 'custom', keterangan: '', sceneNumber: 1 },
        { file: 'semua.jpg', identity: 'custom', keterangan: '', sceneNumber: null },
      ],
    });
    const refs = getEffectiveLocationRefs(form);
    expect(refs.find(r => r.sceneNumber === 1)!.role).toBe('environment');
    expect(refs.find(r => r.sceneNumber === null)!.role).toBe('product');
  });
});

describe('getValidLocationRefs', () => {
  it('includes refs within sceneCount', () => {
    const form = makeForm({
      sceneCount: 5,
      locationRefs: [
        { file: 'scene3.jpg', identity: 'custom', keterangan: '', sceneNumber: 3 },
        { file: 'scene10.jpg', identity: 'custom', keterangan: '', sceneNumber: 10 },
        { file: 'semua.jpg', identity: 'custom', keterangan: '', sceneNumber: null },
      ],
    });
    const valid = getValidLocationRefs(form);
    expect(valid).toHaveLength(2);
    expect(valid.map(r => r.sceneNumber)).toContain(3);
    expect(valid.map(r => r.sceneNumber)).toContain(null);
  });
});

describe('getInvalidLocationRefs', () => {
  it('returns refs with sceneNumber > sceneCount', () => {
    const form = makeForm({
      sceneCount: 5,
      locationRefs: [
        { file: 'scene3.jpg', identity: 'custom', keterangan: '', sceneNumber: 3 },
        { file: 'scene10.jpg', identity: 'custom', keterangan: '', sceneNumber: 10 },
        { file: 'semua.jpg', identity: 'custom', keterangan: '', sceneNumber: null },
      ],
    });
    const invalid = getInvalidLocationRefs(form);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].sceneNumber).toBe(10);
  });

  it('returns empty when all refs are valid', () => {
    const form = makeForm({
      sceneCount: 5,
      locationRefs: [
        { file: 'scene3.jpg', identity: 'custom', keterangan: '', sceneNumber: 3 },
      ],
    });
    expect(getInvalidLocationRefs(form)).toHaveLength(0);
  });
});

describe('getSceneLocationRef', () => {
  it('returns specific ref if scene matches', () => {
    const refs = [
      { file: 's1.jpg', identity: 'custom', keterangan: '', sceneNumber: 1, role: 'environment' as const },
      { file: 'all.jpg', identity: 'custom', keterangan: '', sceneNumber: null, role: 'product' as const },
    ];
    const result = getSceneLocationRef(refs, 1);
    expect(result?.file).toBe('s1.jpg');
  });

  it('falls back to "Semua scene" ref when no specific match', () => {
    const refs = [
      { file: 's1.jpg', identity: 'custom', keterangan: '', sceneNumber: 1, role: 'environment' as const },
      { file: 'all.jpg', identity: 'custom', keterangan: '', sceneNumber: null, role: 'product' as const },
    ];
    const result = getSceneLocationRef(refs, 2);
    expect(result?.file).toBe('all.jpg');
  });

  it('returns null when no ref matches at all', () => {
    const refs = [
      { file: 's1.jpg', identity: 'custom', keterangan: '', sceneNumber: 1, role: 'environment' as const },
    ];
    expect(getSceneLocationRef(refs, 2)).toBeNull();
  });

  it('prefers specific ref over "Semua scene" even if both exist', () => {
    const refs = [
      { file: 'all.jpg', identity: 'custom', keterangan: '', sceneNumber: null, role: 'product' as const },
      { file: 's1.jpg', identity: 'custom', keterangan: '', sceneNumber: 1, role: 'environment' as const },
    ];
    expect(getSceneLocationRef(refs, 1)?.file).toBe('s1.jpg');
  });

  it('returns null when refs array is empty', () => {
    expect(getSceneLocationRef([], 1)).toBeNull();
  });
});

describe('getCharacterRefFileName', () => {
  it('returns empty string when talentStyle is product_only', () => {
    const form = makeForm({ talentStyle: 'product_only', characterRefFile: 'karakter.jpg' });
    expect(getCharacterRefFileName(form)).toBe('');
  });

  it('returns empty string when characterRefFile is blank', () => {
    const form = makeForm({ talentStyle: 'visible_character', characterRefFile: '' });
    expect(getCharacterRefFileName(form)).toBe('');
  });

  it('returns sanitized characterRefFile for visible_character', () => {
    const form = makeForm({ talentStyle: 'visible_character', characterRefFile: 'karakter.jpg' });
    expect(getCharacterRefFileName(form)).toBe('karakter.jpg');
  });

  it('returns sanitized characterRefFile for faceless_pov', () => {
    const form = makeForm({ talentStyle: 'faceless_pov', characterRefFile: 'tangan.jpg' });
    expect(getCharacterRefFileName(form)).toBe('tangan.jpg');
  });

  it('strips double quotes from characterRefFile', () => {
    const form = makeForm({ talentStyle: 'visible_character', characterRefFile: '"karakter".jpg' });
    expect(getCharacterRefFileName(form)).toBe('karakter.jpg');
  });
});

describe('buildBindingSentence', () => {
  it('environment ref returns location matches reference photo', () => {
    const ref = { file: 'scene3_kamar.jpg', identity: 'kamar_tidur', keterangan: 'kamar utama 4x5', sceneNumber: 3, role: 'environment' as const };
    expect(buildBindingSentence(ref)).toBe('location matches reference photo scene3_kamar.jpg: kamar utama 4x5');
  });

  it('product ref returns product matches reference photo', () => {
    const ref = { file: 'produk_fasad.jpg', identity: 'fasad', keterangan: 'tampak depan putih', sceneNumber: null, role: 'product' as const };
    expect(buildBindingSentence(ref)).toBe('product matches reference photo produk_fasad.jpg: tampak depan putih');
  });

  it('returns sentence without keterangan when keterangan is empty', () => {
    const ref = { file: 'scene1.jpg', identity: 'custom', keterangan: '', sceneNumber: 1, role: 'environment' as const };
    expect(buildBindingSentence(ref)).toBe('location matches reference photo scene1.jpg');
  });

  it('sanitizes quotes in file and keterangan', () => {
    const ref = { file: '"file".jpg', identity: 'custom', keterangan: 'some "desc"', sceneNumber: 1, role: 'environment' as const };
    expect(buildBindingSentence(ref)).toBe('location matches reference photo file.jpg: some desc');
  });
});

describe('buildCharacterBindingSentence', () => {
  it('returns null for product_only talent style', () => {
    const form = makeForm({ talentStyle: 'product_only', characterRefFile: 'karakter.jpg' });
    expect(buildCharacterBindingSentence(form)).toBeNull();
  });

  it('returns null when characterRefFile is empty', () => {
    const form = makeForm({ talentStyle: 'visible_character', characterRefFile: '' });
    expect(buildCharacterBindingSentence(form)).toBeNull();
  });

  it('returns character sentence for visible_character', () => {
    const form = makeForm({ talentStyle: 'visible_character', characterRefFile: 'karakter.jpg' });
    expect(buildCharacterBindingSentence(form)).toBe('character matches reference photo karakter.jpg — same face, hair, and outfit');
  });

  it('returns hands sentence for faceless_pov', () => {
    const form = makeForm({ talentStyle: 'faceless_pov', characterRefFile: 'tangan.jpg' });
    expect(buildCharacterBindingSentence(form)).toBe('hands match reference photo tangan.jpg — same hands, skin tone, and accessories');
  });
});
