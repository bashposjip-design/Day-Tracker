import { useMemo, useState } from 'react';
import type { ChartRange, DailyRecord, StreakRule } from '../types/daylight';
import {
  buildChartSeries,
  computeProgressStats,
  type ChartDataPoint,
} from '../lib/statsUtils';
import { formatCompactDate, formatTooltipDate } from '../lib/dateUtils';

interface ProgressSectionProps {
  records: Record<string, DailyRecord>;
  todayDateKey: string;
  streakRule: StreakRule;
  onSelectDate: (dateKey: string) => void;
}

/**
 * Generates a smooth horizontal-tangent cubic bezier path so completion rates
 * stay strictly bounded between 0% and 100% without overshooting.
 */
function createSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX.toFixed(2)} ${p0.y.toFixed(2)}, ${midX.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}

export function ProgressSection({
  records,
  todayDateKey,
  streakRule,
  onSelectDate,
}: ProgressSectionProps) {
  const [range, setRange] = useState<ChartRange>('30d');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const stats = useMemo(
    () => computeProgressStats(records, todayDateKey, streakRule),
    [records, todayDateKey, streakRule]
  );

  const { points, unrecordedDaysInWindow } = useMemo(
    () => buildChartSeries(records, todayDateKey, range),
    [records, todayDateKey, range]
  );

  // SVG coordinate system
  const svgWidth = 800;
  const svgHeight = 250;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 36;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const coords = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) {
      return [
        {
          x: padLeft + plotW / 2,
          y: padTop + plotH - (points[0].percentage / 100) * plotH,
        },
      ];
    }
    return points.map((pt, idx) => ({
      x: padLeft + (idx / (points.length - 1)) * plotW,
      y: padTop + plotH - (pt.percentage / 100) * plotH,
    }));
  }, [points, plotW, plotH]);

  const linePath = useMemo(() => createSmoothPath(coords), [coords]);
  const areaPath = useMemo(() => {
    if (coords.length < 2) return '';
    const first = coords[0];
    const last = coords[coords.length - 1];
    const bottomY = padTop + plotH;
    return `${linePath} L ${last.x.toFixed(2)} ${bottomY.toFixed(2)} L ${first.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
  }, [coords, linePath, plotH]);

  const activePoint: ChartDataPoint | null =
    activeIndex !== null && points[activeIndex] ? points[activeIndex] : null;
  const activeCoord =
    activeIndex !== null && coords[activeIndex] ? coords[activeIndex] : null;

  // Pick up to 6 readable X-axis tick indices
  const xTickIndices = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length <= 6) return points.map((_, i) => i);
    const maxTicks = 5;
    const indices = new Set<number>([0, points.length - 1]);
    for (let t = 1; t < maxTicks; t++) {
      indices.add(Math.round((t / maxTicks) * (points.length - 1)));
    }
    return Array.from(indices).sort((a, b) => a - b);
  }, [points]);

  return (
    <section aria-labelledby="progress-heading" className="space-y-8">
      {/* Compact Statistics Strip (Single-elevation surface with hairline dividers) */}
      <div className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] divide-y sm:divide-y-0 sm:divide-x divide-[#EFECE6] dark:divide-[#242926] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
        <div className="p-5">
          <p className="text-xs text-[#6B736D] dark:text-[#959E97]">Today’s Completion</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
            {stats.todayPercent !== null ? `${stats.todayPercent}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-[#8A928C] dark:text-[#6E7770]">
            {stats.todayTotal > 0 ? 'Based on today’s list' : 'No goals added today'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-[#6B736D] dark:text-[#959E97]">Completed Today</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
            {stats.todayCompleted}{' '}
            <span className="text-sm font-normal text-[#8A928C] dark:text-[#6E7770]">
              / {stats.todayTotal}
            </span>
          </p>
          <p className="mt-1 text-xs text-[#8A928C] dark:text-[#6E7770]">
            Daily intentions checked
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-[#6B736D] dark:text-[#959E97]">Upcoming Plans</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
            {stats.upcomingPlannedGoalsCount}
          </p>
          <p className="mt-1 text-xs text-[#8A928C] dark:text-[#6E7770]">
            Across {stats.upcomingDaysCount} future{' '}
            {stats.upcomingDaysCount === 1 ? 'date' : 'dates'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-[#6B736D] dark:text-[#959E97]">100% Days</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
            {stats.perfectDaysCount}
          </p>
          <p className="mt-1 text-xs text-[#8A928C] dark:text-[#6E7770]">
            All recorded goals finished
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-[#6B736D] dark:text-[#959E97]">Average Rate</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
            {stats.averageCompletionPercent !== null
              ? `${stats.averageCompletionPercent}%`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-[#8A928C] dark:text-[#6E7770]">
            Across {stats.activeDaysCount} past/current{' '}
            {stats.activeDaysCount === 1 ? 'day' : 'days'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-[#6B736D] dark:text-[#959E97]">Consistency Streak</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#4A6B53] dark:text-[#7CA386]">
            {stats.currentStreak}{' '}
            <span className="text-sm font-normal text-[#6B736D] dark:text-[#959E97]">
              {stats.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </p>
          <p className="mt-1 text-xs text-[#8A928C] dark:text-[#6E7770]">
            Rule:{' '}
            {streakRule === 'all_completed'
              ? '100% of daily goals'
              : 'At least 1 goal/day'}
          </p>
        </div>
      </div>

      {/* Main Progress Pathway Line Chart Card */}
      <div className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              id="progress-heading"
              className="text-xl font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
            >
              The Bigger Picture
            </h2>
            <p className="mt-1 text-sm text-[#6B736D] dark:text-[#959E97]">
              Daily goal completion rate over time. Days with zero recorded goals are excluded from the curve.
            </p>
          </div>

          {/* Interactive Range Filter Tabs */}
          <div
            role="group"
            aria-label="Progress chart date range"
            className="inline-flex items-center gap-1 rounded-xl bg-[#F3F2EE] dark:bg-[#222724] p-1 self-start sm:self-auto"
          >
            {(
              [
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setRange(opt.id);
                  setActiveIndex(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#4A6B53] ${
                  range === opt.id
                    ? 'bg-white dark:bg-[#181C1A] text-[#1C1F1D] dark:text-[#F2F4F2] shadow-xs'
                    : 'text-[#6B736D] dark:text-[#959E97] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Body or Meaningful Empty State */}
        {points.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#DFDDD6] dark:border-[#2D332F] px-6 py-12 text-center">
            <p className="text-[15px] font-medium text-[#2E3430] dark:text-[#E2E7E3]">
              Your progress pathway will appear here
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-[#6B736D] dark:text-[#959E97]">
              Add at least one goal to begin charting your genuine daily completion rate. No sample data is ever fabricated.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {/* Selected / Hovered Point Readout Bar (Accessible on Mobile & Desktop) */}
            <div className="mb-3 min-h-[28px] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
              {activePoint ? (
                <div className="flex flex-wrap items-center gap-2 text-[#1C1F1D] dark:text-[#F2F4F2]">
                  <span className="font-medium">{formatTooltipDate(activePoint.date)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular font-semibold text-[#4A6B53] dark:text-[#7CA386]">
                    {activePoint.percentage}% complete
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums text-[#6B736D] dark:text-[#959E97]">
                    {activePoint.completedGoals} of {activePoint.totalGoals}{' '}
                    {activePoint.totalGoals === 1 ? 'goal' : 'goals'} completed
                  </span>
                </div>
              ) : (
                <span>
                  Hover or tap any point to inspect that day’s completion details (click a point to open the date).
                </span>
              )}

              {range !== 'all' && unrecordedDaysInWindow > 0 && (
                <span className="tabular-nums">
                  {unrecordedDaysInWindow}{' '}
                  {unrecordedDaysInWindow === 1 ? 'day' : 'days'} with no recorded goals omitted
                </span>
              )}
            </div>

            <div className="relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto min-w-[300px] select-none overflow-visible"
                role="img"
                aria-label="Line chart of daily goal completion percentage over time"
                onMouseLeave={() => setActiveIndex(null)}
              >
                <defs>
                  <linearGradient id="daylightSageArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A6B53" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#4A6B53" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Y-Axis Gridlines (0%, 25%, 50%, 75%, 100%) */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = padTop + plotH - (pct / 100) * plotH;
                  return (
                    <g key={pct}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="currentColor"
                        className="text-[#ECEAE3] dark:text-[#252A27]"
                        strokeWidth="1"
                        strokeDasharray={pct === 0 ? undefined : '3 3'}
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[#8A928C] dark:fill-[#6E7770] text-[11px] font-mono-tabular"
                      >
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill Beneath Pathway */}
                {areaPath && <path d={areaPath} fill="url(#daylightSageArea)" />}

                {/* Smooth Pathway Line */}
                {coords.length >= 2 && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#4A6B53"
                    className="dark:stroke-[#7CA386]"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Vertical Guide on Active Point */}
                {activeCoord && (
                  <line
                    x1={activeCoord.x}
                    y1={padTop}
                    x2={activeCoord.x}
                    y2={padTop + plotH}
                    stroke="#4A6B53"
                    className="dark:stroke-[#7CA386]"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                  />
                )}

                {/* X-Axis Date Labels */}
                {xTickIndices.map((idx) => {
                  const pt = points[idx];
                  const c = coords[idx];
                  if (!pt || !c) return null;
                  return (
                    <text
                      key={pt.date}
                      x={c.x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className="fill-[#6B736D] dark:fill-[#959E97] text-[11px] font-mono-tabular"
                    >
                      {formatCompactDate(pt.date)}
                    </text>
                  );
                })}

                {/* Interactive Data Points */}
                {coords.map((c, idx) => {
                  const pt = points[idx];
                  const isActive = activeIndex === idx;
                  return (
                    <g key={pt.date}>
                      {/* Larger transparent hit target for comfortable mobile tap */}
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={16}
                        fill="transparent"
                        className="cursor-pointer focus:outline-none"
                        tabIndex={0}
                        role="button"
                        aria-label={`${formatTooltipDate(pt.date)}: ${pt.percentage}% (${pt.completedGoals} of ${pt.totalGoals} goals completed)`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onFocus={() => setActiveIndex(idx)}
                        onClick={() => {
                          setActiveIndex(idx);
                          onSelectDate(pt.date);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectDate(pt.date);
                          }
                        }}
                      />
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={isActive ? 6 : 4}
                        className="fill-white dark:fill-[#181C1A] stroke-[#4A6B53] dark:stroke-[#7CA386] pointer-events-none transition-transform duration-150"
                        strokeWidth={isActive ? 3 : 2.25}
                      />
                    </g>
                  );
                })}

                {/* SVG Floating Tooltip Box */}
                {activePoint && activeCoord && (
                  <g
                    transform={`translate(${Math.min(
                      Math.max(activeCoord.x - 85, padLeft),
                      svgWidth - padRight - 170
                    )}, ${Math.max(activeCoord.y - 62, 4)})`}
                    className="pointer-events-none"
                  >
                    <rect
                      width="170"
                      height="50"
                      rx="8"
                      className="fill-[#1C1F1D] dark:fill-[#F2F4F2]"
                      opacity="0.96"
                    />
                    <text
                      x="12"
                      y="20"
                      className="fill-[#FAF9F6] dark:fill-[#121514] text-[11px] font-medium"
                    >
                      {formatTooltipDate(activePoint.date)}
                    </text>
                    <text
                      x="12"
                      y="37"
                      className="fill-[#B8C4BC] dark:fill-[#4A554E] text-[11px] font-mono-tabular"
                    >
                      {activePoint.percentage}% · {activePoint.completedGoals}/{activePoint.totalGoals} goals
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {points.length === 1 && (
              <p className="mt-3 text-center text-xs text-[#6B736D] dark:text-[#959E97]">
                First day recorded ({formatCompactDate(points[0].date)} at {points[0].percentage}%). Complete goals on a second day to connect your pathway curve.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
