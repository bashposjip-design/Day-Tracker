export type ThemePreference = 'light' | 'dark' | 'system';
export type StreakRule = 'any_completed' | 'all_completed';
export type ChartRange = '7d' | '30d' | 'all';

export interface GoalItem {
  id: string;
  text: string;
  completed: boolean;
  important: boolean;
  order: number;
  createdAtMs: number;
}

export interface DailyRecord {
  uid: string;
  date: string; // YYYY-MM-DD in local calendar time
  goals: GoalItem[];
  totalGoals: number;
  completedGoals: number;
  reflection: string;
  updatedAtMs?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  theme: ThemePreference;
  streakRule: StreakRule;
}

export interface LocalPreferences {
  theme: ThemePreference;
  reducedMotion: boolean;
}

export interface BackupSchemaV1 {
  schemaVersion: 1;
  appName: string;
  exportedAt: string;
  preferences: {
    displayName: string;
    theme: ThemePreference;
    streakRule: StreakRule;
    reducedMotion: boolean;
  };
  dailyRecords: Record<
    string,
    {
      date: string;
      goals: GoalItem[];
      reflection: string;
    }
  >;
}

/**
 * Reserved structure for optional future voluntary sharing feature (Section 15.G).
 * Private goals are never shared publicly by default; any future share must be opt-in.
 */
export interface VoluntaryShareConsent {
  enabled: boolean;
  sharedDates: string[];
  includeReflections: boolean;
}
