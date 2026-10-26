import type { ChartRange, DailyRecord, StreakRule } from '../types/daylight';
import { shiftDateKey } from './dateUtils';

export interface ProgressStatsSummary {
  todayTotal: number;
  todayCompleted: number;
  todayPercent: number | null; // null when today has 0 goals
  perfectDaysCount: number;
  activeDaysCount: number;
  averageCompletionPercent: number | null; // null when 0 days have goals
  currentStreak: number;
}

export interface ChartDataPoint {
  date: string;
  completedGoals: number;
  totalGoals: number;
  percentage: number; // 0..100
}

export function calculateDayPercent(record: DailyRecord | undefined): number | null {
  if (!record || record.totalGoals <= 0) return null;
  return Math.round((record.completedGoals / record.totalGoals) * 100);
}

function meetsStreakRule(record: DailyRecord | undefined, rule: StreakRule): boolean {
  if (!record || record.totalGoals <= 0) return false;
  if (rule === 'all_completed') {
    return record.completedGoals === record.totalGoals;
  }
  return record.completedGoals >= 1;
}

export function computeProgressStats(
  records: Record<string, DailyRecord>,
  todayDateKey: string,
  streakRule: StreakRule
): ProgressStatsSummary {
  const todayRecord = records[todayDateKey];
  const todayTotal = todayRecord ? todayRecord.totalGoals : 0;
  const todayCompleted = todayRecord ? todayRecord.completedGoals : 0;
  const todayPercent = calculateDayPercent(todayRecord);

  let activeDaysCount = 0;
  let perfectDaysCount = 0;
  let sumPercentages = 0;

  for (const rec of Object.values(records)) {
    if (rec.totalGoals > 0) {
      activeDaysCount += 1;
      const pct = (rec.completedGoals / rec.totalGoals) * 100;
      sumPercentages += pct;
      if (rec.completedGoals === rec.totalGoals) {
        perfectDaysCount += 1;
      }
    }
  }

  const averageCompletionPercent =
    activeDaysCount > 0 ? Math.round(sumPercentages / activeDaysCount) : null;

  // Streak calculation across consecutive local calendar days:
  // If today already qualifies, count backward starting from today.
  // If today does not yet qualify, count backward starting from yesterday so morning resets stay encouraging.
  let currentStreak = 0;
  let cursor = meetsStreakRule(todayRecord, streakRule)
    ? todayDateKey
    : shiftDateKey(todayDateKey, -1);

  while (meetsStreakRule(records[cursor], streakRule)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
    if (currentStreak > 3650) break;
  }

  return {
    todayTotal,
    todayCompleted,
    todayPercent,
    perfectDaysCount,
    activeDaysCount,
    averageCompletionPercent,
    currentStreak,
  };
}

/**
 * Builds chronological chart points strictly from days that have at least 1 recorded goal.
 * Zero-goal days are intentionally excluded from the completion-rate curve so they are never
 * misleadingly plotted as 100% or fabricated values.
 */
export function buildChartSeries(
  records: Record<string, DailyRecord>,
  todayDateKey: string,
  range: ChartRange
): { points: ChartDataPoint[]; unrecordedDaysInWindow: number } {
  const allActiveDates = Object.keys(records)
    .filter((d) => records[d] && records[d].totalGoals > 0 && d <= todayDateKey)
    .sort();

  if (range === 'all') {
    const points = allActiveDates.map((d) => {
      const rec = records[d];
      return {
        date: d,
        completedGoals: rec.completedGoals,
        totalGoals: rec.totalGoals,
        percentage: Math.round((rec.completedGoals / rec.totalGoals) * 100),
      };
    });
    return { points, unrecordedDaysInWindow: 0 };
  }

  const windowDays = range === '7d' ? 7 : 30;
  const startDateKey = shiftDateKey(todayDateKey, -(windowDays - 1));
  const points: ChartDataPoint[] = [];
  let unrecordedDaysInWindow = 0;

  for (let i = 0; i < windowDays; i++) {
    const d = shiftDateKey(startDateKey, i);
    const rec = records[d];
    if (rec && rec.totalGoals > 0) {
      points.push({
        date: d,
        completedGoals: rec.completedGoals,
        totalGoals: rec.totalGoals,
        percentage: Math.round((rec.completedGoals / rec.totalGoals) * 100),
      });
    } else {
      unrecordedDaysInWindow += 1;
    }
  }

  return { points, unrecordedDaysInWindow };
}
