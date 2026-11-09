import { useEffect, useState } from 'react';

import { LIVE_REGION_DELAY_MS } from '../../constants';
import { TOAST_POSITION } from './constants';
import ToastMessage from './ToastMessage';
import type { ToastProps } from './types';

/**
 * Figma "Rules/Toast" (design-notes §3 "Toast"): one toast at a time at the bottom centre,
 * 24px above the footer bar (or the window's edge, `noFooter`); a newer toast replaces the
 * one shown. The status region stays in the page; each toast leaves it empty for a moment
 * before it appears, so that screen readers announce every one, the same text again included
 * (001-S7.7). The focus never moves into the toast (FR-033).
 */
export default function Toast({ toast, onAction, onDismiss, noFooter = false }: ToastProps) {
  // The id of the toast the region shows; a new one waits for LIVE_REGION_DELAY_MS
  const [shownId, setShownId] = useState<number | null>(null);
  const toastId = toast?.id ?? null;

  useEffect(() => {
    if (toastId === null) {
      return;
    }
    const timer = window.setTimeout(() => setShownId(toastId), LIVE_REGION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [toastId]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`pointer-events-none fixed inset-x-0 z-30 flex justify-center px-16 ${noFooter ? TOAST_POSITION.noFooter : TOAST_POSITION.aboveFooter} ${TOAST_POSITION.narrow}`}
    >
      {toast && toast.id === shownId && (
        <ToastMessage key={toast.id} toast={toast} onAction={onAction} onDismiss={onDismiss} />
      )}
    </div>
  );
}
