import React, { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { Shield, ShieldAlert, Users } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, loginDirect, authError, isAuthLoading, activeUsersCount, maxUsers } =
    useDashboardStore();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');

  const handleGoogleSignIn = async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setLocalError(res.error || 'Google Sign-in was cancelled or blocked by browser.');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication error');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLocalLoading(true);
    await loginDirect(emailInput.trim());
    setLocalLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased selection:bg-zinc-900 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 mb-4 shadow-xs">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Apex Engineering Dashboard
        </h1>
        <p className="mt-1 text-xs font-mono text-zinc-500">
          Engineering WAM, HWAM & Hurdle Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-zinc-900 py-8 px-6 shadow-xs border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:px-10 space-y-6">
          {/* Capacity Meter */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Account Slots:</span>
              </span>
              <span className="font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100">
                {activeUsersCount} / {maxUsers} Max
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-zinc-900 dark:bg-zinc-100 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (activeUsersCount / maxUsers) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Open to Google accounts. Capped at {maxUsers} users to prevent spam.
            </p>
          </div>

          {/* Error Banner */}
          {(authError || localError) && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-800 dark:text-rose-300">Notice</p>
                <p className="mt-0.5 leading-relaxed text-rose-700 dark:text-rose-400">
                  {authError || localError}
                </p>
              </div>
            </div>
          )}

          {/* Primary Action: Standard Google OAuth */}
          <div>
            <button
              type="button"
              disabled={localLoading || isAuthLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{localLoading || isAuthLoading ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-mono">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">
                Or enter account email
              </span>
            </div>
          </div>

          {/* Email input */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="name@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <button
              type="submit"
              disabled={localLoading || !emailInput.trim()}
              className="w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-medium font-mono transition-colors disabled:opacity-50"
            >
              Continue to Account
            </button>
          </form>

          <div className="text-center text-[11px] font-mono text-zinc-400">
            <span>Your coursework, grades, and calculations are kept strictly private.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
