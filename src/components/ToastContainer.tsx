import React from 'react';
import { AlertTriangle, CheckCircle2, Database, Sparkles, X } from 'lucide-react';
import { ToastNotification } from '../types/event';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

/**
 * Formats an ISO timestamp string into a concise HH:MM:SS 24-hour time string for persistence confirmation.
 */
export function formatToastTimestamp(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }
  return parsed.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formats a numeric currency value into USD with tabular alignment.
 */
export function formatToastCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Renders an accessible, real-time toast notification stack confirming budget item creation,
 * updates, significant expenditure alerts, and multi-tier data persistence.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}): React.ReactElement | null => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Real-time data persistence notifications"
      aria-live="polite"
      aria-atomic="false"
      data-testid="budget-toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100vw-2.5rem)] pointer-events-none"
    >
      {toasts.map((toast: ToastNotification): React.ReactElement => {
        const isWarning = toast.variant === 'warning';
        const isSignificant = toast.isSignificant;

        return (
          <div
            key={toast.id}
            role="status"
            data-testid="budget-toast-notification"
            data-significant={isSignificant ? 'true' : 'false'}
            data-action={toast.action}
            className={`pointer-events-auto rounded-xl border p-4 shadow-lg transition-all duration-200 ${
              isWarning
                ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                : isSignificant
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                {isWarning ? (
                  <AlertTriangle
                    className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : isSignificant ? (
                  <Sparkles
                    className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tracking-tight">
                      {toast.title}
                    </span>
                    <span
                      className={`text-[11px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded ${
                        isWarning
                          ? 'bg-amber-200/80 text-amber-950'
                          : isSignificant
                          ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {formatToastCurrency(toast.effectiveAmount)}
                    </span>
                  </div>

                  <p
                    className={`text-xs leading-relaxed ${
                      isWarning
                        ? 'text-amber-900'
                        : isSignificant
                        ? 'text-slate-200'
                        : 'text-slate-600'
                    }`}
                  >
                    {toast.message}
                  </p>

                  <div
                    className={`flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono tabular-nums ${
                      isWarning
                        ? 'text-amber-800'
                        : isSignificant
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Database className="w-3 h-3 shrink-0" aria-hidden="true" />
                      {toast.persistenceChannel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Synced {formatToastTimestamp(toast.persistedAt)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(): void => onDismiss(toast.id)}
                aria-label={`Dismiss notification: ${toast.title}`}
                className={`p-1 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  isWarning
                    ? 'text-amber-700 hover:bg-amber-200/60'
                    : isSignificant
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
