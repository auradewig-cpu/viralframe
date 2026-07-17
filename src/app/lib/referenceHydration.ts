import { useEffect } from 'react';
import { useAppStore } from '../store';
import { getImage } from './refImageDB';

// HYDRATION foto referensi dari IndexedDB — dipanggil sekali di Home.tsx (top-level, tidak
// bergantung step/tab aktif) supaya thumbnail & Download Bahan tetap lengkap setelah reload atau
// setelah loadFormData dari History/Templates. Untuk setiap sourceName yang direferensikan
// formData saat ini (locationRefs[].sourceName + characterRefSourceName) dan BELUM ada di
// store.referenceFiles (mis. reload browser, blob URL sesi lama sudah mati), ambil dari IDB dan
// buat object URL baru. Async, tidak memblokir render — thumbnail muncul menyusul begitu selesai.
export function useHydrateReferenceFiles() {
  const locationRefs = useAppStore(s => s.formData.locationRefs);
  const characterRefSourceName = useAppStore(s => s.formData.characterRefSourceName);
  const referenceFiles = useAppStore(s => s.referenceFiles);
  const setReferenceFile = useAppStore(s => s.setReferenceFile);
  const setReferenceHydrating = useAppStore(s => s.setReferenceHydrating);

  useEffect(() => {
    const sourceNames = new Set<string>();
    locationRefs.forEach(r => { if (r.sourceName) sourceNames.add(r.sourceName); });
    if (characterRefSourceName) sourceNames.add(characterRefSourceName);

    const missing = Array.from(sourceNames).filter(name => !referenceFiles[name]);
    if (missing.length === 0) return;

    let cancelled = false;
    setReferenceHydrating(true);

    (async () => {
      await Promise.all(missing.map(async (sourceName) => {
        const stored = await getImage(sourceName);
        if (stored && !cancelled) {
          setReferenceFile(sourceName, URL.createObjectURL(stored.blob), stored.blob);
        }
      }));
      if (!cancelled) setReferenceHydrating(false);
    })();

    // Reset flag juga di cleanup — tanpa ini, unmount di tengah hidrasi meninggalkan
    // referenceHydrating nyangkut true (tombol Download Bahan disabled permanen).
    return () => { cancelled = true; setReferenceHydrating(false); };
    // referenceFiles sengaja tidak dimasukkan ke deps — hanya locationRefs/characterRefSourceName
    // yang menentukan sourceName mana yang WAJIB ada, supaya effect tidak re-run tiap kali
    // setReferenceFile dipanggil (yang justru mengubah referenceFiles itu sendiri).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationRefs, characterRefSourceName]);
}
