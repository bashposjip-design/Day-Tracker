import { useState } from 'react';
import { Check, Copy, Settings, Sun } from 'lucide-react';
import { BRAND, getShareableSiteUrl } from '../config/brand';
import type {
  BackupSchemaV1,
  DailyRecord,
  GoalItem,
  LocalPreferences,
  StreakRule,
  ThemePreference,
  UserProfile,
} from '../types/daylight';
import { formatFullDate, getTimeAwareGreeting } from '../lib/dateUtils';
import { QuoteCard } from './QuoteCard';
import { DailyGoalsCard } from './DailyGoalsCard';
import { CalendarHistory } from './CalendarHistory';
import { DailyReflection } from './DailyReflection';
import { ProgressSection } from './ProgressSection';
import { SettingsModal } from './SettingsModal';

interface DashboardViewProps {
  userEmail: string | null;
  profile: UserProfile;
  localPrefs: LocalPreferences;
  todayDateKey: string;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  records: Record<string, DailyRecord>;
  isLoadingRecords: boolean;
  syncError: string | null;
  onSaveGoalsForDate: (dateKey: string, goals: GoalItem[]) => Promise<void>;
  onSaveReflectionForDate: (dateKey: string, reflection: string) => Promise<void>;
  onUpdateProfile: (updates: {
    displayName?: string;
    theme?: ThemePreference;
    streakRule?: StreakRule;
  }) => Promise<void>;
  onUpdateLocalPrefs: (prefs: LocalPreferences) => void;
  onImportBackup: (backup: BackupSchemaV1) => Promise<number>;
  onClearAllData: () => Promise<number>;
  onSignOut: () => Promise<void>;
}

