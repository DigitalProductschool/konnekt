import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from 'react';
import { generatePath, Link } from 'react-router';

import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import { SKELETON_BARS } from '../../components/FormConnectionLoadState/constants';
import {
  CLOSED,
  TOOLTIP_BOX,
  TOOLTIP_HEIGHT,
  TOOLTIP_WIDTH,
} from '../../components/InfoTooltip/constants';
import { bubblePlacementClass, isOpen, tooltipReducer } from '../../components/InfoTooltip/utils';
import { ROUTES } from '../../constants';
import { useLanguage } from '../../hooks/useLanguage';
import { placementFrom, POPUP_GUTTER, popupWrapperClass } from '../../utils/popupPlacement';
import { LIST_COPY, ROW_CLASSES, ROW_EDIT_CLASSES, SKELETON_ROW_BARS } from './constants';
import type { FormConnectionRowProps, RowDescriptionHandle, RowDescriptionProps } from './types';
import { descriptionOf, rowMetaOf } from './utils';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * A row's description (U13 7173:52304), cut to one line with "…" (FR-032), and the design's
 * tooltip with the full text (U13 7366:55276, FR-051 (35)) while the mouse is over a cut
 * description or the bubble, while the row's name has the keyboard focus, and after a tap on
 * touch screens until the next tap (FR-052g); Escape and a tap elsewhere close it (WCAG 1.4.13).
 * Only a description that is cut shows it. The text is whole in the page for screen readers, so
 * the bubble, which repeats it, is hidden from them; no `title` attribute
 */
