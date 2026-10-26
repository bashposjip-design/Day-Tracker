import { useState } from 'react';
import { ArrowRight, Check, Copy, Lock, Sun } from 'lucide-react';
import { BRAND, getShareableSiteUrl } from '../config/brand';
import { QuoteCard } from './QuoteCard';
import type { AuthMode } from './AuthModal';
import { formatFullDate } from '../lib/dateUtils';

interface LandingPageProps {
  todayDateKey: string;
  onOpenAuth: (mode: AuthMode) => void;
}

const PREVIEW_INITIAL_ITEMS = [
  { id: 'p1', text: 'Write project proposal outline before checking messages', completed: true, important: true },
  { id: 'p2', text: '30-minute outdoor walk without headphones', completed: true, important: false },
  { id: 'p3', text: 'Review quarterly budget numbers and notes', completed: false, important: false },
  { id: 'p4', text: 'Read 20 pages before bed', completed: false, important: false },
];

export function LandingPage({ todayDateKey, onOpenAuth }: LandingPageProps) {
  const [previewGoals, setPreviewGoals] = useState(PREVIEW_INITIAL_ITEMS);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const previewCompleted = previewGoals.filter((g) => g.completed).length;
  const previewPct = Math.round((previewCompleted / previewGoals.length) * 100);

  const togglePreviewGoal = (id: string) => {
    setPreviewGoals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleCopyWebsiteUrl = async () => {
    try {
      await navigator.clipboard.writeText(getShareableSiteUrl());
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2200);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#121514] text-[#1C1F1D] dark:text-[#F2F4F2]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-[#E7E5DF] dark:border-[#262B28] bg-[#FAF9F6]/90 dark:bg-[#121514]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-5 sm:px-8 py-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="font-display text-lg font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2] whitespace-nowrap shrink-0"
          >
            {BRAND.name}
          </a>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm text-[#5C645E] dark:text-[#9CA59E]"
          >
            <a
              href="#ritual"
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Daily Ritual
            </a>
            <a
              href="#progress"
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Progress Pathway
            </a>
            <a
              href="#privacy"
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Private Accounts
            </a>
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="rounded-xl bg-[#4A6B53] px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#3D5A45] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-12 pb-14 sm:pt-20 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Value Proposition & Auth Actions */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs text-[#5C645E] dark:text-[#9CA59E]">
                <Sun className="h-3.5 w-3.5 text-[#4A6B53] dark:text-[#7CA386]" aria-hidden="true" />
                <span>{BRAND.tagline}</span>
                <span aria-hidden="true">·</span>
                <span>{formatFullDate(todayDateKey)}</span>
              </div>

              <h1
                className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2] leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Begin every morning with quiet clarity.
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#525A54] dark:text-[#A3ACA5]">
                Write down the handful of intentions that truly matter today, check them off at an unhurried pace, and watch your consistency take shape across weeks and months.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#4A6B53] px-6 py-3 text-sm font-medium text-white hover:bg-[#3D5A45] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
                >
                  <span>Get Started — Free</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-white dark:bg-[#181C1A] px-5 py-3 text-sm font-medium text-[#1C1F1D] dark:text-[#F2F4F2] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] transition-colors whitespace-nowrap shrink-0"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyWebsiteUrl()}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3.5 py-3 text-xs font-medium text-[#5C645E] dark:text-[#9CA59E] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2] transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#4A6B53]" aria-hidden="true" />
                      <span>Website Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy Website Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
                <Lock className="h-3.5 w-3.5 text-[#4A6B53] dark:text-[#7CA386]" aria-hidden="true" />
                <span>Private individual workspace per account</span>
                <span aria-hidden="true">·</span>
                <span>Google & Email sign-in</span>
              </div>
            </div>

            {/* Right Column: Tactile Interactive Preview of Dashboard */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-6 sm:p-7">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#6B736D] dark:text-[#959E97]">
                      Interactive Dashboard Preview
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
                      Today’s Intentions
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-tabular text-xl font-semibold text-[#4A6B53] dark:text-[#7CA386]">
                      {previewPct}%
                    </span>
                    <p className="text-xs text-[#6B736D] dark:text-[#959E97] tabular-nums">
                      {previewCompleted} of {previewGoals.length} completed
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE6] dark:bg-[#252A27]">
                  <div
                    className="h-full rounded-full bg-[#4A6B53] dark:bg-[#7CA386] transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${previewPct / 100})` }}
                  />
                </div>

                <ul className="mt-5 divide-y divide-[#EFECE6] dark:divide-[#242926]">
                  {previewGoals.map((item) => (
                    <li key={item.id} className="py-3 flex items-start gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.completed}
                        aria-label={`Toggle preview goal: ${item.text}`}
                        onClick={() => togglePreviewGoal(item.id)}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors focus-visible:outline-2 focus-visible:outline-[#4A6B53]"
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-[5px] border ${
                            item.completed
                              ? 'border-[#4A6B53] bg-[#4A6B53] text-white dark:border-[#7CA386] dark:bg-[#7CA386] dark:text-[#121514]'
                              : 'border-[#C5C3BC] dark:border-[#424A45]'
                          }`}
                        >
                          {item.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />}
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-sm leading-snug block ${
                            item.completed
                              ? 'line-through text-[#8A928C] dark:text-[#6E7770]'
                              : 'text-[#1C1F1D] dark:text-[#F2F4F2]'
                          }`}
                        >
                          {item.text}
                        </span>
                        {item.important && (
                          <span className="mt-0.5 block text-[11px] font-medium text-[#4A6B53] dark:text-[#7CA386]">
                            Priority intention
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-[#EFECE6] dark:border-[#242926] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B736D] dark:text-[#959E97]">
                  <span>Try checking an item above — your real account starts clean.</span>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="font-medium text-[#4A6B53] dark:text-[#7CA386] hover:underline whitespace-nowrap"
                  >
                    Create Account →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Motivational Quote */}
          <div className="mt-12">
            <QuoteCard todayDateKey={todayDateKey} />
          </div>
        </section>

        {/* Core Capabilities — Editorial Numbering & Asymmetric Bento */}
        <section
          id="ritual"
          className="border-t border-[#E7E5DF] dark:border-[#262B28] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <h2
                className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
                style={{ textWrap: 'balance' }}
              >
                Designed like a calm journal, structured like a dependable daily dashboard.
              </h2>
              <p className="mt-3 text-base text-[#5C645E] dark:text-[#9CA59E]">
                Every detail stays out of your way so your morning focus belongs to the work itself.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-7">
                <p className="font-mono-tabular text-xs text-[#4A6B53] dark:text-[#7CA386]">
                  01. Morning Reset & Fresh Calendar Days
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
                  Every new morning opens a clean page without erasing yesterday
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5C645E] dark:text-[#9CA59E]">
                  Goals and reflections are keyed strictly to your local calendar date. Monday’s effort stays preserved on Monday while Tuesday greets you with a fresh slate. Revisit any past day from the built-in archive calendar.
                </p>
              </div>

              <div
                id="progress"
                className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-7"
              >
                <p className="font-mono-tabular text-xs text-[#4A6B53] dark:text-[#7CA386]">
                  02. Honest Progress Pathway
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
                  Visual evidence of consistency
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5C645E] dark:text-[#9CA59E]">
                  Your completion curve reflects actual saved goals across 7-day, 30-day, and all-time views—never fabricated scores, and zero-goal days are never falsely counted as 100%.
                </p>
              </div>

              <div
                id="privacy"
                className="rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-7"
              >
                <p className="font-mono-tabular text-xs text-[#4A6B53] dark:text-[#7CA386]">
                  03. Private Multi-User Isolation
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
                  One shared link, strictly private journals
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5C645E] dark:text-[#9CA59E]">
                  Share the website URL with friends or colleagues. Everyone signs into their own isolated Cloud Firestore workspace protected by server-enforced ownership rules.
                </p>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <p className="font-mono-tabular text-xs text-[#4A6B53] dark:text-[#7CA386]">
                    04. Full Data Ownership
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
                    Export or restore your complete JSON archive anytime
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C645E] dark:text-[#9CA59E]">
                    Your reflections and daily checklists belong to you. Download a portable JSON backup in one click whenever you like.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="rounded-xl bg-[#1C1F1D] dark:bg-[#F2F4F2] px-5 py-3 text-sm font-medium text-white dark:text-[#121514] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E7E5DF] dark:border-[#262B28] py-8">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B736D] dark:text-[#959E97]">
          <span>
            {BRAND.name} — {BRAND.tagline}
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => void handleCopyWebsiteUrl()}
              className="hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
            >
              {copiedUrl ? 'Link Copied' : 'Share Link'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
