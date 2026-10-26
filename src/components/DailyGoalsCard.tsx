import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  CheckCircle2,
  Flag,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { BRAND } from '../config/brand';
import type { GoalItem } from '../types/daylight';
import { formatFullDate, formatRelativeDateLabel } from '../lib/dateUtils';

interface DailyGoalsCardProps {
  selectedDateKey: string;
  todayDateKey: string;
  goals: GoalItem[];
  onSaveGoals: (nextGoals: GoalItem[]) => Promise<void>;
  onJumpToToday: () => void;
  isSaving?: boolean;
}

export function DailyGoalsCard({
  selectedDateKey,
  todayDateKey,
  goals,
  onSaveGoals,
  onJumpToToday,
  isSaving = false,
}: DailyGoalsCardProps) {
  const [draftText, setDraftText] = useState('');
  const [draftImportant, setDraftImportant] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [recentlyCompletedId, setRecentlyCompletedId] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const isToday = selectedDateKey === todayDateKey;
  const isFuture = selectedDateKey > todayDateKey;
  const relativeLabel = formatRelativeDateLabel(selectedDateKey, todayDateKey);

  const totalCount = goals.length;
  const completedCount = goals.filter((g) => g.completed).length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationMsg(null);
    const trimmed = draftText.trim();
    if (!trimmed) {
      setValidationMsg(
        isFuture
          ? 'Write an upcoming plan or goal before adding.'
          : 'Write a clear intention before adding.'
      );
      return;
    }
    if (goals.length >= BRAND.maxGoalsPerDay) {
      setValidationMsg(`Each day supports up to ${BRAND.maxGoalsPerDay} items.`);
      return;
    }

    const newGoal: GoalItem = {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed.slice(0, BRAND.maxGoalLength),
      completed: false,
      important: draftImportant,
      order: goals.length,
      createdAtMs: Date.now(),
    };

    setDraftText('');
    setDraftImportant(false);
    await onSaveGoals([...goals, newGoal]);
  };

  const handleToggleComplete = async (goalId: string) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;
    const nextCompleted = !target.completed;
    if (nextCompleted) {
      setRecentlyCompletedId(goalId);
      window.setTimeout(() => {
        setRecentlyCompletedId((curr) => (curr === goalId ? null : curr));
      }, 900);
    }
    const next = goals.map((g) =>
      g.id === goalId ? { ...g, completed: nextCompleted } : g
    );
    await onSaveGoals(next);
  };

  const handleTogglePriority = async (goalId: string) => {
    const next = goals.map((g) =>
      g.id === goalId ? { ...g, important: !g.important } : g
    );
    await onSaveGoals(next);
  };

  const startEditing = (goal: GoalItem) => {
    setEditingId(goal.id);
    setEditingText(goal.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const commitEdit = async (goalId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }
    const next = goals.map((g) =>
      g.id === goalId ? { ...g, text: trimmed.slice(0, BRAND.maxGoalLength) } : g
    );
    setEditingId(null);
    setEditingText('');
    await onSaveGoals(next);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const next = goals
      .filter((g) => g.id !== goalId)
      .map((g, idx) => ({ ...g, order: idx }));
    await onSaveGoals(next);
  };

  const handleMoveGoal = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= goals.length) return;
    const copy = [...goals];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    const reordered = copy.map((g, idx) => ({ ...g, order: idx }));
    await onSaveGoals(reordered);
  };

  const headingTitle = isToday
    ? 'Today’s Intentions'
    : isFuture
      ? `${relativeLabel === 'Tomorrow' ? 'Tomorrow’s Plans' : `Upcoming Plans · ${relativeLabel}`}`
      : `Goals for ${formatFullDate(selectedDateKey)}`;

  const subtitleText =
    totalCount === 0
      ? isToday
        ? 'Choose the clear, meaningful tasks that will make today a success.'
        : isFuture
          ? `Schedule upcoming plans for ${formatFullDate(selectedDateKey)}. They will be waiting for you when this morning arrives.`
          : 'No goals were recorded on this past date.'
      : isFuture && completedCount === 0
        ? `${totalCount} upcoming ${totalCount === 1 ? 'plan' : 'plans'} scheduled for ${formatFullDate(selectedDateKey)}`
        : `${completedCount} of ${totalCount} ${totalCount === 1 ? 'goal' : 'goals'} completed`;

  return (
    <section
      aria-labelledby="daily-goals-heading"
      className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-5 sm:p-8"
    >
      {/* Contextual Past or Future Date Banner */}
      {!isToday && (
        <div
          className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs ${
            isFuture
              ? 'bg-[#4A6B53]/[0.08] dark:bg-[#7CA386]/[0.12] text-[#2B4332] dark:text-[#CFE5D5]'
              : 'bg-[#F5F4F0] dark:bg-[#202522] text-[#4C544E] dark:text-[#B4BDB6]'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {isFuture && <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span>
              {isFuture ? 'Planning upcoming date' : 'Viewing historical record'} ·{' '}
              <strong className="font-medium text-[#1C1F1D] dark:text-[#F2F4F2]">
                {formatFullDate(selectedDateKey)}
              </strong>
            </span>
          </span>
          <button
            type="button"
            onClick={onJumpToToday}
            className="inline-flex items-center gap-1.5 font-medium text-[#4A6B53] dark:text-[#7CA386] hover:underline whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Return to Today</span>
          </button>
        </div>
      )}

      {/* Card Header + Progress Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2
            id="daily-goals-heading"
            className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
          >
            {headingTitle}
          </h2>
          <p className="mt-1 text-sm text-[#6B736D] dark:text-[#959E97]">
            {subtitleText}
          </p>
        </div>

        {totalCount > 0 && (
          <div className="flex items-baseline gap-2 shrink-0">
            {isFuture && completedCount === 0 ? (
              <>
                <span className="font-mono-tabular text-2xl font-semibold text-[#4A6B53] dark:text-[#7CA386]">
                  {totalCount}
                </span>
                <span className="text-xs text-[#6B736D] dark:text-[#959E97]">
                  {totalCount === 1 ? 'plan set' : 'plans set'}
                </span>
              </>
            ) : (
              <>
                <span className="font-mono-tabular text-2xl font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
                  {completionPct}%
                </span>
                <span className="text-xs text-[#6B736D] dark:text-[#959E97]">complete</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Subtle Progress Bar */}
      {totalCount > 0 && (!isFuture || completedCount > 0) && (
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#EFECE6] dark:bg-[#252A27]"
          role="progressbar"
          aria-valuenow={completionPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily goal completion progress"
        >
          <div
            className="h-full rounded-full bg-[#4A6B53] dark:bg-[#7CA386] transition-transform duration-200 origin-left"
            style={{ transform: `scaleX(${completionPct / 100})` }}
          />
        </div>
      )}

      {/* Add Goal / Plan Input Form */}
      <form onSubmit={handleAddGoal} className="mt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 flex items-center">
            <label htmlFor="new-goal-input" className="sr-only">
              Write a goal or plan for {isToday ? 'today' : formatFullDate(selectedDateKey)}
            </label>
            <input
              id="new-goal-input"
              type="text"
              maxLength={BRAND.maxGoalLength}
              value={draftText}
              onChange={(e) => {
                setDraftText(e.target.value);
                if (validationMsg) setValidationMsg(null);
              }}
              placeholder={
                isToday
                  ? 'Write a clear goal for today and press Enter...'
                  : isFuture
                    ? `Add an upcoming plan for ${relativeLabel.toLowerCase()} and press Enter...`
                    : 'Add a goal to this past date...'
              }
              className="w-full rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] pl-4 pr-11 py-3 text-[15px] text-[#1C1F1D] dark:text-[#F2F4F2] placeholder:text-[#8A928C] dark:placeholder:text-[#6C756E] focus:border-[#4A6B53] dark:focus:border-[#7CA386] focus:bg-white dark:focus:bg-[#181C1A] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setDraftImportant((prev) => !prev)}
              aria-pressed={draftImportant}
              aria-label={draftImportant ? 'Remove priority marker' : 'Mark as key priority'}
              title={draftImportant ? 'Priority enabled' : 'Mark as key priority'}
              className={`absolute right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53] ${
                draftImportant
                  ? 'bg-[#4A6B53]/15 text-[#4A6B53] dark:bg-[#7CA386]/20 dark:text-[#7CA386]'
                  : 'text-[#8A928C] hover:text-[#4C544E] dark:text-[#6C756E] dark:hover:text-[#B4BDB6]'
              }`}
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#4A6B53] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3D5A45] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{isFuture ? 'Add Plan' : 'Add Goal'}</span>
          </button>
        </div>

        {validationMsg && (
          <p role="alert" className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {validationMsg}
          </p>
        )}
      </form>

      {/* Goals Checklist or Inviting Empty State */}
      {totalCount === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#DFDDD6] dark:border-[#2D332F] px-6 py-10 text-center">
          <p className="text-[15px] font-medium text-[#2E3430] dark:text-[#E2E7E3]">
            {isToday
              ? 'Your page for today is clean.'
              : isFuture
                ? 'Nothing scheduled for this upcoming day yet.'
                : 'No intentions logged for this past day.'}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#6B736D] dark:text-[#959E97]">
            {isToday
              ? 'Start with 3 to 5 realistic intentions. Checking them off builds steady, visible momentum.'
              : isFuture
                ? 'Write down commitments, milestones, or priorities ahead of time so your future morning starts with instant clarity.'
                : 'You can still record goals or a reflection for this date using the field above.'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-[#EFECE6] dark:divide-[#242926]" role="list">
          {goals.map((goal, idx) => {
            const isEditing = editingId === goal.id;
            const justCompleted = recentlyCompletedId === goal.id;

            return (
              <li
                key={goal.id}
                className={`group flex items-start justify-between gap-3 py-3.5 transition-colors ${
                  justCompleted ? 'bg-[#4A6B53]/[0.05] dark:bg-[#7CA386]/[0.07] -mx-3 px-3 rounded-xl' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={goal.completed}
                    aria-label={`Mark "${goal.text}" as ${goal.completed ? 'incomplete' : 'completed'}`}
                    onClick={() => handleToggleComplete(goal.id)}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53] min-h-[24px] min-w-[24px]"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-[5px] border transition-colors ${
                        goal.completed
                          ? 'border-[#4A6B53] bg-[#4A6B53] text-white dark:border-[#7CA386] dark:bg-[#7CA386] dark:text-[#121514]'
                          : 'border-[#C5C3BC] dark:border-[#424A45] bg-transparent hover:border-[#4A6B53] dark:hover:border-[#7CA386]'
                      }`}
                    >
                      {goal.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />}
                    </span>
                  </button>

                  {isEditing ? (
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <label htmlFor={`edit-goal-${goal.id}`} className="sr-only">
                        Edit goal text
                      </label>
                      <input
                        id={`edit-goal-${goal.id}`}
                        type="text"
                        maxLength={BRAND.maxGoalLength}
                        value={editingText}
                        autoFocus
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void commitEdit(goal.id);
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        className="flex-1 rounded-lg border border-[#4A6B53] dark:border-[#7CA386] bg-white dark:bg-[#131715] px-3 py-1.5 text-[15px] text-[#1C1F1D] dark:text-[#F2F4F2] focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => commitEdit(goal.id)}
                          className="rounded-lg bg-[#4A6B53] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3D5A45] whitespace-nowrap shrink-0"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          aria-label="Cancel editing"
                          className="rounded-lg border border-[#DFDDD6] dark:border-[#2D332F] p-1.5 text-[#6B736D] hover:text-[#1C1F1D] dark:text-[#959E97]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 pt-0.5">
                      <span
                        onDoubleClick={() => startEditing(goal)}
                        className={`block text-[15px] sm:text-base leading-snug break-words transition-colors ${
                          goal.completed
                            ? 'line-through text-[#8A928C] dark:text-[#6E7770]'
                            : 'text-[#1C1F1D] dark:text-[#F2F4F2]'
                        }`}
                      >
                        {goal.text}
                      </span>
                      {(goal.important || justCompleted) && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
                          {goal.important && (
                            <span className="font-medium text-[#4A6B53] dark:text-[#7CA386]">
                              Priority {isFuture ? 'plan' : 'intention'}
                            </span>
                          )}
                          {goal.important && justCompleted && <span aria-hidden="true">·</span>}
                          {justCompleted && (
                            <span className="text-[#4A6B53] dark:text-[#7CA386]">
                              Nicely done
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleTogglePriority(goal.id)}
                      aria-label={
                        goal.important
                          ? `Remove priority from "${goal.text}"`
                          : `Mark "${goal.text}" as priority`
                      }
                      title={goal.important ? 'Remove priority' : 'Mark as priority'}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53] ${
                        goal.important
                          ? 'text-[#4A6B53] dark:text-[#7CA386]'
                          : 'text-[#8A928C] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]'
                      }`}
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveGoal(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move "${goal.text}" up`}
                      title="Move up"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A928C] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] disabled:opacity-25 disabled:pointer-events-none transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53]"
                    >
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveGoal(idx, 1)}
                      disabled={idx === goals.length - 1}
                      aria-label={`Move "${goal.text}" down`}
                      title="Move down"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A928C] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] disabled:opacity-25 disabled:pointer-events-none transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53]"
                    >
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditing(goal)}
                      aria-label={`Edit "${goal.text}"`}
                      title="Edit"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A928C] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      aria-label={`Delete "${goal.text}"`}
                      title="Delete"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A928C] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Calm All-Completed Celebration Note */}
      {allCompleted && (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex items-center gap-3 rounded-xl bg-[#4A6B53]/[0.08] dark:bg-[#7CA386]/[0.12] px-4 py-3.5 text-sm text-[#2E4635] dark:text-[#C5DEC9]"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4A6B53] dark:text-[#7CA386]" aria-hidden="true" />
          <span>
            {isToday
              ? 'All of today’s intentions are complete. Take a quiet breath — you honored what you set out to do.'
              : 'Every goal listed for this date is marked complete.'}
          </span>
        </div>
      )}
    </section>
  );
}
