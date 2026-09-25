import { Unit, MicroTask } from '../types/dashboard';

const STORAGE_KEY_PREFIX = 'apex_eng_data_';
const LAST_USER_KEY = 'apex_eng_last_user';
const LAST_SEMESTER_KEY = 'apex_current_semester';

export interface UserPersistedState {
  units: Unit[];
  tasks: MicroTask[];
  metricView: 'WAM' | 'SAM';
  isWhatIfMode: boolean;
  degreeName?: string;
  targetWam?: number;
  displayName?: string;
  userEmail?: string;
  currentSemester?: string;
  totalDegreeCreditPoints?: number;
  degreePlanImage?: string | null;
  isOnboarded?: boolean;
  lastUpdated: string;
}

/**
 * Gets the current active storage key for a user.
 */
export function getStorageKey(userId?: string | null): string {
  const uid = userId || (typeof window !== 'undefined' ? localStorage.getItem(LAST_USER_KEY) : null) || 'guest_user';
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

export function getSavedSemester(): string {
  if (typeof window === 'undefined') return 'Semester 1, 2026';
  try {
    const saved = localStorage.getItem(LAST_SEMESTER_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return 'Semester 1, 2026';
}

/**
 * Saves units, tasks, and user onboarding profile to localStorage immediately.
 */
export function saveLocalState(
  userId: string | null,
  units: Unit[],
  tasks: MicroTask[],
  metricView: 'WAM' | 'SAM',
  isWhatIfMode: boolean,
  extra?: {
    degreeName?: string;
    targetWam?: number;
    displayName?: string;
    userEmail?: string;
    currentSemester?: string;
    totalDegreeCreditPoints?: number;
    degreePlanImage?: string | null;
    isOnboarded?: boolean;
  }
): void {
  try {
    const key = getStorageKey(userId);
    const existing = loadLocalState(userId) || {};

    const payload: UserPersistedState = {
      ...existing,
      units,
      tasks,
      metricView,
      isWhatIfMode,
      ...(extra || {}),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
    if (userId) {
      localStorage.setItem(LAST_USER_KEY, userId);
    }
    if (extra?.currentSemester) {
      localStorage.setItem(LAST_SEMESTER_KEY, extra.currentSemester.trim());
    }
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Loads user state from localStorage.
 */
export function loadLocalState(userId?: string | null): UserPersistedState | null {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as UserPersistedState;
    }
    return null;
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
    return null;
  }
}


/**
 * Clears local state for a user.
 */
export function clearLocalState(userId?: string | null): void {
  try {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to clear local storage:', err);
  }
}

