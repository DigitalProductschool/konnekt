import type { FocusEvent, KeyboardEvent } from 'react';
import { useEffect, useReducer, useRef } from 'react';

import checkFilledIcon from '../../assets/icons/check-filled-white.svg';
import ErrorNoticeText from '../ErrorNoticeText';
import { TOAST_DURATION_MS, TOAST_KIND_FILL } from './constants';
import type { ToastMessageProps } from './types';
import { isToastTimerRunning, NO_HOLD, toastHoldReducer } from './utils';

/**
 * The visible toast, Figma "Rules/Toast" (6369:25433): the message in `body/small/regular`
 * white, the success kind's filled check before it, the error ID of a 5xx on a line of its own
 * (as `ErrorNoticeText` writes it) and the optional action as an underlined `label/small` link
 * at the right. Every toast, with or without an action, goes after its 6 seconds, which run only
 * while neither the pointer nor the keyboard focus is on it and start again once both have left
 * (FR-082, research R12). Escape on it dismisses it and returns the focus to where it came from.
 */
export default function ToastMessage({ toast, onAction, onDismiss }: ToastMessageProps) {
  // Whether the pointer and the focus are on the toast; the time runs while neither is
  const [hold, dispatchHold] = useReducer(toastHoldReducer, NO_HOLD);
  const running = isToastTimerRunning(hold);
  // Where the focus came from when it entered the toast, for Escape to return it there
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const hasAction = Boolean(toast.actionLabel && onAction);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [running, onDismiss]);

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    dispatchHold({ type: 'focusIn' });
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) {
      returnFocusRef.current = from;
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    // The focus moving within the toast keeps it
    const to = event.relatedTarget;
    if (!(to instanceof Node && event.currentTarget.contains(to))) {
      dispatchHold({ type: 'focusOut' });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') {
      return;
    }
    event.stopPropagation();
    const target = returnFocusRef.current;
    onDismiss();
    if (target?.isConnected) {
      target.focus();
    }
  }

  // Under 320 CSS px the action wraps under the text, and a long toast scrolls in half the
  // window instead of covering it (T096)
  return (
    <div
      onPointerEnter={() => dispatchHold({ type: 'pointerEnter' })}
      onPointerLeave={() => dispatchHold({ type: 'pointerLeave' })}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${TOAST_KIND_FILL[toast.kind ?? 'neutral']} rounded-kern-default shadow-toast text-kern-static-small text-kern-action-on-default narrow:max-h-[50dvh] narrow:flex-wrap narrow:gap-y-8 narrow:overflow-y-auto pointer-events-auto flex max-w-full items-center gap-24 p-16 leading-(--kern-typography-line-height-medium-static)`}
    >
      <div className="flex min-w-0 items-center gap-8">
        {toast.kind === 'success' && (
          <img src={checkFilledIcon} alt="" className="size-20 shrink-0" />
        )}
        <p className="min-w-0">
          <ErrorNoticeText
            notice={{ message: toast.message, error_id: toast.errorId ?? undefined }}
          />
        </p>
      </div>
      {hasAction && (
        <button
          type="button"
          onClick={onAction}
          className="focus-visible:outline-kern-action-on-default shrink-0 cursor-pointer font-semibold underline decoration-[8%] [text-underline-position:from-font] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
