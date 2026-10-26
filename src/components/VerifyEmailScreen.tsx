import { useState } from 'react';
import { sendEmailVerification, signOut, type User } from 'firebase/auth';
import { CheckCircle2, MailCheck, RefreshCw, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { BRAND } from '../config/brand';

interface VerifyEmailScreenProps {
  user: User;
  onVerified: () => void;
}

export function VerifyEmailScreen({ user, onVerified }: VerifyEmailScreenProps) {
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefreshVerification = async () => {
    setChecking(true);
    setMessage(null);
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        await auth.currentUser.getIdToken(true);
        onVerified();
      } else {
        setMessage('Your email is not marked verified yet. Click the link in your inbox first.');
      }
    } catch {
      setMessage('Could not refresh verification status. Please try again in a moment.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setMessage(null);
    try {
      await sendEmailVerification(user);
      setResent(true);
    } catch {
      setMessage('Please wait a minute before requesting another verification email.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#121514] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#4A6B53]/12 text-[#4A6B53] dark:text-[#7CA386]">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="text-xl font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
          Verify your email to open {BRAND.name}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B736D] dark:text-[#959E97]">
          We sent a verification link to{' '}
          <strong className="font-medium text-[#1C1F1D] dark:text-[#F2F4F2]">
            {user.email}
          </strong>
          . {BRAND.name} enforces verified email ownership before writing to your private cloud journal.
        </p>

        {message && (
          <p className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
            {message}
          </p>
        )}

        {resent && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#4A6B53] dark:text-[#7CA386]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Verification email sent again.</span>
          </p>
        )}

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={handleRefreshVerification}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4A6B53] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3D5A45] disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{checking ? 'Checking...' : 'I’ve Verified — Continue'}</span>
          </button>

          <button
            type="button"
            onClick={handleResend}
            className="w-full rounded-xl border border-[#DFDDD6] dark:border-[#2D332F] px-4 py-2.5 text-xs font-medium text-[#4C544E] dark:text-[#B4BDB6] hover:bg-[#F3F2EE] dark:hover:bg-[#222724] transition-colors"
          >
            Resend Verification Email
          </button>

          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="inline-flex items-center justify-center gap-1.5 pt-2 text-xs text-[#6B736D] dark:text-[#959E97] hover:text-[#1C1F1D] dark:hover:text-[#F2F4F2]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign out or use Google Sign-In instead</span>
          </button>
        </div>
      </div>
    </div>
  );
}
