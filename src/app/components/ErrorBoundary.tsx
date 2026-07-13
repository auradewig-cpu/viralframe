import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  confirmReset: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, confirmReset: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Render error caught:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetData = () => {
    if (!this.state.confirmReset) {
      this.setState({ confirmReset: true });
      return;
    }
    localStorage.removeItem('viralframe-store');
    window.location.reload();
  };

  handleCancelReset = () => {
    this.setState({ confirmReset: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorMessage = this.state.error?.message || 'Kesalahan tidak diketahui';

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--vf-bg-primary)' }}
      >
        <div
          className="max-w-md w-full p-8 rounded-2xl text-center"
          style={{ background: 'var(--vf-bg-elevated)', border: '1px solid var(--vf-border)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <span className="text-3xl">⚠️</span>
          </div>

          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--vf-text-primary)' }}>
            Terjadi Kesalahan
          </h1>

          <p
            className="text-sm mb-6 p-3 rounded-lg font-mono"
            style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-accent-danger)' }}
          >
            {errorMessage}
          </p>

          <div className="space-y-3">
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{ background: 'var(--vf-accent-primary)', color: 'white' }}
            >
              🔄 Muat Ulang Aplikasi
            </button>

            {!this.state.confirmReset ? (
              <button
                onClick={this.handleResetData}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{
                  background: 'transparent',
                  color: 'var(--vf-accent-danger)',
                  border: '1px solid var(--vf-accent-danger)',
                }}
              >
                🗑️ Reset Data Aplikasi
              </button>
            ) : (
              <div
                className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--vf-accent-danger)' }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'var(--vf-text-secondary)' }}>
                  Semua data berikut akan dihapus permanen:
                </p>
                <ul className="text-xs text-left space-y-1" style={{ color: 'var(--vf-text-secondary)' }}>
                  <li>🗂️ Riwayat generate</li>
                  <li>📋 Template kustom</li>
                  <li>⚙️ Pengaturan aplikasi (termasuk API key)</li>
                </ul>
                <p className="text-xs" style={{ color: 'var(--vf-text-muted)' }}>
                  Foto referensi yang tersimpan di IndexedDB TIDAK ikut terhapus.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={this.handleCancelReset}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium"
                    style={{
                      background: 'var(--vf-bg-elevated)',
                      color: 'var(--vf-text-secondary)',
                      border: '1px solid var(--vf-border)',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={this.handleResetData}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--vf-accent-danger)', color: 'white' }}
                  >
                    🗑️ Ya, Reset Sekarang
        </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
