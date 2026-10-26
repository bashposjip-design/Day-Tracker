import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import {
  formatFullDate,
  formatRelativeDateLabel,
  isValidDateKey,
  shiftDateKey,
} from '../lib/dateUtils';

interface DateNavigatorProps {
  selectedDateKey: string;
  todayDateKey: string;
  onSelectDate: (dateKey: string) => void;
}

export function DateNavigator({
  selectedDateKey,
  todayDateKey,
  onSelectDate,
}: DateNavigatorProps) {
  const yesterdayKey = shiftDateKey(todayDateKey, -1);
  const tomorrowKey = shiftDateKey(todayDateKey, 1);
  const nextWeekKey = shiftDateKey(todayDateKey, 7);

  const relativeLabel = formatRelativeDateLabel(selectedDateKey, todayDateKey);
  const isFuture = selectedDateKey > todayDateKey;
  const isToday = selectedDateKey === todayDateKey;

  const quickButtons = [
    { label: 'Yesterday', dateKey: yesterdayKey },
    { label: 'Today', dateKey: todayDateKey },
    { label: 'Tomorrow', dateKey: tomorrowKey },
    { label: '+7 Days', dateKey: nextWeekKey },
  ];

  return (
    <section
      aria-label="Date navigation and future planning selector"
      className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] px-4 py-3.5 sm:px-6 sm:py-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Day Stepper & Active Date Readout */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onSelectDate(shiftDateKey(selectedDateKey, -1))}
            aria-label="Previous day"
            title="Previous day"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E7E5DF] dark:border-[#262B28] bg-[#FAF9F6] dark:bg-[#131715] text-[#4C544E] dark:text-[#B4BDB6] hover:bg-[#EFECE6] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onSelectDate(shiftDateKey(selectedDateKey, 1))}
            aria-label="Next day"
            title="Next day"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E7E5DF] dark:border-[#262B28] bg-[#FAF9F6] dark:bg-[#131715] text-[#4C544E] dark:text-[#B4BDB6] hover:bg-[#EFECE6] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="ml-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
              <span
                className={
                  isFuture
                    ? 'font-medium text-[#4A6B53] dark:text-[#7CA386]'
                    : isToday
                      ? 'font-medium text-[#1C1F1D] dark:text-[#F2F4F2]'
                      : ''
                }
              >
                {relativeLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isFuture
                  ? 'Upcoming Plan'
                  : isToday
                    ? 'Active Day'
                    : 'Past Record'}
              </span>
            </div>
            <p className="truncate text-sm sm:text-base font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
              {formatFullDate(selectedDateKey)}
            </p>
          </div>
        </div>

        {/* Right: Quick Horizon Tabs + Unrestricted Date Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Quick date shortcuts"
            className="inline-flex items-center gap-1 rounded-xl bg-[#F3F2EE] dark:bg-[#222724] p-1"
          >
            {quickButtons.map((btn) => {
              const active = selectedDateKey === btn.dateKey;
              return (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => onSelectDate(btn.dateKey)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#4A6B53] ${
                    active
                      ? 'bg-white dark:bg-[#181C1A] text-[#1C1F1D] dark:text-[#F2F4F2] shadow-xs'
                      : 'text-[#6B736D] dark:text-[#959E97] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center">
            <label htmlFor="workspace-date-picker" className="sr-only">
              Select any past, current, or future date
            </label>
            <Calendar
              className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#6B736D] dark:text-[#959E97]"
              aria-hidden="true"
            />
            <input
              id="workspace-date-picker"
              type="date"
              value={selectedDateKey}
              onChange={(e) => {
                if (isValidDateKey(e.target.value)) {
                  onSelectDate(e.target.value);
                }
              }}
              className="min-h-[36px] rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] pl-8 pr-3 py-1.5 text-xs font-mono-tabular text-[#1C1F1D] dark:text-[#F2F4F2] focus:border-[#4A6B53] dark:focus:border-[#7CA386] focus:outline-none"
            />
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={() => onSelectDate(todayDateKey)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#4A6B53]/12 dark:bg-[#7CA386]/15 px-3 py-1.5 text-xs font-medium text-[#4A6B53] dark:text-[#7CA386] hover:bg-[#4A6B53]/20 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Today</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
