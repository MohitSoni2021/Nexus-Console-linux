import { addErrorLog } from '@/shared/state/errorLogsSlice';

type DispatchFn = (action: unknown) => void;
let activeDispatch: DispatchFn | null = null;

export function registerErrorDispatch(dispatch: DispatchFn) {
  activeDispatch = dispatch;
}

export function logError(
  message: string,
  options?: {
    level?: 'error' | 'warn';
    source?: 'frontend' | 'ipc' | 'unhandled' | 'system';
    detail?: string;
    stack?: string;
  },
) {
  if (activeDispatch) {
    activeDispatch(
      addErrorLog({
        message,
        level: options?.level ?? 'error',
        source: options?.source ?? 'frontend',
        detail: options?.detail,
        stack: options?.stack,
      }),
    );
  } else {
    // If store is not mounted yet, fallback to console
    console.error('[ErrorLogger pending store]:', message, options);
  }
}

let initialized = false;

export function initGlobalErrorListeners(dispatch: DispatchFn) {
  registerErrorDispatch(dispatch);
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (event) => {
    logError(event.message || 'Window runtime error', {
      source: 'unhandled',
      detail: `${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    const stack = reason instanceof Error ? reason.stack : undefined;
    logError(msg, {
      source: 'unhandled',
      detail: 'Unhandled Promise Rejection',
      stack,
    });
  });
}
