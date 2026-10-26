import { useEffect, useState } from 'react';
import { RefreshCw, Quote } from 'lucide-react';
import { DAILY_QUOTES, getDailyQuoteIndex } from '../data/quotes';
import {
  loadSessionQuoteOverride,
  saveSessionQuoteOverride,
} from '../lib/storagePreferences';

interface QuoteCardProps {
  todayDateKey: string;
  compact?: boolean;
}

export function QuoteCard({ todayDateKey, compact = false }: QuoteCardProps) {
  const defaultIndex = getDailyQuoteIndex(todayDateKey);
  const [quoteIndex, setQuoteIndex] = useState<number>(() => {
    const sessionIdx = loadSessionQuoteOverride(todayDateKey, DAILY_QUOTES.length);
    return sessionIdx !== null ? sessionIdx : defaultIndex;
  });
  const [fading, setFading] = useState(false);

  // Reset automatically when calendar date rolls over to a new day
  useEffect(() => {
    const sessionIdx = loadSessionQuoteOverride(todayDateKey, DAILY_QUOTES.length);
    setQuoteIndex(sessionIdx !== null ? sessionIdx : getDailyQuoteIndex(todayDateKey));
  }, [todayDateKey]);

  const handleNextQuote = () => {
    setFading(true);
    window.setTimeout(() => {
      setQuoteIndex((prev) => {
        const next = (prev + 1) % DAILY_QUOTES.length;
        saveSessionQuoteOverride(todayDateKey, next);
        return next;
      });
      setFading(false);
    }, 140);
  };

  const currentQuote = DAILY_QUOTES[quoteIndex] ?? DAILY_QUOTES[0];

  return (
    <aside
      aria-label="Daily motivational reflection"
      className={`animate-gentle-float rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white/90 dark:bg-[#181C1A] ${
        compact ? 'px-5 py-4' : 'px-6 py-5 sm:px-7 sm:py-6'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <Quote
            className="mt-0.5 h-4 w-4 shrink-0 text-[#4A6B53] dark:text-[#7CA386] opacity-80"
            aria-hidden="true"
          />
          <div
            className={`transition-opacity duration-150 ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <blockquote className="text-[15px] sm:text-base leading-relaxed text-[#262A27] dark:text-[#E8ECE9]">
              “{currentQuote.text}”
            </blockquote>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
              {currentQuote.author ? (
                <span>— {currentQuote.author}</span>
              ) : (
                <span>Daily Note</span>
              )}
              <span aria-hidden="true">·</span>
              <span>Daily Focus</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextQuote}
          title="Show another quote for this session"
          aria-label="Show another motivational quote"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6B736D] dark:text-[#959E97] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
