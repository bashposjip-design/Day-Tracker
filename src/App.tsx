import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  clearAllUserRecords,
  ensureUserProfile,
  formatFriendlyDataError,
  importBackupToFirestore,
  saveDailyGoals,
  saveDailyReflection,
  subscribeToDailyRecords,
  updateUserPreferences,
} from './lib/firestoreService';
import { getLocalDateKey } from './lib/dateUtils';
import {
  applyThemeAndMotionToDom,
  clearUserRecordsCache,
  loadLocalPreferences,
  loadUserRecordsCache,
  saveLocalPreferences,
  saveUserRecordsCache,
} from './lib/storagePreferences';
import type {
  BackupSchemaV1,
  DailyRecord,
  GoalItem,
  LocalPreferences,
  StreakRule,
  ThemePreference,
  UserProfile,
} from './types/daylight';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { AuthModal, type AuthMode } from './components/AuthModal';
import { VerifyEmailScreen } from './components/VerifyEmailScreen';
import { DashboardView } from './components/DashboardView';

export default function App() {
  const [localPrefs, setLocalPrefs] = useState<LocalPreferences>(() =>
    loadLocalPreferences()
  );
  const [todayDateKey, setTodayDateKey] = useState<string>(() => getLocalDateKey());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    getLocalDateKey()
  );

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [emailVerifiedFlag, setEmailVerifiedFlag] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('signin');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync theme and reduced-motion preferences to DOM
  useEffect(() => {
    applyThemeAndMotionToDom(localPrefs);
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (localPrefs.theme === 'system') {
        applyThemeAndMotionToDom(localPrefs);
      }
    };
    media?.addEventListener?.('change', onSystemChange);
    return () => media?.removeEventListener?.('change', onSystemChange);
  }, [localPrefs]);

  const handleUpdateLocalPrefs = useCallback((next: LocalPreferences) => {
    setLocalPrefs(next);
    saveLocalPreferences(next);
  }, []);

  // Automatically detect midnight rollover into a new calendar day without overwriting yesterday
  useEffect(() => {
    const timer = window.setInterval(() => {
      const latestToday = getLocalDateKey();
      setTodayDateKey((prevToday) => {
        if (latestToday !== prevToday) {
          setSelectedDateKey((prevSelected) =>
            prevSelected === prevToday ? latestToday : prevSelected
          );
          return latestToday;
        }
        return prevToday;
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Track Firebase Authentication state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setEmailVerifiedFlag(Boolean(user?.emailVerified));
      setAuthReady(true);

      if (!user) {
        setProfile(null);
        setRecords({});
        setSyncError(null);
        setLoadingRecords(false);
      }
    });
    return () => unsub();
  }, []);

  // Initialize user profile and attach real-time Firestore listener ONLY when authenticated & verified
  useEffect(() => {
    if (!authReady || !currentUser || !emailVerifiedFlag) {
      return;
    }

    let cancelled = false;
    let unsubscribeRecords: (() => void) | null = null;

    // Seed from UID-isolated local cache for fast initial paint while awaiting server snapshot
    const cached = loadUserRecordsCache(currentUser.uid);
    if (Object.keys(cached).length > 0) {
      setRecords(cached);
    } else {
      setLoadingRecords(true);
    }

    (async () => {
      try {
        setSyncError(null);
        const ensuredProfile = await ensureUserProfile(currentUser, localPrefs.theme);
        if (cancelled) return;
        setProfile(ensuredProfile);

        // Sync saved cloud theme preference
        setLocalPrefs((prev) => {
          const updated: LocalPreferences = {
            ...prev,
            theme: ensuredProfile.theme,
          };
          saveLocalPreferences(updated);
          return updated;
        });

        unsubscribeRecords = subscribeToDailyRecords(
          currentUser.uid,
          (incomingRecords) => {
            if (cancelled) return;
            setRecords(incomingRecords);
            saveUserRecordsCache(currentUser.uid, incomingRecords);
            setLoadingRecords(false);
          },
          (err) => {
            if (cancelled) return;
            setSyncError(formatFriendlyDataError(err));
            setLoadingRecords(false);
          }
        );
      } catch (err) {
        if (cancelled) return;
        setSyncError(formatFriendlyDataError(err));
        setLoadingRecords(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribeRecords) {
        unsubscribeRecords();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, currentUser?.uid, emailVerifiedFlag]);

  const handleSaveGoalsForDate = async (dateKey: string, nextGoals: GoalItem[]) => {
    if (!currentUser) return;
    setSyncError(null);
    const existing = records[dateKey];

    // Optimistic UI update scoped to this user
    setRecords((prev) => ({
      ...prev,
      [dateKey]: {
        uid: currentUser.uid,
        date: dateKey,
        goals: nextGoals,
        totalGoals: nextGoals.length,
        completedGoals: nextGoals.filter((g) => g.completed).length,
        reflection: existing?.reflection ?? '',
      },
    }));

    try {
      await saveDailyGoals(
        currentUser.uid,
        dateKey,
        nextGoals,
        Boolean(existing),
        existing?.reflection ?? ''
      );
    } catch (err) {
      setSyncError(formatFriendlyDataError(err));
    }
  };

  const handleSaveReflectionForDate = async (dateKey: string, reflection: string) => {
    if (!currentUser) return;
    setSyncError(null);
    const existing = records[dateKey];

    setRecords((prev) => ({
      ...prev,
      [dateKey]: {
        uid: currentUser.uid,
        date: dateKey,
        goals: existing?.goals ?? [],
        totalGoals: existing?.totalGoals ?? 0,
        completedGoals: existing?.completedGoals ?? 0,
        reflection,
      },
    }));

    try {
      await saveDailyReflection(
        currentUser.uid,
        dateKey,
        reflection,
        Boolean(existing),
        existing?.goals ?? []
      );
    } catch (err) {
      setSyncError(formatFriendlyDataError(err));
    }
  };

  const handleUpdateProfile = async (updates: {
    displayName?: string;
    theme?: ThemePreference;
    streakRule?: StreakRule;
  }) => {
    if (!currentUser || !profile) return;
    await updateUserPreferences(currentUser.uid, updates);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...(updates.displayName !== undefined
              ? { displayName: updates.displayName.trim() }
              : {}),
            ...(updates.theme !== undefined ? { theme: updates.theme } : {}),
            ...(updates.streakRule !== undefined
              ? { streakRule: updates.streakRule }
              : {}),
          }
        : prev
    );
  };

  const handleImportBackup = async (backup: BackupSchemaV1): Promise<number> => {
    if (!currentUser) return 0;
    const count = await importBackupToFirestore(currentUser.uid, backup, records);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...(backup.preferences.displayName
              ? { displayName: backup.preferences.displayName }
              : {}),
            theme: backup.preferences.theme,
            streakRule: backup.preferences.streakRule,
          }
        : prev
    );
    return count;
  };

  const handleClearAllData = async (): Promise<number> => {
    if (!currentUser) return 0;
    const removed = await clearAllUserRecords(currentUser.uid);
    clearUserRecordsCache(currentUser.uid);
    setRecords({});
    return removed;
  };

  const handleSignOut = async () => {
    if (currentUser) {
      clearUserRecordsCache(currentUser.uid);
    }
    setSelectedDateKey(getLocalDateKey());
    await signOut(auth);
  };

  return (
    <ErrorBoundary>
      {!authReady ? (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#121514]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-[#4A6B53] border-t-transparent animate-spin" />
            <p className="text-xs text-[#6B736D] dark:text-[#959E97]">
              Opening Daylight...
            </p>
          </div>
        </div>
      ) : !currentUser ? (
        <>
          <LandingPage
            todayDateKey={todayDateKey}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode);
              setAuthModalOpen(true);
            }}
          />
          <AuthModal
            isOpen={authModalOpen}
            initialMode={authModalMode}
            onClose={() => setAuthModalOpen(false)}
          />
        </>
      ) : !emailVerifiedFlag ? (
        <VerifyEmailScreen
          user={currentUser}
          onVerified={() => setEmailVerifiedFlag(true)}
        />
      ) : (
        <DashboardView
          userEmail={currentUser.email}
          profile={
            profile ?? {
              uid: currentUser.uid,
              displayName: currentUser.displayName || '',
              theme: localPrefs.theme,
              streakRule: 'any_completed',
            }
          }
          localPrefs={localPrefs}
          todayDateKey={todayDateKey}
          selectedDateKey={selectedDateKey}
          onSelectDate={setSelectedDateKey}
          records={records}
          isLoadingRecords={loadingRecords && !profile}
          syncError={syncError}
          onSaveGoalsForDate={handleSaveGoalsForDate}
          onSaveReflectionForDate={handleSaveReflectionForDate}
          onUpdateProfile={handleUpdateProfile}
          onUpdateLocalPrefs={handleUpdateLocalPrefs}
          onImportBackup={handleImportBackup}
          onClearAllData={handleClearAllData}
          onSignOut={handleSignOut}
        />
      )}
    </ErrorBoundary>
  );
}
