import { describe, it, expect } from 'vitest';
import { buildCharacterPhotoPrompt } from '../characterPhotoPrompt';
import type { FormData } from '../../types';
import { DEFAULT_FORM } from '../../types';

function makeForm(overrides?: Partial<FormData>): FormData {
  return { ...DEFAULT_FORM, ...overrides };
}

describe('buildCharacterPhotoPrompt', () => {
  describe('visible_character', () => {
    it('includes all parameter details in prompt for visible_character', () => {
      const form = makeForm({
        talentStyle: 'visible_character',
        characterGender: 'female',
        characterAge: 25,
        characterEthnicity: 'Asia Tenggara',
        characterStyle: 'Kasual Modern',
        characterTraits: 'rambut panjang hitam, berkacamata',
        characterBackground: 'studio_kreator',
      });
      const { prompt, needsProductImage } = buildCharacterPhotoPrompt(form, false);
      expect(prompt).toContain('25-year-old');
      expect(prompt).toContain('Southeast Asian features');
      expect(prompt).toContain('female');
      expect(prompt).toContain('Kasual Modern');
      expect(prompt).toContain('rambut panjang hitam, berkacamata');
      expect(prompt).toContain('interpret any non-English descriptors');
      expect(prompt).toContain('9:16 portrait');
      expect(prompt).toContain('studio');
      expect(needsProductImage).toBe(false);
    });

    it('includes product instruction when product blob available', () => {
      const form = makeForm({
        talentStyle: 'visible_character',
        characterGender: 'male',
        characterAge: 30,
        characterEthnicity: 'Kaukasia',
        characterStyle: 'Profesional',
        characterBackground: 'kantor_modern',
      });
      const { prompt, needsProductImage } = buildCharacterPhotoPrompt(form, true);
      expect(prompt).toContain('holding/presenting the product');
      expect(prompt).toContain('keep the product design exactly as shown');
      expect(needsProductImage).toBe(true);
    });

    it('handles duo gender correctly', () => {
      const form = makeForm({
        talentStyle: 'visible_character',
        characterGender: 'duo',
        characterAge: 28,
        characterEthnicity: 'Asia Timur',
        characterStyle: 'Trendy/Streetwear',
        characterBackground: 'outdoor_taman',
      });
      const { prompt } = buildCharacterPhotoPrompt(form, false);
      expect(prompt).toContain('male and female');
      expect(prompt).toContain('Both a male and a female');
    });

    it('uses custom background when set', () => {
      const form = makeForm({
        talentStyle: 'visible_character',
        characterGender: 'female',
        characterAge: 22,
        characterEthnicity: 'Mixed',
        characterStyle: 'Sporty',
        characterBackground: 'custom',
        characterBackgroundCustom: 'A yoga studio with bamboo floors and floor-to-ceiling mirrors',
      });
      const { prompt } = buildCharacterPhotoPrompt(form, false);
      expect(prompt).toContain('yoga studio');
      expect(prompt).not.toContain('studio_kreator');
    });
  });

  describe('faceless_pov', () => {
    it('includes hand description and no-face instruction', () => {
      const form = makeForm({
        talentStyle: 'faceless_pov',
        handDescription: 'kulit sawo matang, kuku pendek natural, cincin perak',
        characterBackground: 'dapur_modern',
      });
      const { prompt, needsProductImage } = buildCharacterPhotoPrompt(form, false);
      expect(prompt).toContain('First-person POV');
      expect(prompt).toContain('only hands visible');
      expect(prompt).toContain('no face visible');
      expect(prompt).toContain('kulit sawo matang, kuku pendek natural, cincin perak');
      expect(needsProductImage).toBe(false);
    });

    it('includes product instruction for faceless when product available', () => {
      const form = makeForm({
        talentStyle: 'faceless_pov',
        handDescription: 'tangan dengan nail art merah',
        characterBackground: 'ruang_tamu',
      });
      const { prompt, needsProductImage } = buildCharacterPhotoPrompt(form, true);
      expect(prompt).toContain('holding and presenting the product');
      expect(needsProductImage).toBe(true);
    });

    it('falls back to "hands" when handDescription empty', () => {
      const form = makeForm({
        talentStyle: 'faceless_pov',
        handDescription: '',
        characterBackground: 'kamar_aesthetic',
      });
      const { prompt } = buildCharacterPhotoPrompt(form, false);
      expect(prompt).toContain('hands');
    });
  });

  describe('without product blob', () => {
    it('sets needsProductImage false for both talent styles', () => {
      const form1 = makeForm({ talentStyle: 'visible_character', characterGender: 'female', characterAge: 25, characterEthnicity: 'Asia Tenggara', characterStyle: 'Kasual', characterBackground: 'studio_kreator' });
      const form2 = makeForm({ talentStyle: 'faceless_pov', handDescription: 'tangan', characterBackground: 'studio_kreator' });
      expect(buildCharacterPhotoPrompt(form1, false).needsProductImage).toBe(false);
      expect(buildCharacterPhotoPrompt(form2, false).needsProductImage).toBe(false);
    });
  });

  describe('background mapping', () => {
    it('maps all preset backgrounds correctly', () => {
      const presets = ['studio_kreator', 'kamar_aesthetic', 'dapur_modern', 'ruang_tamu', 'outdoor_taman', 'kantor_modern'];
      for (const bg of presets) {
        const form = makeForm({ talentStyle: 'visible_character', characterGender: 'female', characterAge: 25, characterEthnicity: 'Asia Tenggara', characterStyle: 'Kasual', characterBackground: bg });
        const { prompt } = buildCharacterPhotoPrompt(form, false);
        expect(prompt.length).toBeGreaterThan(50);
      }
    });
  });
});
