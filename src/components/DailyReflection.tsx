import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { BRAND } from '../config/brand';
import { formatFullDate } from '../lib/dateUtils';

interface DailyReflectionProps {
  selectedDateKey: string;
  todayDateKey: string;
  savedReflection: string;
  onSaveReflection: (text: string) => Promise<void>;
}

export function DailyReflection({
  selectedDateKey,
  todayDateKey,
  savedReflection,
  onSaveReflection,
}: DailyReflectionProps) {
  const [draft, setDraft] = useState(savedReflection);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const isToday = selectedDateKey === todayDateKey;
  const isFuture = selectedDateKey > todayDateKey;
  const isDirty = draft !== savedReflection;

  useEffect(() => {
    setDraft(savedReflection);
    setJustSaved(false);
  }, [selectedDateKey, savedReflection]);

  const persistIfDirty = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await onSaveReflection(draft);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="reflection-heading"
      className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2
            id="reflection-heading"
            className="text-lg font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
          >
            {isFuture ? 'Notes for this upcoming day' : 'A moment to reflect'}
          </h2>
          <p className="mt-0.5 text-xs text-[#6B736D] dark:text-[#959E97]">
            {isToday
              ? 'Optional evening or midday note — what went well, what you learned, or what to carry into tomorrow.'
              : isFuture
                ? `Optional preparation notes or context for ${formatFullDate(selectedDateKey)}.`
                : `Reflection recorded for ${formatFullDate(selectedDateKey)}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
          {justSaved && (
            <span className="inline-flex items-center gap-1 text-[#4A6B53] dark:text-[#7CA386]">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Saved</span>
            </span>
          )}
          <span className="font-mono-tabular">
            {draft.length} / {BRAND.maxReflectionLength}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="daily-reflection-textarea" className="sr-only">
          {isFuture ? 'Preparation notes' : 'Daily reflection'} for {formatFullDate(selectedDateKey)}
        </label>
        <textarea
          id="daily-reflection-textarea"
          rows={4}
          maxLength={BRAND.maxReflectionLength}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void persistIfDirty()}
          placeholder={
            isFuture
              ? 'Jot down reminders, context, or focus notes for this upcoming date...'
              : 'Write a few quiet sentences about your day...'
          }
          className="w-full resize-y rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] p-3.5 text-sm leading-relaxed text-[#1C1F1D] dark:text-[#F2F4F2] placeholder:text-[#8A928C] dark:placeholder:text-[#6C756E] focus:border-[#4A6B53] dark:focus:border-[#7CA386] focus:bg-white dark:focus:bg-[#181C1A] focus:outline-none transition-colors"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-[#8A928C] dark:text-[#6E7770]">
          {isDirty ? 'Unsaved changes — saves automatically when you click out' : 'Stored privately by date'}
        </span>

        <button
          type="button"
          disabled={!isDirty || saving}
          onClick={() => void persistIfDirty()}
          className="rounded-lg bg-[#4A6B53] px-4 py-2 text-xs font-medium text-white hover:bg-[#3D5A45] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
        >
          {saving ? 'Saving...' : isFuture ? 'Save Note' : 'Save Reflection'}
        </button>
      </div>
    </section>
  );
}
