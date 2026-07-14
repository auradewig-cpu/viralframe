import { describe, it, expect } from 'vitest';
import {
  UNIVERSAL_IDENTITIES,
  PROPERTY_ROOM_IDENTITIES,
  ROOM_IDENTITIES,
  getRoomIdentity,
} from '../roomIdentities';

describe('UNIVERSAL_IDENTITIES', () => {
  it('berisi "produk"', () => {
    expect(UNIVERSAL_IDENTITIES.some(r => r.value === 'produk')).toBe(true);
  });

  it('berisi "custom"', () => {
    expect(UNIVERSAL_IDENTITIES.some(r => r.value === 'custom')).toBe(true);
  });

  it('berisi tepat 2 entry (produk + custom)', () => {
    expect(UNIVERSAL_IDENTITIES).toHaveLength(2);
  });
});

describe('PROPERTY_ROOM_IDENTITIES', () => {
  it('tidak berisi "custom"', () => {
    expect(PROPERTY_ROOM_IDENTITIES.some(r => r.value === 'custom')).toBe(false);
  });

  it('tidak berisi "produk"', () => {
    expect(PROPERTY_ROOM_IDENTITIES.some(r => r.value === 'produk')).toBe(false);
  });

  it('berisi 18 preset ruangan', () => {
    expect(PROPERTY_ROOM_IDENTITIES).toHaveLength(18);
  });
});

describe('ROOM_IDENTITIES (gabungan)', () => {
  it('produk dan custom di posisi depan (universal dulu)', () => {
    expect(ROOM_IDENTITIES[0].value).toBe('produk');
    expect(ROOM_IDENTITIES[1].value).toBe('custom');
  });

  it('total 20 entry (2 universal + 18 properti)', () => {
    expect(ROOM_IDENTITIES).toHaveLength(20);
  });
});

describe('getRoomIdentity', () => {
  it('meresolve "produk" dari daftar penuh', () => {
    const r = getRoomIdentity('produk');
    expect(r?.label).toBe('🛍️ Produk');
  });

  it('meresolve "fasad" dari daftar penuh', () => {
    const r = getRoomIdentity('fasad');
    expect(r?.label).toBe('Fasad / Tampak Depan');
  });

  it('meresolve "custom" dari daftar penuh', () => {
    const r = getRoomIdentity('custom');
    expect(r?.label).toBe('✏️ Ketik manual');
  });

  it('mengembalikan undefined untuk value tidak dikenal', () => {
    expect(getRoomIdentity('nonexistent')).toBeUndefined();
  });
});
