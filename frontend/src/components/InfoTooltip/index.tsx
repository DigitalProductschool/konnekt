import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useReducer,
  useRef,
} from 'react';

import arrowIcon from '../../assets/icons/tooltip-arrow.svg';
import { CLOSED } from './constants';
import type { InfoTooltipProps } from './types';
import { isOpen, tooltipReducer } from './utils';

/**
 * Figma "Tooltip/Info": an (i) that shows a short explanation below it while the mouse is
 * over it, and gone as soon as the mouse leaves (decision 2026-10-12: it was a toggletip
 * that a click opened). The mouse can move onto the bubble without closing it. Keyboard
 * focus shows it too, Escape closes it, and on touch screens, which have no hover, a tap
 * opens and closes it. The text is the button's description (WCAG 1.4.13).
 */
export default function InfoTooltip({
  label,
  text,
  arrow = 'start',
  iconSize = 'default',
}: InfoTooltipProps) {
  const [state, dispatch] = useReducer(tooltipReducer, CLOSED);
  const containerRef = useRef<HTMLSpanElement>(null);
  // The kind of pointer that pressed the button, which decides what its click does
  const pressedWith = useRef<string | null>(null);
  const bubbleId = useId();
  const open = isOpen(state);
  const small = iconSize === 'small';
  // The arrow's tip is 20px from the bubble's edge and points at the icon's centre
  const placement =
    arrow === 'start'
      ? `items-start ${small ? '-left-10' : '-left-8'}`
      : `items-end ${small ? '-right-10' : '-right-8'}`;

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnOutsidePointer(event: globalThis.PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        dispatch({ type: 'close' });
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dispatch({ type: 'close' });
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  // A touch has no hover: its pointerenter comes with the tap, which the click handles
  function handlePointerHover(event: PointerEvent, value: boolean) {
    if (event.pointerType !== 'touch') {
      dispatch({ type: 'hover', value });
    }
  }

  // Only keyboard focus shows it: after a click the mouse decides
  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    if (event.currentTarget.matches(':focus-visible')) {
      dispatch({ type: 'focus', value: true });
    }
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (pressedWith.current === 'touch') {
      dispatch({ type: 'tap' });
    } else if (event.detail === 0) {
      // Enter or Space, which shows it again after Escape
      dispatch({ type: 'focus', value: true });
    }
    pressedWith.current = null;
  }

  return (
    <span
      ref={containerRef}
      onPointerEnter={(event) => handlePointerHover(event, true)}
      onPointerLeave={(event) => handlePointerHover(event, false)}
      className="relative inline-flex"
    >
      <button
        type="button"
        aria-describedby={bubbleId}
        onPointerDown={(event) => {
          pressedWith.current = event.pointerType;
        }}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={() => dispatch({ type: 'focus', value: false })}
        className="rounded-kern-circle focus-visible:outline-kern-action-focus-default flex cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        {/* KERN's info icon, in the muted colour of the design */}
        <span
          aria-hidden="true"
          className={`kern-icon kern-icon--info bg-kern-layout-text-muted! ${small ? 'kern-icon--small' : ''}`}
        />
        <span className="kern-sr-only">{label}</span>
      </button>
      {/* 2px below the icon. The gap is padding, so the mouse crosses it without leaving.
          While closed it stays in the page, hidden, as the button's description */}
      <span
        id={bubbleId}
        role="tooltip"
        className={`absolute top-full z-20 w-320 max-w-[calc(100vw-32px)] flex-col pt-2 ${placement} ${open ? 'flex' : 'hidden'}`}
      >
        <img src={arrowIcon} alt="" className="-mb-1" />
        <span className="rounded-kern-large border-kern-darkblue-500 bg-kern-darkblue-050 text-kern-static-small text-kern-layout-text-default shadow-menu w-full border px-16 py-12 leading-(--kern-typography-line-height-medium-static)">
          {text}
        </span>
      </span>
    </span>
  );
}