export function DashboardView({
  userEmail,
  profile,
  localPrefs,
  todayDateKey,
  selectedDateKey,
  onSelectDate,
  records,
  isLoadingRecords,
  syncError,
  onSaveGoalsForDate,
  onSaveReflectionForDate,
  onUpdateProfile,
  onUpdateLocalPrefs,
  onImportBackup,
  onClearAllData,
  onSignOut,
}: DashboardViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const greeting = getTimeAwareGreeting();
  const firstName = profile.displayName.trim().split(/\s+/)[0] || '';
  const selectedRecord = records[selectedDateKey];
  const currentGoals = selectedRecord ? selectedRecord.goals : [];
  const currentReflection = selectedRecord ? selectedRecord.reflection : '';

  const handleSaveGoals = async (nextGoals: GoalItem[]) => {
    setSavingGoals(true);
    try {
      await onSaveGoalsForDate(selectedDateKey, nextGoals);
    } finally {
      setSavingGoals(false);
    }
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(getShareableSiteUrl());
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      // Ignore clipboard failure silently
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#121514] text-[#1C1F1D] dark:text-[#F2F4F2]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-[#E7E5DF] dark:border-[#262B28] bg-[#FAF9F6]/90 dark:bg-[#121514]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-5 sm:px-8 py-3.5">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#workspace-top"
            onClick={(e) => {
              e.preventDefault();
              onSelectDate(todayDateKey);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-lg font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2] whitespace-nowrap shrink-0"
          >
            {BRAND.name}
          </a>

          {/* Zone 2: 4 Single-Line Workspace Section Links */}
          <nav
            aria-label="Workspace sections"
            className="hidden md:flex items-center gap-7 text-sm text-[#5C645E] dark:text-[#9CA59E]"
          >
            <a
              href="#intentions"
              onClick={() => onSelectDate(todayDateKey)}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Today
            </a>
            <a
              href="#archive"
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Archive
            </a>
            <a
              href="#reflection"
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Reflect
            </a>
            <a
              href="#progress"
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Progress
            </a>
          </nav>

          {/* Zone 3: 1 Primary Settings Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open workspace settings and backup options"
              className="inline-flex items-center gap-2 rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-white dark:bg-[#181C1A] px-3.5 py-2 text-xs font-medium text-[#1C1F1D] dark:text-[#F2F4F2] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
            >
              <Settings className="h-3.5 w-3.5 text-[#5C645E] dark:text-[#9CA59E]" aria-hidden="true" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main
        id="workspace-top"
        className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8 py-8 sm:py-12 space-y-10"
      >
        {/* Sync Error Banner (if any Firestore/quota issue occurs) */}
        {syncError && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
          >
            {syncError}
          </div>
        )}

        {/* 1. Morning Welcome Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
              <Sun className="h-3.5 w-3.5 text-[#4A6B53] dark:text-[#7CA386]" aria-hidden="true" />
              <span>{formatFullDate(todayDateKey)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {greeting}
                {firstName ? `, ${firstName}` : ''}
              </span>
            </div>

            <h1
              className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
              style={{ textWrap: 'balance' }}
            >
              Make today count.
            </h1>

            <p className="mt-1.5 text-sm sm:text-base text-[#5C645E] dark:text-[#9CA59E]">
              Set clear, realistic intentions for the day ahead and move through them one calm step at a time.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={() => void handleCopyShareUrl()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] px-3.5 py-2 text-xs font-medium text-[#5C645E] dark:text-[#9CA59E] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors whitespace-nowrap shrink-0"
            >
              {copiedShare ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#4A6B53]" aria-hidden="true" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy Website Link</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* 2. Floating Daily Motivational Quote */}
        <QuoteCard todayDateKey={todayDateKey} />

        {/* 3. Primary Workspace Split: Daily Goals + Reflection (Left) & Archive Calendar (Right) */}
        {isLoadingRecords ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-8 space-y-4">
              <div className="h-6 w-48 rounded bg-[#EFECE6] dark:bg-[#252A27] animate-pulse" />
              <div className="h-4 w-72 rounded bg-[#F5F4F0] dark:bg-[#202522] animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-[#F5F4F0] dark:bg-[#202522] animate-pulse mt-4" />
              <div className="h-12 w-full rounded-xl bg-[#F5F4F0] dark:bg-[#202522] animate-pulse" />
            </div>
            <div className="lg:col-span-4 rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-7 h-80 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div id="intentions" className="lg:col-span-8 space-y-8">
              <DailyGoalsCard
                selectedDateKey={selectedDateKey}
                todayDateKey={todayDateKey}
                goals={currentGoals}
                onSaveGoals={handleSaveGoals}
                onJumpToToday={() => onSelectDate(todayDateKey)}
                isSaving={savingGoals}
              />

              <div id="reflection">
                <DailyReflection
                  selectedDateKey={selectedDateKey}
                  todayDateKey={todayDateKey}
                  savedReflection={currentReflection}
                  onSaveReflection={(text) =>
                    onSaveReflectionForDate(selectedDateKey, text)
                  }
                />
              </div>
            </div>

            <div id="archive" className="lg:col-span-4">
              <CalendarHistory
                selectedDateKey={selectedDateKey}
                todayDateKey={todayDateKey}
                records={records}
                onSelectDate={onSelectDate}
              />
            </div>
          </div>
        )}

        {/* 4. Historical Progress Statistics & Pathway Line Chart */}
        <div id="progress" className="pt-2">
          <ProgressSection
            records={records}
            todayDateKey={todayDateKey}
            streakRule={profile.streakRule}
            onSelectDate={(dateKey) => {
              onSelectDate(dateKey);
              document
                .getElementById('intentions')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      </main>

      {/* Discreet Footer */}
      <footer className="border-t border-[#E7E5DF] dark:border-[#262B28] py-8 mt-8">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B736D] dark:text-[#959E97]">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {BRAND.name} — {BRAND.tagline}
            </span>
            <span aria-hidden="true">·</span>
            <span>Private account ({userEmail || 'Signed in'})</span>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
            >
              Backup & Settings
            </button>
            <button
              type="button"
              onClick={() => void handleCopyShareUrl()}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
            >
              {copiedShare ? 'Link Copied' : 'Share Website'}
            </button>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </footer>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userEmail={userEmail}
        profile={profile}
        localPrefs={localPrefs}
        records={records}
        onUpdateProfile={onUpdateProfile}
        onUpdateLocalPrefs={onUpdateLocalPrefs}
        onImportBackup={onImportBackup}
        onClearAllData={onClearAllData}
        onSignOut={async () => {
          setSettingsOpen(false);
          await onSignOut();
        }}
      />
    </div>
  );
}
