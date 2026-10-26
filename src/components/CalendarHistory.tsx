import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import type { DailyRecord } from '../types/daylight';
import {
  formatRelativeDateLabel,
  formatShortWeekdayDate,
  getMonthGrid,
  parseLocalDateKey,
} from '../lib/dateUtils';

interface CalendarHistoryProps {
  selectedDateKey: string;
  todayDateKey: string;
  records: Record<string, DailyRecord>;
  onSelectDate: (dateKey: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function CalendarHistory({
  selectedDateKey,
  todayDateKey,
  records,
  onSelectDate,
}: CalendarHistoryProps) {
  const initialDate = parseLocalDateKey(selectedDateKey);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    const parsed = parseLocalDateKey(selectedDateKey);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
  }, [selectedDateKey]);

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(viewYear, viewMonth, 1, 12, 0, 0));

  const cells = getMonthGrid(viewYear, viewMonth);

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1, 12, 0, 0);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  // Chronological list of future dates that have scheduled plans or notes
  const upcomingScheduledRecords = useMemo(() => {
    return Object.values(records)
      .filter(
        (rec) =>
          rec.date > todayDateKey &&
          (rec.totalGoals > 0 || rec.reflection.trim().length > 0)
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records, todayDateKey]);

  return (
    <section
      aria-labelledby="history-calendar-heading"
      className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="history-calendar-heading"
            className="text-lg font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
          >
            Calendar & Planner
          </h2>
          <p className="mt-0.5 text-xs text-[#6B736D] dark:text-[#959E97]">
            Select any future date to plan ahead or revisit past days.
          </p>
        </div>

        {selectedDateKey !== todayDateKey && (
          <button
            type="button"
            onClick={() => onSelectDate(todayDateKey)}
            className="rounded-lg bg-[#4A6B53]/12 dark:bg-[#7CA386]/15 px-3 py-1.5 text-xs font-medium text-[#4A6B53] dark:text-[#7CA386] hover:bg-[#4A6B53]/20 transition-colors whitespace-nowrap shrink-0"
          >
            Today
          </button>
        )}
      </div>

      {/* Month Navigation Bar */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => stepMonth(-1)}
          aria-label="Previous month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B736D] dark:text-[#959E97] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <span className="text-sm font-medium text-[#1C1F1D] dark:text-[#F2F4F2]">
          {monthLabel}
        </span>

        <button
          type="button"
          onClick={() => stepMonth(1)}
          aria-label="Next month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B736D] dark:text-[#959E97] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Unrestricted Past, Present & Future Calendar Grid */}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1.5 text-[11px] font-medium text-[#8A928C] dark:text-[#6E7770]"
          >
            {day}
          </div>
        ))}

        {cells.map((dateKey, idx) => {
          if (!dateKey) {
            return <div key={`empty_${idx}`} className="h-11" aria-hidden="true" />;
          }

          const dayNum = Number(dateKey.slice(-2));
          const rec = records[dateKey];
          const isFuture = dateKey > todayDateKey;
          const isSelected = dateKey === selectedDateKey;
          const isToday = dateKey === todayDateKey;

          const hasGoals = Boolean(rec && rec.totalGoals > 0);
          const allDone = Boolean(hasGoals && rec.completedGoals === rec.totalGoals);
          const hasPartial = Boolean(!isFuture && hasGoals && rec.completedGoals > 0 && !allDone);
          const hasFuturePlans = Boolean(isFuture && hasGoals);
          const hasNoteOnly = Boolean(!hasGoals && rec && rec.reflection.trim().length > 0);

          let statusDescription = isFuture ? 'No upcoming plans yet' : 'No recorded goals';
          if (hasFuturePlans && rec) {
            statusDescription = `${rec.totalGoals} upcoming ${rec.totalGoals === 1 ? 'plan' : 'plans'} scheduled`;
          } else if (allDone && rec) {
            statusDescription = `All ${rec.totalGoals} goals completed`;
          } else if (hasGoals && rec) {
            statusDescription = `${rec.completedGoals} of ${rec.totalGoals} goals completed`;
          } else if (hasNoteOnly) {
            statusDescription = 'Note recorded';
          }

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              aria-label={`${dateKey}: ${statusDescription}`}
              aria-current={isSelected ? 'date' : undefined}
              className={`relative flex flex-col items-center justify-center h-11 rounded-xl text-xs font-mono-tabular transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53] ${
                isSelected
                  ? 'bg-[#1C1F1D] text-white dark:bg-[#F2F4F2] dark:text-[#121514] font-semibold'
                  : hasFuturePlans
                    ? 'border border-dashed border-[#4A6B53]/55 dark:border-[#7CA386]/55 bg-[#4A6B53]/[0.06] dark:bg-[#7CA386]/[0.09] text-[#2B4332] dark:text-[#CFE5D5] hover:bg-[#4A6B53]/15'
                    : allDone
                      ? 'bg-[#4A6B53]/14 text-[#2B4332] dark:bg-[#7CA386]/20 dark:text-[#CFE5D5] hover:bg-[#4A6B53]/22'
                      : hasPartial
                        ? 'bg-[#4A6B53]/[0.06] text-[#1C1F1D] dark:bg-[#7CA386]/[0.08] dark:text-[#E2E7E3] hover:bg-[#F3F2EE] dark:hover:bg-[#222724]'
                        : 'text-[#373D39] dark:text-[#C5CCC7] hover:bg-[#F3F2EE] dark:hover:bg-[#222724]'
              } ${isToday && !isSelected ? 'ring-1 ring-[#4A6B53] dark:ring-[#7CA386] font-semibold' : ''}`}
            >
              <span>{dayNum}</span>

              {/* Explicit non-hue-only micro-indicators */}
              {hasFuturePlans && rec && (
                <span
                  className={`text-[9px] leading-none mt-0.5 ${
                    isSelected
                      ? 'text-white/85 dark:text-[#121514]/85'
                      : 'text-[#4A6B53] dark:text-[#7CA386]'
                  }`}
                >
                  +{rec.totalGoals}
                </span>
              )}

              {!hasFuturePlans && allDone && (
                <Check
                  className={`h-2.5 w-2.5 mt-0.5 ${
                    isSelected
                      ? 'text-white dark:text-[#121514]'
                      : 'text-[#4A6B53] dark:text-[#7CA386]'
                  }`}
                  aria-hidden="true"
                />
              )}

              {!hasFuturePlans && !allDone && hasGoals && rec && (
                <span
                  className={`text-[9px] leading-none mt-0.5 ${
                    isSelected
                      ? 'text-white/80 dark:text-[#121514]/80'
                      : 'text-[#6B736D] dark:text-[#959E97]'
                  }`}
                >
                  {rec.completedGoals}/{rec.totalGoals}
                </span>
              )}

              {hasNoteOnly && (
                <FileText
                  className="h-2.5 w-2.5 mt-0.5 text-[#8A928C]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[#6B736D] dark:text-[#959E97]">
        <span className="inline-flex items-center gap-1">
          <Check className="h-3 w-3 text-[#4A6B53] dark:text-[#7CA386]" aria-hidden="true" />
          <span>100% done</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>n/m Partial</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#4A6B53] dark:text-[#7CA386] font-mono-tabular">+n Planned</span>
      </div>

      {/* Upcoming Plans Agenda */}
      <div
        id="upcoming"
        className="mt-6 pt-5 border-t border-[#EFECE6] dark:border-[#242926]"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2] flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-[#4A6B53] dark:text-[#7CA386]" aria-hidden="true" />
            <span>Upcoming Scheduled Plans</span>
          </h3>
          <span className="text-[11px] font-mono-tabular text-[#6B736D] dark:text-[#959E97]">
            {upcomingScheduledRecords.length}{' '}
            {upcomingScheduledRecords.length === 1 ? 'date' : 'dates'}
          </span>
        </div>

        {upcomingScheduledRecords.length === 0 ? (
          <p className="mt-2.5 text-xs leading-relaxed text-[#6B736D] dark:text-[#959E97]">
            Click any future day on the calendar above to schedule upcoming plans ahead of time.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[#EFECE6] dark:divide-[#242926]">
            {upcomingScheduledRecords.slice(0, 6).map((rec) => {
              const firstGoal = rec.goals[0]?.text;
              const isSelected = rec.date === selectedDateKey;
              return (
                <li key={rec.date}>
                  <button
                    type="button"
                    onClick={() => onSelectDate(rec.date)}
                    className={`w-full flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-[#F3F2EE] dark:bg-[#222724]'
                        : 'hover:bg-[#FAF9F6] dark:hover:bg-[#202522]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#1C1F1D] dark:text-[#F2F4F2]">
                        <span>{formatShortWeekdayDate(rec.date)}</span>
                        <span aria-hidden="true" className="text-[#8A928C]">·</span>
                        <span className="text-[#4A6B53] dark:text-[#7CA386] font-normal">
                          {formatRelativeDateLabel(rec.date, todayDateKey)}
                        </span>
                      </div>
                      {firstGoal && (
                        <p className="mt-0.5 truncate text-xs text-[#6B736D] dark:text-[#959E97]">
                          {firstGoal}
                          {rec.totalGoals > 1 ? ` (+${rec.totalGoals - 1} more)` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono-tabular text-[#6B736D] dark:text-[#959E97]">
                      <span>{rec.totalGoals}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
