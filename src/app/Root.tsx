import { Outlet } from 'react-router';
import { useEffect, useLayoutEffect } from 'react';
import { AppLayout } from './components/Layout';
import { useAppStore } from './store';

export function Root() {
  const settings = useAppStore(s => s.settings);

  // Apply dark class immediately before paint — read from localStorage to avoid flash
  useLayoutEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('viralframe-store') || '{}');
      const isDark = stored?.state?.settings?.darkMode;
      if (isDark === false) {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
