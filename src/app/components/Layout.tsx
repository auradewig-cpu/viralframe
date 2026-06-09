import { Link, useLocation } from 'react-router';
import { Zap, History, Layout, Settings, BookOpen, Menu, X, Cpu, FileText } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store';

const navItems = [
  { path: '/', label: 'Generator', icon: Zap },
  { path: '/history', label: 'History', icon: History },
  { path: '/templates', label: 'Templates', icon: Layout },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/guide', label: 'Guide', icon: BookOpen },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const settings = useAppStore(s => s.settings);
  const setSettings = useAppStore(s => s.setSettings);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--vf-bg-primary)', color: 'var(--vf-text-primary)', fontFamily: "'Plus Jakarta Sans', DM Sans, system-ui, sans-serif" }}>
      {/* Top header */}
      <header style={{ background: 'var(--vf-bg-secondary)', borderBottom: '1px solid var(--vf-border)' }} className="sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--vf-accent-primary)' }}>
                <Zap size={16} className="text-white" />
              </div>
              <span style={{ color: 'var(--vf-text-primary)' }} className="hidden sm:block">
                <span className="font-bold">ViralFrame</span> <span style={{ color: 'var(--vf-text-secondary)' }}>Studio</span>
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  color: location.pathname === path ? 'white' : 'var(--vf-text-secondary)',
                  background: location.pathname === path ? 'var(--vf-accent-primary)' : 'transparent',
                }}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-muted)', border: '1px solid var(--vf-border)' }}
              title="Ubah mode generate"
            >
              {settings.defaultMode === 'direct' ? <Cpu size={12} /> : <FileText size={12} />}
              {settings.defaultMode === 'direct' ? 'API' : 'Manual'}
            </Link>
            <button
              onClick={() => setSettings({ darkMode: !settings.darkMode })}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'var(--vf-bg-elevated)', color: 'var(--vf-text-secondary)' }}
              title="Toggle dark/light mode"
            >
              {settings.darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div style={{ background: 'var(--vf-bg-secondary)', borderTop: '1px solid var(--vf-border)' }} className="md:hidden">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm"
                style={{ color: location.pathname === path ? 'var(--vf-accent-primary)' : 'var(--vf-text-secondary)' }}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
