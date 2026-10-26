import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, Mail, X } from 'lucide-react';
import { auth, FIREBASE_PROJECT_ID, googleProvider } from '../lib/firebase';
import { BRAND } from '../config/brand';

export type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
}

function mapFirebaseAuthError(err: unknown): {
  message: string;
  consoleLink?: string;
} {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return { message: 'Sign-in window was closed before completing.' };
    case 'auth/popup-blocked':
      return {
        message:
          'Your browser blocked the sign-in popup. Please allow popups for this site and try again.',
      };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { message: 'Incorrect email or password. Please check your credentials.' };
    case 'auth/email-already-in-use':
      return {
        message: 'An account with this email already exists. Switch to Sign In instead.',
      };
    case 'auth/weak-password':
      return { message: 'Please choose a password with at least 6 characters.' };
    case 'auth/invalid-email':
      return { message: 'Please enter a valid email address.' };
    case 'auth/too-many-requests':
      return {
        message: 'Too many attempts in a short time. Please wait a moment and try again.',
      };
    case 'auth/unauthorized-domain':
      return {
        message: `This domain (${window.location.hostname}) must be added to Firebase Authorized Domains before Google Sign-In can open.`,
        consoleLink: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`,
      };
    case 'auth/operation-not-allowed':
      return {
        message:
          'Email/Password sign-in is not yet enabled in the Firebase Console for this project. Use Continue with Google right away, or enable Email/Password under Authentication → Sign-in method.',
        consoleLink: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`,
      };
    default:
      return {
        message:
          err instanceof Error
            ? err.message
            : 'Unable to complete authentication. Please try again.',
      };
  }
}

export function AuthModal({ isOpen, initialMode, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    consoleLink?: string;
  } | null>(null);
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    setMode(initialMode);
    setErrorInfo(null);
    setResetSent(false);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorInfo(null);
    setResetSent(false);
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setErrorInfo(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    setResetSent(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorInfo({ message: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      setErrorInfo({ message: 'Password must be at least 6 characters.' });
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (displayName.trim()) {
          await updateProfile(cred.user, {
            displayName: displayName.trim().slice(0, BRAND.maxDisplayNameLength),
          });
        }
        await sendEmailVerification(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      onClose();
    } catch (err) {
      setErrorInfo(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorInfo(null);
    setResetSent(false);
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorInfo({ message: 'Enter your email address above first to receive a reset link.' });
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(true);
    } catch (err) {
      setErrorInfo(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-6 sm:p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="auth-modal-title"
              className="text-xl font-semibold tracking-tight text-[#1C1F1D] dark:text-[#F2F4F2]"
            >
              {mode === 'signin' ? `Sign in to ${BRAND.name}` : `Create your ${BRAND.name} account`}
            </h2>
            <p className="mt-1 text-sm text-[#6B736D] dark:text-[#959E97]">
              {mode === 'signin'
                ? 'Return to your private daily goals and progress history.'
                : 'Start your own private daily reset workspace.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close sign in dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B736D] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-[#F3F2EE] dark:bg-[#222724] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorInfo(null);
            }}
            className={`rounded-lg py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              mode === 'signin'
                ? 'bg-white dark:bg-[#181C1A] text-[#1C1F1D] dark:text-[#F2F4F2] shadow-xs'
                : 'text-[#6B736D] dark:text-[#959E97]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorInfo(null);
            }}
            className={`rounded-lg py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              mode === 'signup'
                ? 'bg-white dark:bg-[#181C1A] text-[#1C1F1D] dark:text-[#F2F4F2] shadow-xs'
                : 'text-[#6B736D] dark:text-[#959E97]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Sign-In (Primary Provisioned Method) */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={busy}
          className="mt-5 flex w-full min-h-[46px] items-center justify-center gap-3 rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] px-4 py-2.5 text-sm font-medium text-[#1C1F1D] dark:text-[#F2F4F2] hover:bg-[#F1EFEA] dark:hover:bg-[#202522] disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-[#8A928C] dark:text-[#6E7770]">
          <div className="h-px flex-1 bg-[#EFECE6] dark:bg-[#242926]" />
          <span>or with email</span>
          <div className="h-px flex-1 bg-[#EFECE6] dark:bg-[#242926]" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs font-medium text-[#4C544E] dark:text-[#B4BDB6] mb-1"
              >
                First name (optional)
              </label>
              <input
                id="auth-name"
                type="text"
                maxLength={BRAND.maxDisplayNameLength}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex"
                className="w-full rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] px-3.5 py-2.5 text-sm text-[#1C1F1D] dark:text-[#F2F4F2] focus:border-[#4A6B53] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-[#4C544E] dark:text-[#B4BDB6] mb-1"
            >
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] px-3.5 py-2.5 text-sm text-[#1C1F1D] dark:text-[#F2F4F2] focus:border-[#4A6B53] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-[#4C544E] dark:text-[#B4BDB6]"
              >
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-xs text-[#4A6B53] dark:text-[#7CA386] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] bg-[#FAF9F6] dark:bg-[#131715] px-3.5 py-2.5 text-sm text-[#1C1F1D] dark:text-[#F2F4F2] focus:border-[#4A6B53] focus:outline-none"
            />
          </div>

          {errorInfo && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p>{errorInfo.message}</p>
                {errorInfo.consoleLink && (
                  <a
                    href={errorInfo.consoleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-medium underline"
                  >
                    Open Firebase Authentication Providers →
                  </a>
                )}
              </div>
            </div>
          )}

          {resetSent && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl bg-[#4A6B53]/10 dark:bg-[#7CA386]/15 p-3 text-xs text-[#2E4635] dark:text-[#C5DEC9]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Password reset email sent. Check your inbox.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#4A6B53] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3D5A45] disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>
              {busy
                ? 'Please wait...'
                : mode === 'signin'
                  ? 'Sign In with Email'
                  : 'Create Account'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
