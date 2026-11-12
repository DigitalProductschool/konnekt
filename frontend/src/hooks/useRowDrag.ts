import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import {
  ROW_DRAG_COPY,
  ROW_DRAG_PROPERTIES,
} from '../pages/FormConnectionEditor/DocumentsStep/constants';
import type {
  DragListBox,
  DragPoint,
  DragRowBox,
  RowDragEvent,
  RowDragState,
} from '../pages/FormConnectionEditor/DocumentsStep/types';
import {
  dragOffsetOf,
  dragPointerTypeOf,
  dropLineOf,
  ROW_DRAG_HOLD_MS,
  ROW_DRAG_IDLE,
  rowDragReducer,
  touchDragArmed,
  waitsForHold,
} from '../pages/FormConnectionEditor/DocumentsStep/utils';

/** The row being dragged, for the list to render: it leaves the list, and the line marks `gap` */
export interface DraggedRow {
  /** The dragged row's index in the list */
  index: number;
  /** The drop line's gap (`dropLineOf()`): 0 above the first row, `n` below the last */
  gap: number;
}

export interface RowDragOptions {
  /** The rows in the area, in list order (`querySelectorAll`) */
  rowSelector: string;
  /** The parts of a row on which a press starts no drag (its buttons, an open menu) */
  ignoreSelector: string;
  /** A release inside the area moved the row at `from` to `to` (list indexes) */
  onMove: (from: number, to: number) => void;
}

export interface RowDrag {
  /**
   * The callback ref of the list's area: its box is where a release moves the row, it holds the
   * non-passive `touchmove` listener, the pointer capture while dragging, and the custom
   * properties that place the copy (`ROW_DRAG_PROPERTIES`)
   */
  attachArea: (element: HTMLElement | null) => (() => void) | undefined;
  /** While a row is dragged: which one, and where the line is; null otherwise */
  dragged: DraggedRow | null;
  /** A row's `pointerdown` */
  onRowPointerDown: (index: number, event: ReactPointerEvent<HTMLElement>) => void;
}

/** An element's box in the viewport, as the machine takes the list's */
function listBoxOf(element: HTMLElement): DragListBox {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  return { left, top, right, bottom };
}

/** The rows' vertical boxes, `shift` px lower than measured */
function shiftedRows(rows: readonly DragRowBox[], shift: number): DragRowBox[] {
  return rows.map(({ top, bottom }) => ({ top: top + shift, bottom: bottom + shift }));
}

/**
 * The faded copy's width when the pointer has moved `offsetX` px from where it pressed the row
 * (T059a): its right edge `ROW_DRAG_COPY.inset` px inside the row's, at most the row's width, at
 * least `ROW_DRAG_COPY.minWidth`
 */
export function dragCopyWidthOf(rowWidth: number, offsetX: number): number {
  const inside = rowWidth - ROW_DRAG_COPY.inset - offsetX;
  return Math.max(ROW_DRAG_COPY.minWidth, Math.min(rowWidth, inside));
}

/** A pointer event's position in the viewport */
function pointOf(event: PointerEvent): DragPoint {
  return { x: event.clientX, y: event.clientY };
}

/**
 * Dragging a row of a list to its place with a mouse, a pen or a touch (S8 "Dragging", FR-046,
 * R6): the listeners and the 400 ms hold timer that feed the pure machine `rowDragReducer()`
 * (`DocumentsStep/utils.ts`). No library and no HTML drag and drop.
 *
 * - A press on a row (the primary button, not on `ignoreSelector`) measures the rows and the
 *   area, then listens on the window until it ends: a mouse or pen drags after 4 px; a touch
 *   after a 400 ms hold, and a touch that moves earlier lets the browser scroll the list (the rows
 *   carry `touch-action: pan-y`), whose `pointercancel` ends the wait.
 * - While a touch drags, the area's non-passive `touchmove` listener prevents the scrolling. While
 *   any pointer drags, the area holds its capture, the copy's custom properties follow it, and a
 *   scroll moves the measured rows by as much as the area's content moved.
 * - A release inside the area answers `onMove(from, to)` (the latest one, through a ref); outside
 *   it, Escape, `pointercancel`, a lost capture or a second pointer end the drag with the order
 *   unchanged, and the focus goes back into the row if it was there and was lost. The `click`
 *   after a drag is swallowed, so that the row isn't also chosen.
 *
 * Nothing transitions: the row leaves the list and comes back, the line and the copy just show.
 * Positions are never stored, sent or logged.
 */
