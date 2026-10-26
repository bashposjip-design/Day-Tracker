import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from './firebase';
import { BRAND } from '../config/brand';
import { isValidDateKey } from './dateUtils';
import type {
  BackupSchemaV1,
  DailyRecord,
  GoalItem,
  StreakRule,
  ThemePreference,
  UserProfile,
} from '../types/daylight';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatFriendlyDataError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw.includes("Quota exceeded for quota metric 'Free daily read units per project") ||
    raw.includes('Quota exceeded.')
  ) {
    return `Daily free-tier database quota reached. Quota resets tomorrow. Manage project limits at https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<FirestoreErrorInfo>;
    if (parsed.error) {
      if (parsed.error.includes('Quota exceeded')) {
        return 'Daily free-tier database quota reached. Your quota resets automatically tomorrow.';
      }
      return parsed.error;
    }
  } catch {
    // Plain error message
  }
  return raw || 'Unable to sync your changes right now. Please try again.';
}

/**
 * Defensive payload sanitization synchronized with firebase-blueprint.json & firestore.rules
 */
export function sanitizeGoalItems(goals: GoalItem[]): GoalItem[] {
  return goals
    .slice(0, BRAND.maxGoalsPerDay)
    .map((g, idx) => {
      const safeId = g.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || `goal_${Date.now()}_${idx}`;
      const safeText = g.text.trim().slice(0, BRAND.maxGoalLength);
      return {
        id: safeId,
        text: safeText,
        completed: Boolean(g.completed),
        important: Boolean(g.important),
        order: Math.min(BRAND.maxGoalsPerDay, Math.max(0, Math.floor(idx))),
        createdAtMs: Math.max(0, Math.floor(Number(g.createdAtMs) || Date.now())),
      };
    })
    .filter((g) => g.text.length >= 1);
}

export function sanitizeDisplayName(name: string): string {
  return name.trim().slice(0, BRAND.maxDisplayNameLength);
}

export function sanitizeReflection(reflection: string): string {
  return reflection.slice(0, BRAND.maxReflectionLength);
}

/**
 * Ensures /users/{uid} exists before any subcollection read/write (Master Gate invariant).
 */
export async function ensureUserProfile(
  user: User,
  initialTheme: ThemePreference = 'light'
): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: user.uid,
        displayName:
          typeof data.displayName === 'string'
            ? data.displayName
            : sanitizeDisplayName(user.displayName || ''),
        theme:
          data.theme === 'light' || data.theme === 'dark' || data.theme === 'system'
            ? data.theme
            : initialTheme,
        streakRule:
          data.streakRule === 'all_completed' ? 'all_completed' : 'any_completed',
      };
    }

    const fallbackName = sanitizeDisplayName(
      user.displayName || (user.email ? user.email.split('@')[0] : '')
    );
    const validTheme: ThemePreference =
      initialTheme === 'dark' || initialTheme === 'system' ? initialTheme : 'light';

    await setDoc(ref, {
      uid: user.uid,
      displayName: fallbackName,
      theme: validTheme,
      streakRule: 'any_completed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid: user.uid,
      displayName: fallbackName,
      theme: validTheme,
      streakRule: 'any_completed',
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: {
    displayName?: string;
    theme?: ThemePreference;
    streakRule?: StreakRule;
  }
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.displayName !== undefined) {
    payload.displayName = sanitizeDisplayName(updates.displayName);
  }
  if (updates.theme !== undefined) {
    payload.theme = updates.theme;
  }
  if (updates.streakRule !== undefined) {
    payload.streakRule = updates.streakRule;
  }
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToDailyRecords(
  uid: string,
  onRecords: (records: Record<string, DailyRecord>) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = `users/${uid}/dailyRecords`;
  const q = query(collection(db, 'users', uid, 'dailyRecords'), where('uid', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, DailyRecord> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const dateKey = typeof d.date === 'string' ? d.date : docSnap.id;
        if (!isValidDateKey(dateKey)) return;
        const rawGoals = Array.isArray(d.goals) ? (d.goals as GoalItem[]) : [];
        const sortedGoals = [...rawGoals].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const completedCount = sortedGoals.filter((g) => g.completed).length;

        map[dateKey] = {
          uid,
          date: dateKey,
          goals: sortedGoals,
          totalGoals: sortedGoals.length,
          completedGoals: completedCount,
          reflection: typeof d.reflection === 'string' ? d.reflection : '',
        };
      });
      onRecords(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export async function saveDailyGoals(
  uid: string,
  dateKey: string,
  goals: GoalItem[],
  recordAlreadyExists: boolean,
  existingReflection: string = ''
): Promise<void> {
  if (!isValidDateKey(dateKey)) {
    throw new Error('Invalid calendar date key.');
  }
  const cleanGoals = sanitizeGoalItems(goals);
  const totalGoals = cleanGoals.length;
  const completedGoals = cleanGoals.filter((g) => g.completed).length;
  const path = `users/${uid}/dailyRecords/${dateKey}`;
  const ref = doc(db, 'users', uid, 'dailyRecords', dateKey);

  try {
    if (recordAlreadyExists) {
      await updateDoc(ref, {
        goals: cleanGoals,
        totalGoals,
        completedGoals,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        date: dateKey,
        goals: cleanGoals,
        totalGoals,
        completedGoals,
        reflection: sanitizeReflection(existingReflection),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    // Fallback if local existence state was stale
    if (recordAlreadyExists) {
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            uid,
            date: dateKey,
            goals: cleanGoals,
            totalGoals,
            completedGoals,
            reflection: sanitizeReflection(existingReflection),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          return;
        }
      } catch {
        // Proceed to standard handler
      }
    }
    handleFirestoreError(
      error,
      recordAlreadyExists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveDailyReflection(
  uid: string,
  dateKey: string,
  reflection: string,
  recordAlreadyExists: boolean,
  existingGoals: GoalItem[] = []
): Promise<void> {
  if (!isValidDateKey(dateKey)) {
    throw new Error('Invalid calendar date key.');
  }
  const cleanReflection = sanitizeReflection(reflection);
  const cleanGoals = sanitizeGoalItems(existingGoals);
  const path = `users/${uid}/dailyRecords/${dateKey}`;
  const ref = doc(db, 'users', uid, 'dailyRecords', dateKey);

  try {
    if (recordAlreadyExists) {
      await updateDoc(ref, {
        reflection: cleanReflection,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        date: dateKey,
        goals: cleanGoals,
        totalGoals: cleanGoals.length,
        completedGoals: cleanGoals.filter((g) => g.completed).length,
        reflection: cleanReflection,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      recordAlreadyExists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export function validateBackupPayload(raw: unknown): BackupSchemaV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Backup file must be a valid JSON object.');
  }
  const candidate = raw as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) {
    throw new Error('Unsupported backup schema version. Expected schemaVersion: 1.');
  }
  if (!candidate.dailyRecords || typeof candidate.dailyRecords !== 'object') {
    throw new Error('Backup file is missing dailyRecords.');
  }

  const rawRecords = candidate.dailyRecords as Record<string, unknown>;
  const validatedRecords: BackupSchemaV1['dailyRecords'] = {};

  for (const [key, val] of Object.entries(rawRecords)) {
    if (!isValidDateKey(key)) {
      throw new Error(`Invalid date key "${key}" in backup file.`);
    }
    if (!val || typeof val !== 'object') {
      throw new Error(`Invalid record structure for ${key}.`);
    }
    const rec = val as Record<string, unknown>;
    if (!Array.isArray(rec.goals)) {
      throw new Error(`Goals for ${key} must be an array.`);
    }
    const rawGoals: GoalItem[] = rec.goals.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`Invalid goal entry at index ${idx} on ${key}.`);
      }
      const g = item as Record<string, unknown>;
      if (typeof g.text !== 'string' || g.text.trim().length === 0) {
        throw new Error(`Goal at index ${idx} on ${key} has empty text.`);
      }
      return {
        id: typeof g.id === 'string' ? g.id : `goal_${Date.now()}_${idx}`,
        text: g.text,
        completed: Boolean(g.completed),
        important: Boolean(g.important),
        order: typeof g.order === 'number' ? g.order : idx,
        createdAtMs: typeof g.createdAtMs === 'number' ? g.createdAtMs : Date.now(),
      };
    });

    validatedRecords[key] = {
      date: key,
      goals: sanitizeGoalItems(rawGoals),
      reflection: typeof rec.reflection === 'string' ? sanitizeReflection(rec.reflection) : '',
    };
  }

  const prefs =
    candidate.preferences && typeof candidate.preferences === 'object'
      ? (candidate.preferences as Record<string, unknown>)
      : {};

  const theme: ThemePreference =
    prefs.theme === 'dark' || prefs.theme === 'system' ? prefs.theme : 'light';
  const streakRule: StreakRule =
    prefs.streakRule === 'all_completed' ? 'all_completed' : 'any_completed';

  return {
    schemaVersion: 1,
    appName: typeof candidate.appName === 'string' ? candidate.appName : BRAND.name,
    exportedAt:
      typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
    preferences: {
      displayName:
        typeof prefs.displayName === 'string' ? sanitizeDisplayName(prefs.displayName) : '',
      theme,
      streakRule,
      reducedMotion: Boolean(prefs.reducedMotion),
    },
    dailyRecords: validatedRecords,
  };
}

export async function importBackupToFirestore(
  uid: string,
  backup: BackupSchemaV1,
  existingRecords: Record<string, DailyRecord>
): Promise<number> {
  const entries = Object.entries(backup.dailyRecords);
  // Firestore writeBatch supports up to 500 operations per batch
  const CHUNK_SIZE = 400;
  let importedCount = 0;

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const slice = entries.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const [dateKey, rec] of slice) {
      const cleanGoals = sanitizeGoalItems(rec.goals);
      const totalGoals = cleanGoals.length;
      const completedGoals = cleanGoals.filter((g) => g.completed).length;
      const cleanReflection = sanitizeReflection(rec.reflection);
      const ref = doc(db, 'users', uid, 'dailyRecords', dateKey);

      if (existingRecords[dateKey]) {
        batch.update(ref, {
          goals: cleanGoals,
          totalGoals,
          completedGoals,
          reflection: cleanReflection,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          uid,
          date: dateKey,
          goals: cleanGoals,
          totalGoals,
          completedGoals,
          reflection: cleanReflection,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      importedCount++;
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}/dailyRecords`);
    }
  }

  await updateUserPreferences(uid, {
    ...(backup.preferences.displayName ? { displayName: backup.preferences.displayName } : {}),
    theme: backup.preferences.theme,
    streakRule: backup.preferences.streakRule,
  });

  return importedCount;
}

export async function clearAllUserRecords(uid: string): Promise<number> {
  const path = `users/${uid}/dailyRecords`;
  try {
    const q = query(collection(db, 'users', uid, 'dailyRecords'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const docs = snap.docs;
    let deleted = 0;
    const CHUNK_SIZE = 400;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      for (const d of docs.slice(i, i + CHUNK_SIZE)) {
        batch.delete(d.ref);
        deleted++;
      }
      await batch.commit();
    }
    return deleted;
  } catch (error) {
    return handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteSingleDayRecord(uid: string, dateKey: string): Promise<void> {
  const path = `users/${uid}/dailyRecords/${dateKey}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'dailyRecords', dateKey));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
