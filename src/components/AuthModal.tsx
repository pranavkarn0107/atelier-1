import React, { useState } from 'react';
import { LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../data/seedEvents';
import { signInWithGooglePopup } from '../firebase';
import { UserProfile } from '../types/event';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
  onAuthenticate: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onAuthenticate,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && displayName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    setError(null);
    const derivedName =
      mode === 'signup'
        ? displayName.trim()
        : DEMO_ACCOUNTS.find((a) => a.email === trimmedEmail)?.displayName.replace(
            /\s*\(.*\)$/,
            ''
          ) ||
          trimmedEmail
            .split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());

    const uid = `usr-${trimmedEmail.replace(/[^a-z0-9]/g, '-')}`;
    onAuthenticate({
      uid,
      email: trimmedEmail,
      displayName: derivedName,
      authProvider: 'account',
    });
    setEmail('');
    setPassword('');
    setDisplayName('');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoadingGoogle(true);
    try {
      const cred = await signInWithGooglePopup();
      if (cred.user) {
        onAuthenticate({
          uid: cred.user.uid,
          email: (cred.user.email || 'user@gmail.com').toLowerCase(),
          displayName: cred.user.displayName || 'Google Planner',
          authProvider: 'google',
        });
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Google popup sign-in could not complete in this frame (${err.message}). Use the email login or quick account selector below.`
          : 'Google sign-in unavailable in preview frame.'
      );
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2
              id="auth-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {mode === 'login'
                ? 'Log In to Atelier Account'
                : 'Create Atelier Planner Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Access your personal and co-planned celebration workspaces
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-3.5" noValidate>
          {mode === 'signup' && (
            <div>
              <label
                htmlFor="auth-fullname"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="auth-fullname"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Elena Rostova"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="planner@atelier-events.io"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                Log In to Workspace
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account &amp; Sign In
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-slate-200" />
          <span className="shrink mx-3 text-xs text-slate-400">
            or continue with
          </span>
          <div className="grow border-t border-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoadingGoogle}
          className="w-full py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          {isLoadingGoogle
            ? 'Connecting Firebase Google Auth...'
            : 'Sign in with Google (Firebase Auth)'}
        </button>

        {/* Quick Collaborator Account Switcher for Testing Shared Access */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-500 mb-2">
            Quick Switch Demo Planner Account:
          </div>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((acct) => {
              const isCurrent = currentUser?.email === acct.email;
              return (
                <button
                  key={acct.uid}
                  type="button"
                  onClick={() => {
                    onAuthenticate({
                      ...acct,
                      displayName: acct.displayName.replace(/\s*\(.*\)$/, ''),
                    });
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{acct.displayName}</div>
                    <div
                      className={`font-mono text-[11px] ${
                        isCurrent ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {acct.email}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium">
                    {isCurrent ? 'Active' : 'Switch'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
