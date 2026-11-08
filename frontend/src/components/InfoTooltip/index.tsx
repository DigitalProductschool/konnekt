import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useReducer,
  useRef,
} from 'react';

import { placementFrom, POPUP_GUTTER, popupWrapperClass } from '../../utils/popupPlacement';
import { CLOSED, TOOLTIP_BOX, TOOLTIP_HEIGHT, TOOLTIP_OVERHANG, TOOLTIP_WIDTH } from './constants';
import type {
  ExplainedButtonProps,
  InfoTooltipProps,
  TooltipBubbleProps,
  TooltipTrigger,
} from './types';
import {
  bubbleFirst,
  bubblePlacementClass,
  disabledStillClasses,
  iconClasses,
  isOpen,
  tooltipReducer,
} from './utils';

/**
 * The tooltip's behaviour, shared by the ⓘ and the disabled button: it shows while the mouse is
 * over the trigger or the bubble, while the trigger has the keyboard focus, and after a tap on a
 * touch screen until the next tap (FR-052g); Escape and a tap elsewhere close it (WCAG 1.4.13).
 * It is placed with placementFrom() each time it opens, since the page may have moved or
 * changed width. `enabled` false keeps it closed (a button without an explanation)
 */
function useTooltip(trigger: TooltipTrigger, preferred: 'start' | 'end', enabled = true) {
  const [state, dispatch] = useReducer(tooltipReducer, CLOSED);
  const containerRef = useRef<HTMLSpanElement>(null);
  // The kind of pointer that pressed the trigger, which decides what its click does
  const pressedWith = useRef<string | null>(null);
  const bubbleId = useId();
  const open = enabled && isOpen(state);

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

  function place() {
    const width = Math.min(TOOLTIP_WIDTH, document.documentElement.clientWidth - 2 * POPUP_GUTTER);
    const { side, direction } = placementFrom(
      containerRef.current,
      width,
      preferred,
      TOOLTIP_OVERHANG[trigger],
      TOOLTIP_HEIGHT
    );
    dispatch({ type: 'place', placement: { side, direction } });
  }

  // A touch has no hover: its pointerenter comes with the tap, which the click handles
  function handlePointerHover(event: PointerEvent, value: boolean) {
    if (event.pointerType !== 'touch') {
      if (value) {
        place();
      }
      dispatch({ type: 'hover', value });
    }
  }

  // Only keyboard focus shows it: after a click the mouse decides
  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    if (event.currentTarget.matches(':focus-visible')) {
      place();
      dispatch({ type: 'focus', value: true });
    }
  }

  /** A tap toggles it; Enter or Space shows it again after Escape; a mouse click leaves it */
  function handleActivation(event: MouseEvent<HTMLButtonElement>) {
    if (pressedWith.current === 'touch') {
      place();
      dispatch({ type: 'tap' });
    } else if (event.detail === 0) {
      place();
      dispatch({ type: 'focus', value: true });
    }
    pressedWith.current = null;
  }

  return {
    open,
    bubbleId,
    placement: state.placement,
    wrapperProps: {
      ref: containerRef,
      onPointerEnter: (event: PointerEvent) => handlePointerHover(event, true),
      onPointerLeave: (event: PointerEvent) => handlePointerHover(event, false),
    },
    triggerProps: {
      onPointerDown: (event: PointerEvent) => {
        pressedWith.current = event.pointerType;
      },
      onFocus: handleFocus,
      onBlur: () => dispatch({ type: 'focus', value: false }),
    },
    handleActivation,
  };
}

/**
 * Figma "Rules/Tooltip" (6139:3739; U37 6151:33820, U46 6758:43524, U81 6809:46590): the dark
 * bubble, 280px wide, 8px from its trigger, without an arrow. While closed it stays in the page,
 * hidden, as its trigger's description
 */
function TooltipBubble({ id, text, open, trigger, placement }: TooltipBubbleProps) {
  return (
    <span
      id={id}
      role="tooltip"
      className={`absolute z-40 ${bubblePlacementClass(trigger, placement)} ${open ? 'flex' : 'hidden'}`}
    >
      <span className={TOOLTIP_BOX}>{text}</span>
    </span>
  );
}

