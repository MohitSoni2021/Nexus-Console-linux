import { useEffect, type PropsWithChildren } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppSelector } from '@/shared/state/hooks';

const apply = (mode: 'light' | 'dark') => {
  const root = document.documentElement;
  // Suppress transitions for the flip frame → instant, native theme switch.
  root.classList.add('theme-switching');
  root.dataset.theme = mode;
  // Mirror for the pre-paint script in index.html (kills next-launch flash).
  try {
    localStorage.setItem('nexus-theme', mode);
  } catch {
    /* storage unavailable — flash-guard only, nothing to do */
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
  });
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const theme = useAppSelector((s) => s.settings.theme);
  const uiFont = useAppSelector((s) => s.settings.uiFont);
  const monoFont = useAppSelector((s) => s.settings.monoFont);

  useEffect(() => {
    const root = document.documentElement;
    if (uiFont && uiFont !== 'default') {
      root.style.setProperty(
        '--font-sans',
        `"${uiFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
      );
      try {
        localStorage.setItem('nexus-ui-font', uiFont);
      } catch {
        /* ignore */
      }
    } else {
      root.style.removeProperty('--font-sans');
      try {
        localStorage.removeItem('nexus-ui-font');
      } catch {
        /* ignore */
      }
    }

    if (monoFont && monoFont !== 'default') {
      root.style.setProperty(
        '--font-mono',
        `"${monoFont}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
      );
      try {
        localStorage.setItem('nexus-mono-font', monoFont);
      } catch {
        /* ignore */
      }
    } else {
      root.style.removeProperty('--font-mono');
      try {
        localStorage.removeItem('nexus-mono-font');
      } catch {
        /* ignore */
      }
    }
  }, [uiFont, monoFont]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const resolve = () => apply(theme === 'system' ? (mql.matches ? 'dark' : 'light') : theme);
    resolve();
    // Keep the native titlebar/traffic-light chrome in sync (null = follow OS).
    try {
      void getCurrentWindow().setTheme(theme === 'system' ? null : theme);
    } catch {
      /* plain-web dev: no Tauri window */
    }
    if (theme !== 'system') return;
    mql.addEventListener('change', resolve);
    return () => mql.removeEventListener('change', resolve);
  }, [theme]);

  return children;
};
