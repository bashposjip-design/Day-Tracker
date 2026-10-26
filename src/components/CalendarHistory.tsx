import { useEffect, useState } from 'react';
import { Calendar, Check, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { DailyRecord } from '../types/daylight';
import { getMonthGrid, isValidDateKey, parseLocalDateKey } from '../lib/dateUtils';

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

  // Sync calendar month when selectedDateKey changes externally (e.g. clicking a chart point)
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

  return (
    <section
      aria-labelledby="history-calendar-heading"
      className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="history-calendar-heading"
            className="text-lg font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
          >
            Daily Archive
          </h2>
          <p className="mt-0.5 text-xs text-[#6B736D] dark:text-[#959E97]">
            Select any date to revisit past goals or reflections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="jump-to-date" className="sr-only">
            Jump to specific date
          </label>
          <div className="relative flex items-center">
            <Calendar
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#6B736D] dark:text-[#959E97]"
              aria-hidden="true"
            />
            <input
              id="jump-to-date"
              type="date"
              value={selectedDateKey}
              max={todayDateKey}
              onChange={(e) => {
                if (isValidDateKey(e.target.value)) {
                  onSelectDate(e.target.value);
                }
              }}
              className="rounded-lg border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] pl-8 pr-2.5 py-1.5 text-xs font-mono-tabular text-[#1C1F1D] dark:text-[#F2F4F2] focus:border-[#4A6B53] focus:outline-none"
            />
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

      {/* Calendar Grid */}
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
            return <div key={`empty_${idx}`} className="h-10" aria-hidden="true" />;
          }

          const dayNum = Number(dateKey.slice(-2));
          const rec = records[dateKey];
          const hasGoals = Boolean(rec && rec.totalGoals > 0);
          const allDone = Boolean(hasGoals && rec.completedGoals === rec.totalGoals);
          const hasPartial = Boolean(hasGoals && rec.completedGoals > 0 && !allDone);
          const hasReflectionOnly = Boolean(!hasGoals && rec && rec.reflection.trim().length > 0);
          const isSelected = dateKey === selectedDateKey;
          const isToday = dateKey === todayDateKey;
          const isFuture = dateKey > todayDateKey;

          let statusDescription = 'No recorded goals';
          if (allDone && rec) {
            statusDescription = `All ${rec.totalGoals} goals completed`;
          } else if (hasGoals && rec) {
            statusDescription = `${rec.completedGoals} of ${rec.totalGoals} goals completed`;
          } else if (hasReflectionOnly) {
            statusDescription = 'Reflection recorded';
          }

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(dateKey)}
              aria-label={`${dateKey}: ${statusDescription}`}
              aria-current={isSelected ? 'date' : undefined}
              className={`relative flex flex-col items-center justify-center h-11 rounded-xl text-xs font-mono-tabular transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53] ${
                isFuture
                  ? 'opacity-30 cursor-not-allowed text-[#8A928C]'
                  : isSelected
                    ? 'bg-[#1C1F1D] text-white dark:bg-[#F2F4F2] dark:text-[#121514] font-semibold'
                    : allDone
                      ? 'bg-[#4A6B53]/14 text-[#2B4332] dark:bg-[#7CA386]/20 dark:text-[#CFE5D5] hover:bg-[#4A6B53]/22'
                      : hasPartial
                        ? 'bg-[#4A6B53]/[0.06] text-[#1C1F1D] dark:bg-[#7CA386]/[0.08] dark:text-[#E2E7E3] hover:bg-[#F3F2EE] dark:hover:bg-[#222724]'
                        : 'text-[#373D39] dark:text-[#C5CCC7] hover:bg-[#F3F2EE] dark:hover:bg-[#222724]'
              } ${isToday && !isSelected ? 'ring-1 ring-[#4A6B53] dark:ring-[#7CA386]' : ''}`}
            >
              <span>{dayNum}</span>
              {/* Non-hue-only explicit micro-indicators */}
              {allDone && (
                <Check
                  className={`h-2.5 w-2.5 mt-0.5 ${
                    isSelected
                      ? 'text-white dark:text-[#121514]'
                      : 'text-[#4A6B53] dark:text-[#7CA386]'
                  }`}
                  aria-hidden="true"
                />
              )}
              {!allDone && hasGoals && rec && (
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
              {hasReflectionOnly && (
                <FileText
                  className="h-2.5 w-2.5 mt-0.5 text-[#8A928C]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Concise Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[#6B736D] dark:text-[#959E97]">
        <span className="inline-flex items-center gap-1">
          <Check className="h-3 w-3 text-[#4A6B53] dark:text-[#7CA386]" aria-hidden="true" />
          <span>100% completed</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>n/m Partial progress</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" aria-hidden="true" />
          <span>Reflection note</span>
        </span>
      </div>
    </section>
  );
}
