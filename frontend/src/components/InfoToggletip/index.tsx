import { useEffect, useId, useRef, useState } from 'react';

import arrowIcon from '../../assets/icons/tooltip-arrow.svg';
import type { InfoToggletipProps } from './types';

/**
 * Figma "Tooltip/Info": an (i) button that shows a short explanation below it. It is a
 * toggletip: the button opens and closes it, Escape or a click elsewhere closes it, and
 * the text is announced when it appears.
 */
export default function InfoToggletip({
  label,
  text,
  arrow = 'start',
  iconSize = 'default',
}: InfoToggletipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const bubbleId = useId();
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
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bubbleId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="rounded-kern-circle focus-visible:outline-kern-action-focus-default flex cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        {/* KERN's info icon, in the muted colour of the design */}
        <span
          aria-hidden="true"
          className={`kern-icon kern-icon--info bg-kern-layout-text-muted! ${small ? 'kern-icon--small' : ''}`}
        />
        <span className="kern-sr-only">{label}</span>
      </button>
      <span id={bubbleId} role="status">
        {open && (
          // 2px below the icon
          <span
            className={`absolute top-[calc(100%+2px)] z-20 flex w-320 max-w-[calc(100vw-32px)] flex-col ${placement}`}
          >
            <img src={arrowIcon} alt="" className="-mb-1" />
            <span className="rounded-kern-large border-kern-darkblue-500 bg-kern-darkblue-050 text-kern-static-small text-kern-layout-text-default shadow-menu w-full border px-16 py-12 leading-(--kern-typography-line-height-medium-static)">
              {text}
            </span>
          </span>
        )}
      </span>
    </span>
  );
}
