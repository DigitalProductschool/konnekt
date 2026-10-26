import { useEffect, useState } from 'react';

import { TOAST_DURATION_MS } from './constants';
import type { ToastMessageProps } from './types';

/**
 * The visible toast. Every toast goes after its 6 seconds, with or without an action (B4,
 * 2026-10-26); its time runs only while neither the pointer nor the keyboard focus is on it, so
 * that its action can be reached (WCAG 2.2.1).
 */
export default function ToastMessage({ toast, onAction, onDismiss }: ToastMessageProps) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [paused, onDismiss]);

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      // The 6px radius is Figma's; KERN's radii are 2, 4 and 8px
      className="bg-kern-layout-text-default text-kern-static-medium text-kern-layout-background-default shadow-toast pointer-events-auto flex items-center gap-24 rounded-[6px] px-20 py-12"
    >
      <p>{toast.message}</p>
      {toast.actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="focus-visible:outline-kern-layout-background-default cursor-pointer font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
