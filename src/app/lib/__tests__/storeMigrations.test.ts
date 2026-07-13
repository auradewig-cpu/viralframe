import { describe, it, expect } from 'vitest';
import { migratePersistedState } from '../storeMigrations';

describe('migratePersistedState', () => {
  it('mengonversi record v1 { videoJSON: {...} } → { contentTypeId, output }', () => {
    const input = {
      history: [
        {
          id: '1',
          timestamp: 1000,
          label: 'test',
          formData: {},
          masterPrompt: 'prompt',
          videoJSON: { title: 'old video' },
        },
      ],
    };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 1);
    const record = (result.history as Array<Record<string, unknown>>)[0];
    expect(record.output).toEqual({ title: 'old video' });
    expect(record.contentTypeId).toBe('short_video');
    expect('videoJSON' in record).toBe(false);
  });

  it('mengonversi record v1 { videoJSON: null } → output null', () => {
    const input = {
      history: [
        {
          id: '2',
          timestamp: 2000,
          label: 'test null',
          formData: {},
          masterPrompt: 'prompt',
          videoJSON: null,
        },
      ],
    };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 1);
    const record = (result.history as Array<Record<string, unknown>>)[0];
    expect(record.output).toBeNull();
    expect(record.contentTypeId).toBe('short_video');
    expect('videoJSON' in record).toBe(false);
  });

  it('record yang sudah punya contentTypeId + output tidak berubah', () => {
    const input = {
      history: [
        {
          id: '3',
          timestamp: 3000,
          label: 'already migrated',
          formData: {},
          masterPrompt: 'prompt',
          contentTypeId: 'youtube_long',
          output: { chapters: [] },
        },
      ],
    };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 1);
    const record = (result.history as Array<Record<string, unknown>>)[0];
    expect(record.contentTypeId).toBe('youtube_long');
    expect(record.output).toEqual({ chapters: [] });
    expect('videoJSON' in record).toBe(false);
  });

  it('state tanpa history tidak crash', () => {
    const input = { settings: {} };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 1);
    expect(result).toEqual(input);
  });

  it('state undefined atau null untuk history tidak crash (history undefined)', () => {
    const input = { history: undefined };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 1);
    expect(result.history).toBeUndefined();
  });

  it('state dengan history array kosong tidak berubah', () => {
    const input = { history: [] };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 1);
    expect(result.history).toEqual([]);
  });

  it('version >= 2 mengembalikan state apa adanya', () => {
    const input = {
      history: [
        {
          id: '4',
          timestamp: 4000,
          label: 'v2+',
          videoJSON: { title: 'should not be touched' },
        },
      ],
    };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 2);
    // videoJSON should still be there since version >= 2 skips migration
    const record = (result.history as Array<Record<string, unknown>>)[0];
    expect('videoJSON' in record).toBe(true);
    expect('output' in record).toBe(false);
  });

  it('empty/undefined state tidak crash', () => {
    const result = migratePersistedState({} as Record<string, unknown>, 1);
    expect(result).toEqual({});
  });

  it('beberapa record campuran (v1 + sudah v2) semua terkonversi', () => {
    const input = {
      history: [
        { id: 'a', videoJSON: { data: 1 } },
        { id: 'b', contentTypeId: 'thumbnail_pack', output: { concepts: [] } },
        { id: 'c', videoJSON: { data: 2 } },
      ],
    };
    const result = migratePersistedState(input as unknown as Record<string, unknown>, 1);
    const history = result.history as Array<Record<string, unknown>>;
    expect(history[0].contentTypeId).toBe('short_video');
    expect(history[0].output).toEqual({ data: 1 });
    expect(history[1].contentTypeId).toBe('thumbnail_pack');
    expect(history[1].output).toEqual({ concepts: [] });
    expect(history[2].contentTypeId).toBe('short_video');
    expect(history[2].output).toEqual({ data: 2 });
  });
});