/**
 * The wrapper the bubble is positioned from: a block, so that across the page the bubble starts
 * below (or above) its trigger, and positioned only while the bubble opens beside the trigger
 */
function wrapperClass(
  open: boolean,
  side: TooltipBubbleProps['placement']['side'],
  extra = ''
): string {
  return `inline-block align-top ${popupWrapperClass(open ? side : null)} ${extra}`;
}

/**
 * Figma "Rules/Tooltip" on an ⓘ (design-notes §3 "Tooltip"): an (i) that shows a short
 * explanation below it while the mouse is over it, and gone as soon as the mouse leaves; the
 * mouse can move onto the bubble without closing it. Keyboard focus shows it too, Escape closes
 * it, and on touch screens, which have no hover, a tap opens and closes it (FR-052g). The text is
 * the button's description (WCAG 1.4.13), never a `title`. The bubble opens to the side `arrow`
 * asks for where it fits, otherwise to the other side, or across the page (WCAG 1.4.10), below
 * the icon where it fits, otherwise above it. The ⓘ is muted grey, the info blue on blue
 * backgrounds, the action blue after "Add variant" (`tone`, build note 35)
 */
export default function InfoTooltip({
  label,
  text,
  arrow = 'start',
  iconSize = 'default',
  tone = 'muted',
  icon,
}: InfoTooltipProps) {
  const { open, bubbleId, placement, wrapperProps, triggerProps, handleActivation } = useTooltip(
    'icon',
    arrow
  );
  const bubble = (
    <TooltipBubble id={bubbleId} text={text} open={open} trigger="icon" placement={placement} />
  );
  return (
    <span {...wrapperProps} className={wrapperClass(open, placement.side)}>
      {bubbleFirst(placement) && bubble}
      <button
        type="button"
        aria-describedby={bubbleId}
        {...triggerProps}
        onClick={handleActivation}
        className="rounded-kern-circle focus-visible:outline-kern-action-focus-default flex cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        <span
          aria-hidden="true"
          className={`kern-icon ${iconClasses(icon, tone)} ${iconSize === 'small' ? 'kern-icon--small' : ''}`}
        />
        <span className="kern-sr-only">{label}</span>
      </button>
      {!bubbleFirst(placement) && bubble}
    </span>
  );
}

/**
 * The disabled button with explanation (design-notes §3; FR-034, FR-052b, W21): a button that,
 * while `explanation` is set, is `aria-disabled="true"`, stays focusable, ignores activation
 * (a click, Enter, Space, a form's submit) and shows the explanation in the tooltip on hover, on
 * keyboard focus and on a tap, as its description. Without an explanation it is an ordinary
 * button and the tooltip never shows. The button keeps its place in the page either way, so
 * the focus stays on it when the explanation comes or goes. KERN's `[aria-disabled=true]`
 * styles fade it to 40 % (U29 6348:40236, U30 6350:41190) and show `cursor: not-allowed`
 */
export function ExplainedButton({
  explanation,
  align = 'start',
  wrapperClassName = '',
  type = 'button',
  className = '',
  onClick,
  children,
  ...buttonProps
}: ExplainedButtonProps) {
  const disabled = Boolean(explanation);
  const { open, bubbleId, placement, wrapperProps, triggerProps, handleActivation } = useTooltip(
    'button',
    align,
    disabled
  );

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (disabled) {
      event.preventDefault();
      handleActivation(event);
    } else {
      onClick?.(event);
    }
  }

  const bubble = disabled && (
    <TooltipBubble
      id={bubbleId}
      text={explanation}
      open={open}
      trigger="button"
      placement={placement}
    />
  );
  return (
    <span {...wrapperProps} className={wrapperClass(open, placement.side, wrapperClassName)}>
      {bubbleFirst(placement) && bubble}
      <button
        {...buttonProps}
        type={type}
        aria-disabled={disabled || undefined}
        aria-describedby={disabled ? bubbleId : undefined}
        {...triggerProps}
        onClick={handleClick}
        className={`${className} align-top ${disabled ? disabledStillClasses(className) : ''}`}
      >
        {children}
      </button>
      {!bubbleFirst(placement) && bubble}
    </span>
  );
}
