import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  LogOut,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { BRAND } from '../config/brand';
import type {
  BackupSchemaV1,
  DailyRecord,
  LocalPreferences,
  StreakRule,
  ThemePreference,
  UserProfile,
} from '../types/daylight';
import { getLocalDateKey } from '../lib/dateUtils';
import { validateBackupPayload } from '../lib/firestoreService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
  profile: UserProfile;
  localPrefs: LocalPreferences;
  records: Record<string, DailyRecord>;
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

export function SettingsModal({
  isOpen,
  onClose,
  userEmail,
  profile,
  localPrefs,
  records,
  onUpdateProfile,
  onUpdateLocalPrefs,
  onImportBackup,
  onClearAllData,
  onSignOut,
}: SettingsModalProps) {
  const [nameDraft, setNameDraft] = useState(profile.displayName);
  const [savingName, setSavingName] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setNameDraft(profile.displayName);
    setConfirmClear(false);
    setStatusNotice(null);
  }, [profile.displayName, isOpen]);

  if (!isOpen) return null;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    setStatusNotice(null);
    try {
      await onUpdateProfile({ displayName: nameDraft });
      setStatusNotice({ type: 'success', text: 'Display name updated.' });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update name.',
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleThemeChange = async (theme: ThemePreference) => {
    onUpdateLocalPrefs({ ...localPrefs, theme });
    try {
      await onUpdateProfile({ theme });
    } catch {
      // Local theme still applies immediately
    }
  };

  const handleStreakRuleChange = async (streakRule: StreakRule) => {
    try {
      await onUpdateProfile({ streakRule });
      setStatusNotice({ type: 'success', text: 'Streak calculation rule updated.' });
    } catch {
      setStatusNotice({ type: 'error', text: 'Could not save streak rule.' });
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setStatusNotice({
        type: 'error',
        text: `Copy manually: ${window.location.origin}`,
      });
    }
  };

  const handleExportJson = () => {
    const exportRecords: BackupSchemaV1['dailyRecords'] = {};
    for (const [dateKey, rec] of Object.entries(records)) {
      exportRecords[dateKey] = {
        date: dateKey,
        goals: rec.goals,
        reflection: rec.reflection,
      };
    }

    const payload: BackupSchemaV1 = {
      schemaVersion: 1,
      appName: BRAND.name,
      exportedAt: new Date().toISOString(),
      preferences: {
        displayName: profile.displayName,
        theme: localPrefs.theme,
        streakRule: profile.streakRule,
        reducedMotion: localPrefs.reducedMotion,
      },
      dailyRecords: exportRecords,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daylight-backup-${getLocalDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusNotice({ type: 'success', text: 'JSON backup downloaded.' });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusyAction(true);
    setStatusNotice(null);
    try {
      const text = await file.text();
      const parsedJson: unknown = JSON.parse(text);
      const validated = validateBackupPayload(parsedJson);
      const count = await onImportBackup(validated);
      onUpdateLocalPrefs({
        theme: validated.preferences.theme,
        reducedMotion: validated.preferences.reducedMotion,
      });
      setStatusNotice({
        type: 'success',
        text: `Successfully imported ${count} daily ${count === 1 ? 'record' : 'records'}.`,
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        text:
          err instanceof Error
            ? `Import failed: ${err.message}`
            : 'Invalid backup JSON file.',
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setBusyAction(true);
    setStatusNotice(null);
    try {
      const removed = await onClearAllData();
      setConfirmClear(false);
      setStatusNotice({
        type: 'success',
        text: `Cleared ${removed} daily ${removed === 1 ? 'record' : 'records'} from your account.`,
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to clear records.',
      });
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busyAction) onClose();
      }}
    >
      <div className="my-8 w-full max-w-xl rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="settings-modal-title"
              className="text-xl font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
            >
              Workspace & Data Settings
            </h2>
            <p className="mt-1 text-xs text-[#6B736D] dark:text-[#959E97]">
              Signed in as {userEmail || 'Authenticated User'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B736D] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {statusNotice && (
          <div
            role="status"
            className={`mt-4 rounded-xl px-4 py-3 text-xs ${
              statusNotice.type === 'success'
                ? 'bg-[#4A6B53]/12 text-[#2B4332] dark:bg-[#7CA386]/15 dark:text-[#CFE5D5]'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
            }`}
          >
            {statusNotice.text}
          </div>
        )}

        <div className="mt-6 space-y-6 divide-y divide-[#EFECE6] dark:divide-[#242926]">
          {/* Profile Greeting Name */}
          <form onSubmit={handleSaveName} className="space-y-2">
            <label
              htmlFor="settings-display-name"
              className="block text-xs font-medium text-[#4C544E] dark:text-[#B4BDB6]"
            >
              Greeting Name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="settings-display-name"
                type="text"
                maxLength={BRAND.maxDisplayNameLength}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Your name"
                className="flex-1 rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] px-3.5 py-2 text-sm text-[#1C1F1D] dark:text-[#F2F4F2] focus:border-[#4A6B53] focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingName || nameDraft.trim() === profile.displayName}
                className="rounded-xl bg-[#4A6B53] px-4 py-2 text-xs font-medium text-white hover:bg-[#3D5A45] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                {savingName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>

          {/* Appearance & Motion */}
          <div className="pt-5 space-y-4">
            <div>
              <span className="block text-xs font-medium text-[#4C544E] dark:text-[#B4BDB6] mb-2">
                Theme Preference
              </span>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F3F2EE] dark:bg-[#222724] p-1">
                {(
                  [
                    { id: 'light', label: 'Warm White' },
                    { id: 'dark', label: 'Calm Dark' },
                    { id: 'system', label: 'System' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => void handleThemeChange(opt.id)}
                    className={`rounded-lg py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      localPrefs.theme === opt.id
                        ? 'bg-white dark:bg-[#181C1A] text-[#1C1F1D] dark:text-[#F2F4F2] shadow-xs'
                        : 'text-[#6B736D] dark:text-[#959E97]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#4C544E] dark:text-[#B4BDB6] mb-2">
                Consistency Streak Rule
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl bg-[#F3F2EE] dark:bg-[#222724] p-1">
                <button
                  type="button"
                  onClick={() => void handleStreakRuleChange('any_completed')}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    profile.streakRule === 'any_completed'
                      ? 'bg-white dark:bg-[#181C1A] text-[#1C1F1D] dark:text-[#F2F4F2] shadow-xs'
                      : 'text-[#6B736D] dark:text-[#959E97]'
                  }`}
                >
                  At least 1 goal completed
                </button>
                <button
                  type="button"
                  onClick={() => void handleStreakRuleChange('all_completed')}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    profile.streakRule === 'all_completed'
                      ? 'bg-white dark:bg-[#181C1A] text-[#1C1F1D] dark:text-[#F2F4F2] shadow-xs'
                      : 'text-[#6B736D] dark:text-[#959E97]'
                  }`}
                >
                  100% of daily goals completed
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#1C1F1D] dark:text-[#F2F4F2]">
                  Reduce Motion
                </p>
                <p className="text-xs text-[#6B736D] dark:text-[#959E97]">
                  Disables floating quote movement and transition animations.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={localPrefs.reducedMotion}
                onClick={() =>
                  onUpdateLocalPrefs({
                    ...localPrefs,
                    reducedMotion: !localPrefs.reducedMotion,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53] ${
                  localPrefs.reducedMotion ? 'bg-[#4A6B53]' : 'bg-[#D5D3CC] dark:bg-[#323834]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localPrefs.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Share Website Link */}
          <div className="pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#1C1F1D] dark:text-[#F2F4F2]">
                  Share {BRAND.name} with Friends
                </p>
                <p className="text-xs text-[#6B736D] dark:text-[#959E97]">
                  Sharing the website URL invites others to create their own private workspace. Your goals remain strictly private.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyShareLink()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] px-3.5 py-2 text-xs font-medium text-[#1C1F1D] dark:text-[#F2F4F2] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] whitespace-nowrap shrink-0"
              >
                {copiedLink ? (
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
          </div>

          {/* JSON Backup, Restore & Clear Data */}
          <div className="pt-5 space-y-3">
            <p className="text-sm font-medium text-[#1C1F1D] dark:text-[#F2F4F2]">
              Data Backup & Portability
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                disabled={busyAction}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] px-3.5 py-2 text-xs font-medium text-[#1C1F1D] dark:text-[#F2F4F2] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void handleImportFile(e)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busyAction}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] px-3.5 py-2 text-xs font-medium text-[#1C1F1D] dark:text-[#F2F4F2] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] whitespace-nowrap shrink-0"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Import JSON Backup</span>
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={busyAction}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear All Data</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-1.5">
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">
                    Delete all {Object.keys(records).length} days permanently?
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleConfirmClearAll()}
                    disabled={busyAction}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    disabled={busyAction}
                    className="rounded-lg px-2 py-1 text-xs text-[#6B736D] hover:text-[#1C1F1D]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Honest Storage & Free-Tier Quota Notes */}
          <div className="pt-5 space-y-2 text-xs leading-relaxed text-[#6B736D] dark:text-[#959E97]">
            <p className="font-medium text-[#4C544E] dark:text-[#B4BDB6]">
              About Storage, Privacy & Service Quotas
            </p>
            <p>
              Your daily goals and reflections are stored privately in Cloud Firestore under your authenticated user ID (<code>users/&#123;uid&#125;/dailyRecords/&#123;date&#125;</code>) and enforced by server-side security rules. Signing in on another browser or device restores your cloud records automatically.
            </p>
            <p>
              Browser <code>localStorage</code> is used only for display preferences (theme, reduced motion) and temporary local read caching on this device—local browser preferences alone do not sync without signing in. Cloud storage operates within Firebase’s free Spark tier daily read/write quotas.
            </p>
          </div>

          {/* Sign Out */}
          <div className="pt-5 flex justify-between items-center">
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] px-4 py-2 text-xs font-medium text-[#1C1F1D] dark:text-[#F2F4F2] hover:bg-[#F3F2EE] dark:hover:bg-[#222724]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#1C1F1D] dark:bg-[#F2F4F2] px-4 py-2 text-xs font-medium text-white dark:text-[#121514]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
