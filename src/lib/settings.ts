// User settings live in localStorage (tiny, needed synchronously at startup to avoid a theme flash).

import { useSyncExternalStore } from 'react';
import type { Lang } from './dates.ts';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  theme: Theme;
  /** Language of month and weekday NAMES (the rest of the UI is English for now). */
  lang: Lang;
  /** 0 = Sunday, 1 = Monday. */
  weekStart: 0 | 1;
}

const KEY = 'zemen.settings.v1';
const DEFAULTS: Settings = { theme: 'system', lang: 'en', weekStart: 1 };

export function sanitizeSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    theme: r.theme === 'light' || r.theme === 'dark' || r.theme === 'system' ? r.theme : DEFAULTS.theme,
    lang: r.lang === 'am' || r.lang === 'en' ? r.lang : DEFAULTS.lang,
    weekStart: r.weekStart === 0 || r.weekStart === 1 ? r.weekStart : DEFAULTS.weekStart,
  };
}

function load(): Settings {
  try {
    const text = localStorage.getItem(KEY);
    return sanitizeSettings(text ? JSON.parse(text) : null);
  } catch {
    return DEFAULTS;
  }
}

let current: Settings = load();
const listeners = new Set<() => void>();

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>): void {
  current = sanitizeSettings({ ...current, ...patch });
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: keep in memory for this session */
  }
  applyTheme(current.theme);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
