import { useEffect, useState } from 'react';

import { TOAST_DURATION_MS } from './constants';
import type { ToastMessageProps } from './types';

/**
 * The visible toast. Its time runs only while neither the pointer nor the keyboard focus
 * is on it, so that its action can always be reached (WCAG 2.2.1). Given `holdAction`, it
 * doesn't run while the toast has an action.
 */
export default function ToastMessage({
  toast,
  onAction,
  holdAction = false,
  onDismiss,
}: ToastMessageProps) {
  const [paused, setPaused] = useState(false);
  const held = holdAction && toast.actionLabel !== undefined;

  useEffect(() => {
    if (paused || held) {
      return;
    }
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [paused, held, onDismiss]);

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
