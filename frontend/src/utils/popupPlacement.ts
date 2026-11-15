// Where a menu, popover or tooltip opens from the control that opens it, so that it stays on the
// screen at any width and zoom (WCAG 1.4.10). It is measured when the popup opens, in the event
// that opens it, and decides between a few Tailwind class sets: no inline styles (research R10).
// The side (popupPlacement) and, for menus, the direction and the max-height step
// (menuPlacement), from the control's rectangle and the header's and footer's edges

/**
 * 'start': the popup's left edge lines up with its control's left edge, and it opens to the
 * right; 'end': its right edge lines up with the control's right edge, and it opens to the left;
 * 'full': neither fits, so it spans the box that holds the page's content less the gutters, below
 * its control. For that, a popup's wrapper is its containing block only while the popup is open
 * beside its control (popupWrapperClass), so that the nearest positioned box around it is the
 * rules card, or the wizard's content box, even where one popup's wrapper holds another's.
 * Without a top, the popup stays where the flow puts it, below its control
 */
export type PopupPlacement = 'start' | 'end' | 'full';

/** The space kept free between a popup and the window's edge, 16px as the page's side gutter */
export const POPUP_GUTTER = 16;

/**
 * The class of the element a popup is positioned from, for the popup's placement, null while it
 * is closed. The wrapper is positioned only while its popup opens beside its control: closed, or
 * across the page, it is static, so it never catches the 'full' of a popup inside it
 */
export function popupWrapperClass(placement: PopupPlacement | null): string {
  return placement === 'start' || placement === 'end' ? 'relative' : 'static';
}

/**
 * Whether a popup can open in the top layer, anchored to its control by CSS anchor positioning
 * (the Popover API, `anchor-scope`, `position-try-fallbacks`): there, a box around the control
 * that scrolls or hides its overflow no longer cuts it off (bug connection-tooltip-clipped).
 * Where one of them is missing, the popup stays positioned inside the page, as before
 */
export function supportsAnchoredPopups(): boolean {
  return (
    typeof HTMLElement !== 'undefined' &&
    'showPopover' in HTMLElement.prototype &&
    typeof CSS !== 'undefined' &&
    CSS.supports('anchor-scope', '--popup') &&
    CSS.supports('position-try-fallbacks', 'flip-block')
  );
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

/** Whether a menu opens below its control ('down') or above it ('up') */
export type MenuDirection = 'down' | 'up';

/** The heights a menu's list may take before it scrolls inside, one max-h class each */
export const MENU_MAX_HEIGHTS = [160, 240, 320, 400, 480] as const;

/** One of MENU_MAX_HEIGHTS */
export type MenuMaxHeight = (typeof MENU_MAX_HEIGHTS)[number];

/** The class of each max-height step (numeric utilities are pixels) */
export const MENU_MAX_HEIGHT_CLASSES: Record<MenuMaxHeight, string> = {
  160: 'max-h-160',
  240: 'max-h-240',
  320: 'max-h-320',
  400: 'max-h-400',
  480: 'max-h-480',
};

/** The space a menu keeps from the header's bottom or the footer's top, 8px */
export const MENU_EDGE_GAP = 8;

/**
 * Where a menu opens from its control (data-model §2): the side as popupPlacement() decides
 * it, the direction, and the largest max-height step that fits in the space it opens into
 */
export interface MenuPlacement {
  side: PopupPlacement;
  direction: MenuDirection;
  maxHeight: MenuMaxHeight;
}

/** The control's rectangle, as getBoundingClientRect() gives it */
export interface MenuAnchor extends PopupAnchor {
  top: number;
  bottom: number;
}

/**
 * The window and the edges a menu stays between: the bottom of the header that stays put above
 * the page and the top of the footer that stays put below it, null where there is none (then
 * the window's top or bottom). Edges outside the window count as the window's edge.
 */
export interface MenuBounds {
  viewportWidth: number;
  viewportHeight: number;
  headerBottom: number | null;
  footerTop: number | null;
}

/** The free space above and below the control, between the header and the footer */
function spaceAround(anchor: MenuAnchor, bounds: MenuBounds): { above: number; below: number } {
  const top = Math.min(Math.max(bounds.headerBottom ?? 0, 0), bounds.viewportHeight);
  const bottom = Math.max(
    Math.min(bounds.footerTop ?? bounds.viewportHeight, bounds.viewportHeight),
    0
  );
  return { above: anchor.top - top, below: bottom - anchor.bottom };
}

/** The largest max-height step that fits in `space` px less the gap, or the smallest step */
export function menuMaxHeight(space: number): MenuMaxHeight {
  const fitting = MENU_MAX_HEIGHTS.filter((step) => step <= space - MENU_EDGE_GAP);
  return fitting.length > 0 ? fitting[fitting.length - 1] : MENU_MAX_HEIGHTS[0];
}

/**
 * The placement of a menu `width` px wide and `height` px tall (its height with every entry).
 * It opens down where its height fits between the control's bottom and the footer's top (or
 * the window's bottom), less the gap; otherwise up where it fits there; where it fits on
 * neither side, towards the larger space, and its list scrolls inside the max-height step.
 */
export function menuPlacement(
  anchor: MenuAnchor,
  bounds: MenuBounds,
  width: number,
  height: number,
  preferred: 'start' | 'end',
  overhang = 0
): MenuPlacement {
  const side = popupPlacement(anchor, bounds.viewportWidth, width, preferred, overhang);
  const { above, below } = spaceAround(anchor, bounds);
  let direction: MenuDirection;
  if (height <= below - MENU_EDGE_GAP) {
    direction = 'down';
  } else if (height <= above - MENU_EDGE_GAP) {
    direction = 'up';
  } else {
    direction = above > below ? 'up' : 'down';
  }
  return { side, direction, maxHeight: menuMaxHeight(direction === 'down' ? below : above) };
}

/** Whether an element's content is clipped vertically: it scrolls or hides its overflow */
function clipsVertically(element: Element): boolean {
  return getComputedStyle(element).overflowY !== 'visible';
}

/** A length in px that the wizard sets on the root element (WizardLayout), null without one */
function wizardEdge(property: string): number | null {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(property));
  return Number.isNaN(value) ? null : value;
}

