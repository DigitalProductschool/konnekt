import {
  type PointerEvent,
  type RefObject,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from 'react';

import { placementFrom, popupWrapperClass } from '../../utils/popupPlacement';
import { ExplainedButton } from '../InfoTooltip';
import { TOOLTIP_BOX, TOOLTIP_HEIGHT } from '../InfoTooltip/constants';
import { bubblePlacementClass } from '../InfoTooltip/utils';
import {
  COPIED_RESET_MS,
  COPY_BUTTON,
  COPY_TEXTS,
  DEACTIVATED_EXPLANATION,
  FULL_URL_WIDTH,
  INITIAL_COPY_STATE,
  URL_BOX,
} from './constants';
import type {
  CopyableUrlProps,
  CopyButtonProps,
  FullUrlBubbleProps,
  FullUrlFrameProps,
  FullUrlState,
} from './types';
import { copyReducer, copyToClipboard, isCut, selectText } from './utils';

const CLOSED: FullUrlState = { open: false, placement: { side: 'start', direction: 'down' } };

/**
 * The full text of a cut URL in a bubble while the mouse is over it (U07 note 33: one line, cut
 * with "…"). Screen readers read the full text from the page, so the bubble is only visual;
 * Escape closes it (WCAG 1.4.13)
 */
function useFullUrl(boxRef: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<FullUrlState>(CLOSED);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.open) {
      return;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setState((current) => ({ ...current, open: false }));
      }
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [state.open]);

  function handleEnter(event: PointerEvent) {
    const box = boxRef.current;
    if (event.pointerType === 'touch' || !box || !isCut(box)) {
      return;
    }
    const { side, direction } = placementFrom(
      wrapperRef.current,
      FULL_URL_WIDTH,
      'start',
      0,
      TOOLTIP_HEIGHT
    );
    setState({ open: true, placement: { side, direction } });
  }

  return {
    state,
    wrapperProps: {
      ref: wrapperRef,
      onPointerEnter: handleEnter,
      onPointerLeave: () => setState((current) => ({ ...current, open: false })),
    },
  };
}

/** The bubble with the full URL: the tooltip's look (T022), flush with the URL's edge */
function FullUrlBubble({ text, placement }: FullUrlBubbleProps) {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-40 flex ${bubblePlacementClass('button', placement)}`}
    >
      <span className={`${TOOLTIP_BOX} break-all`}>{text}</span>
    </span>
  );
}

/**
 * The value's box with the full value's bubble around it. Its content never widens its
 * ancestors (`contain: inline-size`): a column that sizes to its content gets the box's width
 * from its other parts, and the URL is cut to it
 */
function FullUrlFrame({ text, boxRef, children }: FullUrlFrameProps) {
  const { state, wrapperProps } = useFullUrl(boxRef);
  return (
    <div
      {...wrapperProps}
      className={`min-w-0 flex-1 [contain:inline-size] ${popupWrapperClass(state.open ? state.placement.side : null)}`}
    >
      {state.open && state.placement.direction === 'up' && (
        <FullUrlBubble text={text} placement={state.placement} />
      )}
      {children}
      {state.open && state.placement.direction === 'down' && (
        <FullUrlBubble text={text} placement={state.placement} />
      )}
    </div>
  );
}

/**
 * KERN's primary button with the copy icon and "Copy link", reading "✓ Copied" for 2 s after
 * copying (U81 6396:47841); while the connection is deactivated it is off, with its
 * explanation in the tooltip (U89 6417:31309; W21, T022's `ExplainedButton`, which owns the
 * button's description). What it copies, such as "Request link" and the variant's name, is part
 * of its name: its label, then the texts `labelledBy` names
 */
function CopyButton({ copied, texts, labelledBy, deactivated, onCopy }: CopyButtonProps) {
  const labelId = useId();
  return (
    <ExplainedButton
      explanation={deactivated ? DEACTIVATED_EXPLANATION : null}
      align="end"
      wrapperClassName="shrink-0 self-start sm:self-auto"
      onClick={onCopy}
      aria-labelledby={labelledBy ? `${labelId} ${labelledBy}` : undefined}
      className={COPY_BUTTON}
    >
      <span
        aria-hidden="true"
        className={`kern-icon ${copied ? 'kern-icon--check' : 'kern-icon--content-copy'}`}
      />
      <span id={labelId} className="kern-label">
        {copied ? texts.copied : texts.copy}
      </span>
    </ExplainedButton>
  );
}

/**
 * A value to copy in one action (FR-048): the details' URL row of Figma "Links card" (U80
 * 6396:47718), the URL on one line cut with "…" and its full text in a bubble on hover, and
 * KERN's primary "Copy link"; or, as `variant="field"`, a labelled read-only field with its copy
 * button, such as the account page's new token (S20). After copying the button reads "✓ Copied"
 * for 2 s and the copy is announced; if copying fails, the value is selected and that is
 * announced. The value always copies in full
 */
export default function CopyableUrl(props: CopyableUrlProps) {
  const { describedBy, deactivated = false } = props;
  const variant = props.variant ?? 'link';
  const value = props.variant === 'field' ? props.value : props.url;
  const texts = { ...COPY_TEXTS[variant], ...props.texts };
  const [state, dispatch] = useReducer(copyReducer, INITIAL_COPY_STATE);
  const urlRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (state.status !== 'copied') {
      return;
    }
    const timer = window.setTimeout(() => dispatch({ type: 'reset' }), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [state.status, state.attempt]);

  async function handleCopy() {
    try {
      await copyToClipboard(value);
      dispatch({ type: 'copied' });
    } catch {
      const box = inputRef.current ?? urlRef.current;
      if (box) {
        selectText(box);
      }
      dispatch({ type: 'failed' });
    }
  }

  const announcement =
    state.status === 'copied' ? texts.announced : state.status === 'failed' ? texts.failed : '';
  const row = (
    <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
      {props.variant === 'field' ? (
        <FullUrlFrame text={value} boxRef={inputRef}>
          <input
            ref={inputRef}
            id={id}
            type="text"
            readOnly
            value={value}
            spellCheck={false}
            autoComplete="off"
            aria-describedby={describedBy}
            onFocus={(event) => event.target.select()}
            className={`${URL_BOX} focus-visible:outline-kern-action-focus-default border-0 focus-visible:outline-4 focus-visible:outline-offset-2`}
          />
        </FullUrlFrame>
      ) : (
        <FullUrlFrame text={value} boxRef={urlRef}>
          <div ref={urlRef} className={URL_BOX}>
            {value}
          </div>
        </FullUrlFrame>
      )}
      <CopyButton
        copied={state.status === 'copied'}
        texts={texts}
        labelledBy={props.variant === 'field' ? undefined : describedBy}
        deactivated={deactivated}
        onCopy={handleCopy}
      />
    </div>
  );
  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      {props.variant === 'field' && (
        <label
          htmlFor={id}
          className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {props.label}
        </label>
      )}
      {row}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
