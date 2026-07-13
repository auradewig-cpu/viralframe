import { describe, it, expect } from 'vitest';
import { inferExtension, buildCanonicalName, resolveUniqueCanonicalName, slugify } from '../canonicalRefNames';

describe('inferExtension', () => {
  it('returns extension from sourceName (lowercased)', () => {
    expect(inferExtension('foto.WEBP')).toBe('webp');
  });

  it('returns extension from sourceName with mixed case', () => {
    expect(inferExtension('product.JPEG')).toBe('jpeg');
  });

  it('returns extension from sourceName with multiple dots', () => {
    expect(inferExtension('my.photo.jpg')).toBe('jpg');
  });

  it('falls back to MIME blob type when no sourceName', () => {
    const blob = new Blob([], { type: 'image/png' });
    expect(inferExtension(undefined, blob)).toBe('png');
  });

  it('falls back to MIME blob type for webp', () => {
    const blob = new Blob([], { type: 'image/webp' });
    expect(inferExtension(undefined, blob)).toBe('webp');
  });

  it('falls back to MIME blob type for jpeg', () => {
    const blob = new Blob([], { type: 'image/jpeg' });
    expect(inferExtension(undefined, blob)).toBe('jpg');
  });

  it('returns default jpg when nothing matches', () => {
    expect(inferExtension()).toBe('jpg');
  });

  it('returns default jpg when blob type not in MIME_EXT map', () => {
    const blob = new Blob([], { type: 'image/gif' });
    expect(inferExtension(undefined, blob)).toBe('jpg');
  });

  it('returns default jpg when sourceName has no extension', () => {
    expect(inferExtension('noext')).toBe('jpg');
  });

  it('returns default jpg when sourceName is empty string', () => {
    expect(inferExtension('')).toBe('jpg');
  });
});

describe('buildCanonicalName', () => {
  it('character kind returns karakter.<ext>', () => {
    expect(buildCanonicalName({ kind: 'character' }, 'jpg')).toBe('karakter.jpg');
  });

  it('character kind with png extension', () => {
    expect(buildCanonicalName({ kind: 'character' }, 'png')).toBe('karakter.png');
  });

  it('location with sceneNumber and known identity returns scene<N>_<identity>.<ext>', () => {
    expect(buildCanonicalName({ kind: 'location', identity: 'kamar_tidur', keterangan: 'kamar utama', sceneNumber: 3 }, 'jpg')).toBe('scene3_kamar_tidur.jpg');
  });

  it('location with sceneNumber and custom identity uses slug from keterangan', () => {
    expect(buildCanonicalName({ kind: 'location', identity: 'custom', keterangan: 'Ruang Tamu Mewah', sceneNumber: 2 }, 'jpg')).toBe('scene2_ruang_tamu_mewah.jpg');
  });

  it('location with custom identity and empty keterangan falls back to ref', () => {
    expect(buildCanonicalName({ kind: 'location', identity: 'custom', keterangan: '', sceneNumber: 1 }, 'jpg')).toBe('scene1_ref.jpg');
  });

  it('location with sceneNumber=null (all scenes) and known identity returns produk_<slug>.<ext>', () => {
    expect(buildCanonicalName({ kind: 'location', identity: 'fasad', keterangan: 'Fasad Depan', sceneNumber: null }, 'jpg')).toBe('produk_fasad.jpg');
  });

  it('location with sceneNumber=null and custom identity with keterangan returns produk_<slug>.<ext>', () => {
    expect(buildCanonicalName({ kind: 'location', identity: 'custom', keterangan: 'Tampak Samping', sceneNumber: null }, 'jpg')).toBe('produk_tampak_samping.jpg');
  });

  it('location with sceneNumber=null and no useful slug returns produk.<ext>', () => {
    expect(buildCanonicalName({ kind: 'location', identity: 'custom', keterangan: '', sceneNumber: null }, 'jpg')).toBe('produk.jpg');
  });

  it('sanitizes extension to alphanumeric only', () => {
    expect(buildCanonicalName({ kind: 'character' }, 'jp$g')).toBe('karakter.jpg');
  });

  it('falls back to jpg when extension is empty after sanitize', () => {
    expect(buildCanonicalName({ kind: 'character' }, '')).toBe('karakter.jpg');
  });

  it('slug from keterangan is lowercased with underscores, max 20 chars', () => {
    // Test case 1: empty keterangan with custom identity → fallback 'ref'
    expect(buildCanonicalName({ kind: 'location', identity: 'custom', keterangan: '', sceneNumber: 5 }, 'jpg'))
      .toBe('scene5_ref.jpg');
    // Test case 2: long keterangan truncated by slugify to 20 chars
    expect(buildCanonicalName({ kind: 'location', identity: 'custom', keterangan: 'abcdefghijklmnopqrstuvwxyz_123456', sceneNumber: 5 }, 'jpg'))
      .toBe('scene5_abcdefghijklmnopqrst.jpg');
  });

  it('slugs longer than 20 chars are truncated by slugify', () => {
    const long = 'abcdefghijklmnopqrstuvwxyz_123456';
    expect(buildCanonicalName({ kind: 'location', identity: 'custom', keterangan: long, sceneNumber: 5 }, 'jpg'))
      .toBe('scene5_abcdefghijklmnopqrst.jpg');
  });
});

describe('resolveUniqueCanonicalName', () => {
  it('returns desired as-is when not taken', () => {
    expect(resolveUniqueCanonicalName('scene1_kamar.jpg', new Set(['scene2.jpg']))).toBe('scene1_kamar.jpg');
  });

  it('appends _2 when desired is taken', () => {
    expect(resolveUniqueCanonicalName('scene1_kamar.jpg', new Set(['scene1_kamar.jpg']))).toBe('scene1_kamar_2.jpg');
  });

  it('increments to _3 when _2 is also taken', () => {
    expect(resolveUniqueCanonicalName('scene1_kamar.jpg', new Set(['scene1_kamar.jpg', 'scene1_kamar_2.jpg']))).toBe('scene1_kamar_3.jpg');
  });

  it('works with filenames without extension', () => {
    expect(resolveUniqueCanonicalName('karakter', new Set(['karakter']))).toBe('karakter_2');
  });

  it('works with filenames without extension with multiple collisions', () => {
    expect(resolveUniqueCanonicalName('karakter', new Set(['karakter', 'karakter_2']))).toBe('karakter_3');
  });

  it('does not affect filenames with different extensions', () => {
    expect(resolveUniqueCanonicalName('karakter.png', new Set(['karakter.jpg']))).toBe('karakter.png');
  });

  it('handles multiple dots correctly - appends before last dot', () => {
    expect(resolveUniqueCanonicalName('my.file.name.jpg', new Set(['my.file.name.jpg']))).toBe('my.file.name_2.jpg');
  });
});

describe('slugify', () => {
  it('lowercases and replaces non-alphanumeric with underscore', () => {
    expect(slugify('Kamar Utama! Mewah', 30)).toBe('kamar_utama_mewah');
  });

  it('trims leading/trailing underscores', () => {
    expect(slugify('__hello world__', 30)).toBe('hello_world');
  });

  it('respects maxLength', () => {
    expect(slugify('abcdefghijklmnopqrstuvwxyz', 10)).toBe('abcdefghij');
  });

  it('trims trailing underscores after slicing', () => {
    expect(slugify('hello world!!!!', 12)).toBe('hello_world');
  });
});
