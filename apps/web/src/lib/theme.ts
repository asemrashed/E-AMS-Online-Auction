export type ThemeMode = 'light' | 'dark' | 'device';

export const THEME_KEY = 'eams_theme';

export function readThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'device';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'device') return stored;
  return 'device';
}

export function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'device' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function persistTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}