// Ekstraksi murni dari fungsi migrate persist store — dipisahkan agar bisa di-unit-test
// tanpa perlu Zustand. Perilaku HARUS identik dengan inline sebelumnya.
// v1 -> v2: HistoryRecord.videoJSON berganti nama jadi { contentTypeId, output }.
// Record lama tanpa contentTypeId diperlakukan sebagai 'short_video'.

export function migratePersistedState(state: Record<string, unknown>, version: number): Record<string, unknown> {
  if (version >= 2) return state;

  const history = state.history as Array<Record<string, unknown>> | undefined;
  if (history) {
    state.history = history.map((r) => {
      if ('contentTypeId' in r && 'output' in r) return r;
      const { videoJSON, ...rest } = r;
      return { ...rest, contentTypeId: (r.contentTypeId as string) || 'short_video', output: videoJSON ?? null };
    });
  }
  return state;
}
