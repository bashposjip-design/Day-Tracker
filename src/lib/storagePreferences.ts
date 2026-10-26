import { BRAND } from '../config/brand';
import type { DailyRecord, LocalPreferences, ThemePreference } from '../types/daylight';
import { isValidDateKey } from './dateUtils';

const PREFS_KEY = `daylight_prefs_v${BRAND.storageSchemaVersion}`;
const QUOTE_SESSION_PREFIX = `daylight_quote_v${BRAND.storageSchemaVersion}_`;
const USER_CACHE_PREFIX = `daylight_user_cache_v${BRAND.storageSchemaVersion}_`;

const DEFAULT_PREFS: LocalPreferences = {
  theme: 'light',
  reducedMotion: false,
};

export function loadLocalPreferences(): LocalPreferences {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFS;

    const theme: ThemePreference =
      parsed.theme === 'dark' || parsed.theme === 'system' ? parsed.theme : 'light';
    const reducedMotion = Boolean(parsed.reducedMotion);

    return { theme, reducedMotion };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveLocalPreferences(prefs: LocalPreferences): void {
  try {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        schemaVersion: BRAND.storageSchemaVersion,
        theme: prefs.theme,
        reducedMotion: prefs.reducedMotion,
      })
    );
  } catch {
    // Ignore storage quota / private browsing errors gracefully
  }
}

export function applyThemeAndMotionToDom(prefs: LocalPreferences): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const isDark = prefs.theme === 'dark' || (prefs.theme === 'system' && prefersDark);

  root.classList.toggle('dark', isDark);
  root.classList.toggle('reduce-motion', prefs.reducedMotion);
}

export function loadSessionQuoteOverride(dateKey: string, maxQuotes: number): number | null {
  try {
    const raw = window.sessionStorage.getItem(`${QUOTE_SESSION_PREFIX}${dateKey}`);
    if (raw === null) return null;
    const idx = Number.parseInt(raw, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= maxQuotes) return null;
    return idx;
  } catch {
    return null;
  }
}

export function saveSessionQuoteOverride(dateKey: string, index: number): void {
  try {
    window.sessionStorage.setItem(`${QUOTE_SESSION_PREFIX}${dateKey}`, String(index));
  } catch {
    // Ignore sessionStorage errors
  }
}

/**
 * User-scoped read cache in localStorage for instant initial render before Firestore snapshot arrives.
 * Strictly isolated by Firebase UID and cleared on sign-out.
 */
export function loadUserRecordsCache(uid: string): Record<string, DailyRecord> {
  try {
    const raw = window.localStorage.getItem(`${USER_CACHE_PREFIX}${uid}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || parsed.uid !== uid) return {};
    const records = parsed.records as Record<string, DailyRecord> | undefined;
    if (!records || typeof records !== 'object') return {};

    const safe: Record<string, DailyRecord> = {};
    for (const [k, v] of Object.entries(records)) {
      if (isValidDateKey(k) && v && typeof v === 'object' && Array.isArray(v.goals)) {
        safe[k] = v;
      }
    }
    return safe;
  } catch {
    return {};
  }
}

export function saveUserRecordsCache(uid: string, records: Record<string, DailyRecord>): void {
  try {
    window.localStorage.setItem(
      `${USER_CACHE_PREFIX}${uid}`,
      JSON.stringify({
        schemaVersion: BRAND.storageSchemaVersion,
        uid,
        records,
      })
    );
  } catch {
    // Ignore localStorage quota exceeded
  }
}

export function clearUserRecordsCache(uid: string): void {
  try {
    window.localStorage.removeItem(`${USER_CACHE_PREFIX}${uid}`);
  } catch {
    // Ignore
  }
}