function RowDescription({ text, ref }: RowDescriptionProps) {
  const [state, dispatch] = useReducer(tooltipReducer, CLOSED);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const pressedWith = useRef<string | null>(null);
  const [cut, setCut] = useState(false);
  const open = cut && isOpen(state);

  // Measured when the tooltip may open: the description's width changes with the window's
  function measure(): boolean {
    const element = textRef.current;
    const isCut = element !== null && element.scrollWidth > element.clientWidth;
    setCut(isCut);
    if (isCut) {
      const width = Math.min(
        TOOLTIP_WIDTH,
        document.documentElement.clientWidth - 2 * POPUP_GUTTER
      );
      const { side, direction } = placementFrom(
        wrapperRef.current,
        width,
        'start',
        0,
        TOOLTIP_HEIGHT
      );
      dispatch({ type: 'place', placement: { side, direction } });
    }
    return isCut;
  }

  // The name's keyboard focus opens it too (the row tells it)
  useImperativeHandle(ref, () => ({
    nameFocus(focused: boolean) {
      if (focused) {
        measure();
      }
      dispatch({ type: 'focus', value: focused });
    },
  }));

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnOutsidePointer(event: globalThis.PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
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
  function handleHover(event: PointerEvent, value: boolean) {
    if (event.pointerType !== 'touch') {
      if (value) {
        measure();
      }
      dispatch({ type: 'hover', value });
    }
  }

  function handleClick(event: MouseEvent) {
    if (pressedWith.current === 'touch' && event.target === textRef.current && measure()) {
      dispatch({ type: 'tap' });
    }
    pressedWith.current = null;
  }

  const placement = state.placement;
  return (
    // The bubble opens below the description where it fits, otherwise above it (the rows
    // scroll inside the card, whose edges it stays between), and across the row where 280px
    // don't fit beside it
    <div
      ref={wrapperRef}
      onPointerEnter={(event) => handleHover(event, true)}
      onPointerLeave={(event) => handleHover(event, false)}
      onPointerDown={(event) => {
        pressedWith.current = event.pointerType;
      }}
      onClick={handleClick}
      className={`flex min-w-0 flex-col ${popupWrapperClass(open ? placement.side : null)}`}
    >
      <p ref={textRef} className={`${SMALL_TEXT} text-kern-layout-text-muted truncate`}>
        {text}
      </p>
      <span
        aria-hidden="true"
        className={`absolute z-40 ${bubblePlacementClass('button', placement)} ${open ? 'flex' : 'hidden'}`}
      >
        <span className={TOOLTIP_BOX}>{text}</span>
      </span>
    </div>
  );
}

/**
 * Figma "Row" (U13 6739:40536, U12 6699:45011, U17 6699:48024): the name, which opens the
 * details (U13 #21), with its description cut to one line under it (or none, the name centred);
 * the status pill (T019; "Scheduled" is F1); "Edited <date>", a draft adding its step (FR-048,
 * FR-052d); and "View" (tertiary, eye), "Edit" (secondary, pencil) and the red bin "Delete"
 * (tertiary, icon only), each naming the connection for screen readers (FR-028). A published
 * connection's "Edit", active or deactivated, asks "Edit “<name>”?" first (F48; U15 6699:47905),
 * in the overview's one question. A draft offers the same actions (cosmetic 2): its "Edit" opens
 * the editor at the step it was saved in, without asking. Rows are 80 high with or without a
 * description (FR-029b). No checkbox (F14)
 */
export default function FormConnectionRow({
  formConnection,
  onDelete,
  onEdit,
}: FormConnectionRowProps) {
  const { language } = useLanguage();
  const copy = LIST_COPY[language];
  const { id, name, is_active: isActive, status } = formConnection;
  const draft = status === 'draft';
  const description = descriptionOf(formConnection);
  const detailsPath = generatePath(ROUTES.formConnection, { id });
  const descriptionRef = useRef<RowDescriptionHandle>(null);
  const editContent = (
    <>
      <span aria-hidden="true" className="kern-icon kern-icon--edit" />
      <span className="kern-label">
        {copy.edit}
        <span className="sr-only"> {name}</span>
      </span>
    </>
  );

  // Only keyboard focus opens the description's tooltip: after a click the mouse decides
  function handleNameFocus(event: FocusEvent<HTMLAnchorElement>) {
    if (event.currentTarget.matches(':focus-visible')) {
      descriptionRef.current?.nameFocus(true);
    }
  }

  return (
    <li className={ROW_CLASSES.row}>
      <div className={ROW_CLASSES.name}>
        <Link
          to={detailsPath}
          onFocus={handleNameFocus}
          onBlur={() => descriptionRef.current?.nameFocus(false)}
          className={`${SMALL_TEXT} text-kern-layout-text-default rounded-kern-small focus-visible:outline-kern-action-focus-default self-start font-semibold break-words hover:underline focus-visible:outline-4 focus-visible:outline-offset-2`}
        >
          {name}
        </Link>
        {description && <RowDescription ref={descriptionRef} text={description} />}
      </div>
      <div className={ROW_CLASSES.status}>
        <ConnectionStatusBadge isActive={isActive} draft={draft} />
      </div>
      <p className={ROW_CLASSES.date}>{rowMetaOf(formConnection, language)}</p>
      <div aria-hidden="true" className={ROW_CLASSES.spacer} />
      <div className={ROW_CLASSES.actions}>
        <Link to={detailsPath} className="kern-btn kern-btn--tertiary kern-btn--small">
          <span aria-hidden="true" className="kern-icon kern-icon--visibility" />
          <span className="kern-label">
            {copy.view}
            {/* "View" alone doesn't say which connection. Not kern-sr-only: inside a labelled
                kern-btn it makes the button icon-sized */}
            <span className="sr-only"> {name}</span>
          </span>
        </Link>
        {draft ? (
          <Link to={generatePath(ROUTES.editFormConnection, { id })} className={ROW_EDIT_CLASSES}>
            {editContent}
          </Link>
        ) : (
          <button type="button" onClick={() => onEdit(formConnection)} className={ROW_EDIT_CLASSES}>
            {editContent}
          </button>
        )}
        {/* Icon only: kern-sr-only makes it KERN's 40px square button (U13 6739:40548) */}
        <button
          type="button"
          onClick={() => onDelete(formConnection)}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--delete bg-kern-feedback-danger!"
          />
          <span className="kern-sr-only">{copy.deleteLabel(name)}</span>
        </button>
      </div>
    </li>
  );
}

/**
 * A row while the list loads (§3 "Skeleton", U06 #95 "skeletons in the final layout"): the row's
 * columns and height with the kit's bars, strong for the name and status, light for the
 * description and the date. Decorative: the list's status says that it loads
 */
export function FormConnectionRowSkeleton() {
  return (
    <div className={`${ROW_CLASSES.row} min-h-80`}>
      <div className={`${ROW_CLASSES.name} gap-14`}>
        <div className={`rounded-kern-small ${SKELETON_ROW_BARS.name} ${SKELETON_BARS.strong}`} />
        <div
          className={`rounded-kern-small ${SKELETON_ROW_BARS.description} max-w-full ${SKELETON_BARS.light}`}
        />
      </div>
      <div className={ROW_CLASSES.status}>
        <div className={`rounded-kern-small ${SKELETON_ROW_BARS.status} ${SKELETON_BARS.strong}`} />
      </div>
      <div className={ROW_CLASSES.date}>
        <div className={`rounded-kern-small ${SKELETON_ROW_BARS.date} ${SKELETON_BARS.light}`} />
      </div>
    </div>
  );
}
