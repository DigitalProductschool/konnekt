// Where a menu, popover or tooltip opens from the control that opens it, so that it stays on the
// screen at any width and zoom (WCAG 1.4.10). It is measured when the popup opens, in the event
// that opens it, and decides between a few Tailwind class sets: no inline styles

/**
 * 'start': the popup's left edge lines up with its control's left edge, and it opens to the
 * right; 'end': its right edge lines up with the control's right edge, and it opens to the left;
 * 'full': neither fits, so it spans the box that holds the page's content less the gutters, below
 * its control. For that, the popup's wrapper stops being its containing block while it is open
 * (popupWrapperClass), so that the nearest positioned box around it is: the rules card, or the
 * wizard's scrolling area. Without a top, the popup stays where the flow puts it, below its
 * control
 */
export type PopupPlacement = 'start' | 'end' | 'full';

/** The space kept free between a popup and the window's edge, 16px as the page's side gutter */
export const POPUP_GUTTER = 16;

/** The class of the element a popup is positioned from, for the popup's placement */
export function popupWrapperClass(placement: PopupPlacement | null): string {
  return placement === 'full' ? 'static' : 'relative';
}

/** The horizontal extent of the control that opens a popup, as getBoundingClientRect() gives it */
export interface PopupAnchor {
  left: number;
  right: number;
}

/**
 * The placement of a popup `width` px wide, its `preferred` side first, then the other one.
 * `overhang` is how far the popup reaches past the control's edge it lines up with, such as a
 * tooltip whose arrow points at its icon's centre. The popup must stay inside the window and
 * keep the gutter on the side it opens to.
 */
export function popupPlacement(
  anchor: PopupAnchor,
  viewportWidth: number,
  width: number,
  preferred: 'start' | 'end',
  overhang = 0
): PopupPlacement {
  function fits(side: 'start' | 'end'): boolean {
    if (side === 'start') {
      const left = anchor.left - overhang;
      return left >= 0 && left + width <= viewportWidth - POPUP_GUTTER;
    }
    const right = anchor.right + overhang;
    return right <= viewportWidth && right - width >= POPUP_GUTTER;
  }
  if (fits(preferred)) {
    return preferred;
  }
  const other = preferred === 'start' ? 'end' : 'start';
  return fits(other) ? other : 'full';
}

/** popupPlacement() for a control on the page, measured now */
export function placementFrom(
  control: Element | null,
  width: number,
  preferred: 'start' | 'end',
  overhang = 0
): PopupPlacement {
  if (!control) {
    return preferred;
  }
  return popupPlacement(
    control.getBoundingClientRect(),
    document.documentElement.clientWidth,
    width,
    preferred,
    overhang
  );
}