export function useRowDrag({ rowSelector, ignoreSelector, onMove }: RowDragOptions): RowDrag {
  const [dragged, setDragged] = useState<DraggedRow | null>(null);
  const onMoveRef = useRef(onMove);
  const stateRef = useRef<RowDragState>(ROW_DRAG_IDLE);
  const areaElementRef = useRef<HTMLElement | null>(null);
  // Ends the press or drag in progress without a move (on unmount)
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => () => abortRef.current?.(), []);

  const attachArea = useCallback((element: HTMLElement | null) => {
    areaElementRef.current = element;
    if (!element) {
      return undefined;
    }
    // Non-passive, so that it can keep the page from scrolling while a touch drags (R6)
    function preventScroll(event: TouchEvent) {
      if (touchDragArmed(stateRef.current) && event.cancelable) {
        event.preventDefault();
      }
    }
    element.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      element.removeEventListener('touchmove', preventScroll);
      if (areaElementRef.current === element) {
        areaElementRef.current = null;
      }
    };
  }, []);

  const onRowPointerDown = useCallback(
    (index: number, event: ReactPointerEvent<HTMLElement>) => {
      const found = areaElementRef.current;
      const target = event.target as Element;
      if (
        stateRef.current.phase !== 'idle' ||
        !found ||
        !event.isPrimary ||
        event.button !== 0 ||
        target.closest(ignoreSelector)
      ) {
        return;
      }
      const area: HTMLElement = found;
      const apply = (rowEvent: RowDragEvent): RowDragState => {
        stateRef.current = rowDragReducer(stateRef.current, rowEvent);
        return stateRef.current;
      };
      const rowElements = Array.from(area.querySelectorAll<HTMLElement>(rowSelector));
      const rowRects = rowElements.map((row) => row.getBoundingClientRect());
      const rows = rowRects.map(({ top, bottom }) => ({ top, bottom }));
      const native = event.nativeEvent;
      const pointerId = native.pointerId;
      const pointerType = dragPointerTypeOf(native.pointerType);
      const pressed = apply({
        type: 'down',
        pointerId,
        pointerType,
        position: pointOf(native),
        time: native.timeStamp,
        index,
        rows,
        list: listBoxOf(area),
      });
      if (pressed.phase !== 'pressed') {
        return;
      }

      // Where the area's content was when the rows were measured, to follow a scroll
      const areaTop = area.getBoundingClientRect().top;
      const scrollTop = area.scrollTop;
      const pressedRow = rowElements[index];
      const rowRect = rowRects[index];
      // The focus the row had when the drag started (a mouse press focuses its button), given
      // back if hiding the row lost it and nothing moved
      let focused: HTMLElement | null = null;
      let position = pointOf(native);
      let timer: number | undefined;
      let wasDragging = false;
      const { style } = area;

      function clearTimer() {
        if (timer !== undefined) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      }

      function startDragging() {
        wasDragging = true;
        focused = pressedRow.contains(document.activeElement)
          ? (document.activeElement as HTMLElement)
          : null;
        style.setProperty(ROW_DRAG_PROPERTIES.left, `${rowRect.left}px`);
        style.setProperty(ROW_DRAG_PROPERTIES.top, `${rowRect.top}px`);
        try {
          area.setPointerCapture(pointerId);
        } catch {
          // The pointer is already gone: its pointerup or pointercancel ends the drag
        }
        area.addEventListener('lostpointercapture', onLostCapture);
      }

      /** Brings the listeners, the timer and the rendering in line with the machine's state */
      function follow(state: RowDragState) {
        if (waitsForHold(state) && state.phase === 'pressed') {
          if (timer === undefined) {
            const wait = Math.max(0, state.pressedAt + ROW_DRAG_HOLD_MS - performance.now());
            timer = window.setTimeout(() => {
              timer = undefined;
              follow(apply({ type: 'tick', time: performance.now() }));
            }, wait);
          }
        } else {
          clearTimer();
        }
        if (state.phase === 'dragging') {
          if (!wasDragging) {
            startDragging();
          }
          const offset = dragOffsetOf(state);
          const line = dropLineOf(state);
          if (offset && line) {
            style.setProperty(ROW_DRAG_PROPERTIES.x, `${offset.x}px`);
            style.setProperty(
              ROW_DRAG_PROPERTIES.width,
              `${dragCopyWidthOf(rowRect.width, offset.x)}px`
            );
            style.setProperty(ROW_DRAG_PROPERTIES.y, `${offset.y}px`);
            setDragged((current) =>
              current?.index === state.index && current.gap === line.gap
                ? current
                : { index: state.index, gap: line.gap }
            );
          }
        } else if (state.phase === 'idle') {
          finish(state.move);
        }
      }

      function onPointerMove(moveEvent: PointerEvent) {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }
        position = pointOf(moveEvent);
        follow(apply({ type: 'move', pointerId, position, time: moveEvent.timeStamp }));
      }

      function onPointerUp(upEvent: PointerEvent) {
        if (upEvent.pointerId === pointerId) {
          follow(apply({ type: 'up', pointerId, position: pointOf(upEvent) }));
        }
      }

      function onPointerCancel(cancelEvent: PointerEvent) {
        follow(apply({ type: 'cancel', pointerId: cancelEvent.pointerId }));
      }

      function onLostCapture(lostEvent: PointerEvent) {
        follow(apply({ type: 'cancel', pointerId: lostEvent.pointerId }));
      }

      // A second pointer ends the drag with the order unchanged
      function onSecondPointer(downEvent: PointerEvent) {
        if (downEvent.pointerId === pointerId) {
          return;
        }
        follow(
          apply({
            type: 'down',
            pointerId: downEvent.pointerId,
            pointerType: dragPointerTypeOf(downEvent.pointerType),
            position: pointOf(downEvent),
            time: downEvent.timeStamp,
            index: -1,
            rows: [],
            list: { left: 0, top: 0, right: 0, bottom: 0 },
          })
        );
      }

      function onKeyDown(keyEvent: KeyboardEvent) {
        if (keyEvent.key !== 'Escape') {
          return;
        }
        // Escape ends the drag only: nothing else on the page reacts to it
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        follow(apply({ type: 'escape' }));
      }

      // The page or the list scrolled: the rows moved by as much as the area's content did
      function onScroll() {
        const shift = area.getBoundingClientRect().top - areaTop - (area.scrollTop - scrollTop);
        follow(
          apply({
            type: 'move',
            pointerId,
            position,
            time: performance.now(),
            rows: shiftedRows(rows, shift),
            list: listBoxOf(area),
          })
        );
      }

      // No text selection, no image drag and no touch menu while a row is pressed or dragged
      function preventDefault(defaultEvent: Event) {
        defaultEvent.preventDefault();
      }

      const listeners: [string, EventListener, AddEventListenerOptions][] = [
        ['pointermove', onPointerMove as EventListener, { capture: true }],
        ['pointerup', onPointerUp as EventListener, { capture: true }],
        ['pointercancel', onPointerCancel as EventListener, { capture: true }],
        ['pointerdown', onSecondPointer as EventListener, { capture: true }],
        ['keydown', onKeyDown as EventListener, { capture: true }],
        ['scroll', onScroll, { capture: true, passive: true }],
        ['selectstart', preventDefault, { capture: true }],
        ['dragstart', preventDefault, { capture: true }],
        ['contextmenu', preventDefault, { capture: true }],
      ];

      function removeListeners() {
        clearTimer();
        for (const [type, listener, options] of listeners) {
          window.removeEventListener(type, listener, options);
        }
        area.removeEventListener('lostpointercapture', onLostCapture);
        if (area.hasPointerCapture(pointerId)) {
          area.releasePointerCapture(pointerId);
        }
        for (const name of Object.values(ROW_DRAG_PROPERTIES)) {
          style.removeProperty(name);
        }
        abortRef.current = null;
      }

      /** The press or drag ended: `move` is the machine's answer, null for none */
      function finish(move: { from: number; to: number } | null) {
        removeListeners();
        stateRef.current = ROW_DRAG_IDLE;
        if (!wasDragging) {
          return;
        }
        swallowNextClick();
        // The row is back in the list before the move, or the focus, is applied
        flushSync(() => setDragged(null));
        if (move) {
          onMoveRef.current(move.from, move.to);
        } else if (focused?.isConnected && !area.contains(document.activeElement)) {
          focused.focus({ preventScroll: true });
        }
      }

      for (const [type, listener, options] of listeners) {
        window.addEventListener(type, listener, options);
      }
      abortRef.current = () => {
        removeListeners();
        stateRef.current = ROW_DRAG_IDLE;
      };
      follow(pressed);
    },
    [ignoreSelector, rowSelector]
  );

  return { attachArea, dragged, onRowPointerDown };
}

/** The `click` a drag's release may cause goes nowhere, so that the row isn't also chosen */
function swallowNextClick() {
  function swallow(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
  window.addEventListener('click', swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
}