/**
 * The header's bottom and the footer's top for a control on the page, measured now: the page's
 * header (the top bar, outside any dialog); in the wizard, whose page scrolls, the bottom of its
 * sticky step header and the top of its sticky footer (`--wizard-sticky-top` / `-bottom`, T033),
 * unless the control is in a dialog; and the box that scrolls the control, where one does (such
 * as the test step's panel), whose edges a menu can't pass
 */
function boundsOf(control: Element): MenuBounds {
  const viewportHeight = document.documentElement.clientHeight;
  const header = [...document.querySelectorAll('header')].find((each) => !each.closest('dialog'));
  let headerBottom = header ? header.getBoundingClientRect().bottom : null;
  let footerTop: number | null = null;
  if (!control.closest('dialog')) {
    const stickyTop = wizardEdge('--wizard-sticky-top');
    const stickyBottom = wizardEdge('--wizard-sticky-bottom');
    if (stickyTop !== null) {
      headerBottom = Math.max(headerBottom ?? 0, stickyTop);
    }
    if (stickyBottom) {
      footerTop = viewportHeight - stickyBottom;
    }
  }
  let parent = control.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    if (clipsVertically(parent)) {
      const box = parent.getBoundingClientRect();
      headerBottom = Math.max(headerBottom ?? 0, box.top);
      if (box.bottom < (footerTop ?? viewportHeight)) {
        footerTop = box.bottom;
      }
      break;
    }
    parent = parent.parentElement;
  }
  return {
    viewportWidth: document.documentElement.clientWidth,
    viewportHeight,
    headerBottom,
    footerTop,
  };
}

/**
 * menuPlacement() for a control on the page, measured now. A popup that isn't a menu (a
 * tooltip, a popover) passes no height and uses the side alone
 */
export function placementFrom(
  control: Element | null,
  width: number,
  preferred: 'start' | 'end',
  overhang = 0,
  height = 0
): MenuPlacement {
  if (!control) {
    return { side: preferred, direction: 'down', maxHeight: MENU_MAX_HEIGHTS[4] };
  }
  return menuPlacement(
    control.getBoundingClientRect(),
    boundsOf(control),
    width,
    height,
    preferred,
    overhang
  );
}
