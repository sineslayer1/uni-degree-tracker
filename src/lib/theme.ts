import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'apex_theme_mode';
const THEME_CHANGE_EVENT = 'apex_theme_change';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (err) {
    console.warn('Could not read theme from localStorage:', err);
  }
  return 'system';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = mode === 'dark' || (mode === 'system' && isSystemDark);

  if (shouldBeDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('Could not save theme to localStorage:', err);
    }
    applyTheme(newTheme);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: newTheme }));
    }
  };

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemMediaChange = () => {
      if (getInitialTheme() === 'system') {
        applyTheme('system');
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail && customEvent.detail !== theme) {
        setThemeState(customEvent.detail);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const updated = e.newValue as ThemeMode;
        if (updated === 'light' || updated === 'dark' || updated === 'system') {
          setThemeState(updated);
          applyTheme(updated);
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemMediaChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemMediaChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [theme]);

  return { theme, setTheme };
}

