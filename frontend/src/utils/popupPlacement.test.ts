import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type MenuBounds,
  menuMaxHeight,
  menuPlacement,
  popupPlacement,
  popupWrapperClass,
  supportsAnchoredPopups,
} from './popupPlacement';

describe('popupPlacement', () => {
  it('keeps the preferred side where the popup fits', () => {
    expect(popupPlacement({ left: 100, right: 132 }, 1280, 220, 'start')).toBe('start');
    expect(popupPlacement({ left: 900, right: 932 }, 1280, 300, 'end')).toBe('end');
  });

  it('opens to the other side where the preferred one would leave the window', () => {
    // The first variant tab's ⋯ near the left edge: its menu opened to the left, off the window
    expect(popupPlacement({ left: 160, right: 192 }, 1280, 220, 'end')).toBe('start');
    // A connector near the right edge
    expect(popupPlacement({ left: 1100, right: 1150 }, 1280, 300, 'start')).toBe('end');
  });

  it('keeps the gutter on the side the popup opens to', () => {
    expect(popupPlacement({ left: 100, right: 132 }, 400, 284, 'start')).toBe('start');
    expect(popupPlacement({ left: 100, right: 132 }, 400, 285, 'start')).toBe('full');
    expect(popupPlacement({ left: 300, right: 332 }, 400, 316, 'end')).toBe('end');
    expect(popupPlacement({ left: 300, right: 332 }, 400, 317, 'end')).toBe('full');
  });

  it('spans the window when neither side fits, as at 320px wide', () => {
    expect(popupPlacement({ left: 50, right: 120 }, 320, 300, 'start')).toBe('full');
    expect(popupPlacement({ left: 240, right: 272 }, 320, 300, 'end')).toBe('full');
  });

  it('counts the overhang past the control, such as a tooltip arrow pointing at its icon', () => {
    // The bubble starts 8px left of the icon
    expect(popupPlacement({ left: 8, right: 32 }, 1280, 320, 'start', 8)).toBe('start');
    expect(popupPlacement({ left: 4, right: 28 }, 1280, 320, 'start', 8)).toBe('full');
    expect(popupPlacement({ left: 1000, right: 1024 }, 1280, 320, 'start', 8)).toBe('end');
  });
});

describe('popupWrapperClass', () => {
  it('lets a popup across the page be positioned from the box around its wrapper', () => {
    expect(popupWrapperClass('full')).toBe('static');
  });

  it('positions the wrapper of a popup open beside its control', () => {
    expect(popupWrapperClass('start')).toBe('relative');
    expect(popupWrapperClass('end')).toBe('relative');
  });

  it("doesn't let a closed popup's wrapper catch the popup inside it, as a rule's ⋯ menu", () => {
    // RuleListItem's "Copy to variant" wrapper holds the ⋯ menu's: a 32px box, not the card
    expect(popupWrapperClass(null)).toBe('static');
  });
});

// Bug connection-tooltip-clipped: a popup goes into the top layer only where the browser can
// anchor it there; elsewhere it stays positioned inside the page
describe('supportsAnchoredPopups', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubBrowser(popover: boolean, supported: string[]) {
    vi.stubGlobal('HTMLElement', class {});
    if (popover) {
      Object.assign(HTMLElement.prototype, { showPopover() {} });
    }
    vi.stubGlobal('CSS', {
      supports: (property: string) => supported.includes(property),
    });
  }

  it('is false outside a browser', () => {
    expect(supportsAnchoredPopups()).toBe(false);
  });

  it('is true with popovers, anchor-scope and position-try-fallbacks', () => {
    stubBrowser(true, ['anchor-scope', 'position-try-fallbacks']);
    expect(supportsAnchoredPopups()).toBe(true);
  });

  it('is false where one of them is missing', () => {
    stubBrowser(false, ['anchor-scope', 'position-try-fallbacks']);
    expect(supportsAnchoredPopups()).toBe(false);
    stubBrowser(true, ['position-try-fallbacks']);
    expect(supportsAnchoredPopups()).toBe(false);
    stubBrowser(true, ['anchor-scope']);
    expect(supportsAnchoredPopups()).toBe(false);
  });
});

// A ⋯ at the right of a rules card in a 1440 × 900 window: the header ends at 64, the wizard's
// action bar starts at 820
const WINDOW: MenuBounds = {
  viewportWidth: 1440,
  viewportHeight: 900,
  headerBottom: 64,
  footerTop: 820,
};

function trigger(top: number) {
  return { left: 1231, right: 1263, top, bottom: top + 32 };
}

describe('menuPlacement', () => {
  it('opens down where the menu fits between its ⋯ and the footer, as Figma draws it', () => {
    // A rule's menu (U55 6530:40192): 187px tall, under a ⋯ at 290
    expect(menuPlacement(trigger(290), WINDOW, 220, 187, 'end')).toEqual({
      side: 'end',
      direction: 'down',
      maxHeight: 480,
    });
  });

  it('opens up where it would reach into the footer', () => {
    // A sub-group's menu (271px) on a ⋯ 120px above the action bar
    expect(menuPlacement(trigger(668), WINDOW, 220, 271, 'end')).toEqual({
      side: 'end',
      direction: 'up',
      maxHeight: 480,
    });
  });

  it('keeps the gap to the footer: down only with 8px to spare', () => {
    // 820 − 632 = 188px below the ⋯ at 600, 536px above
    expect(menuPlacement(trigger(600), WINDOW, 220, 180, 'end').direction).toBe('down');
    expect(menuPlacement(trigger(600), WINDOW, 220, 181, 'end').direction).toBe('up');
  });

  it('opens towards the larger space where it fits on neither side, and scrolls inside', () => {
    const small: MenuBounds = { ...WINDOW, viewportHeight: 480, footerTop: 400 };
    // 136px above (200 − 64), 168px below (400 − 232)
    expect(menuPlacement(trigger(200), small, 220, 271, 'end')).toEqual({
      side: 'end',
      direction: 'down',
      maxHeight: 160,
    });
    // 236px above, 68px below
    expect(menuPlacement(trigger(300), small, 220, 271, 'end')).toEqual({
      side: 'end',
      direction: 'up',
      maxHeight: 160,
    });
  });

  it('takes the largest max-height step that fits in the space less 8px', () => {
    expect(menuMaxHeight(167)).toBe(160);
    expect(menuMaxHeight(168)).toBe(160);
    expect(menuMaxHeight(247)).toBe(160);
    expect(menuMaxHeight(248)).toBe(240);
    expect(menuMaxHeight(328)).toBe(320);
    expect(menuMaxHeight(408)).toBe(400);
    expect(menuMaxHeight(487)).toBe(400);
    expect(menuMaxHeight(488)).toBe(480);
    expect(menuMaxHeight(2000)).toBe(480);
  });

  it('keeps the smallest step where even that does not fit', () => {
    expect(menuMaxHeight(100)).toBe(160);
    expect(menuMaxHeight(-20)).toBe(160);
  });

  it('measures the step in the space the menu opens into', () => {
    // Down from a ⋯ at 400: 820 − 432 = 388px below → 320; up would have 336px
    expect(menuPlacement(trigger(400), WINDOW, 220, 300, 'end').maxHeight).toBe(320);
    // Up from a ⋯ at 600: 536px above → 480; 188px below
    expect(menuPlacement(trigger(600), WINDOW, 220, 300, 'end')).toMatchObject({
      direction: 'up',
      maxHeight: 480,
    });
  });

  it('uses the window bottom where there is no footer, as on the overview', () => {
    const noFooter: MenuBounds = { ...WINDOW, footerTop: null };
    // 900 − 772 = 128px below the window's bottom … but 708px above
    expect(menuPlacement(trigger(740), noFooter, 220, 187, 'end').direction).toBe('up');
    // 900 − 522 = 378px below
    expect(menuPlacement(trigger(490), noFooter, 220, 187, 'end')).toEqual({
      side: 'end',
      direction: 'down',
      maxHeight: 320,
    });
  });

  it('uses the window top where there is no header', () => {
    const noHeader: MenuBounds = { ...WINDOW, headerBottom: null, footerTop: null };
    // 240px above the ⋯ at 240, 628px below
    expect(menuPlacement(trigger(240), noHeader, 220, 700, 'end')).toEqual({
      side: 'end',
      direction: 'down',
      maxHeight: 480,
    });
    expect(menuPlacement(trigger(860), noHeader, 220, 700, 'end')).toEqual({
      side: 'end',
      direction: 'up',
      maxHeight: 480,
    });
  });

  it('counts a header scrolled away or a footer below the window as the window edge', () => {
    const away: MenuBounds = { ...WINDOW, headerBottom: -300, footerTop: 1400 };
    expect(menuPlacement(trigger(100), away, 220, 600, 'end')).toEqual({
      side: 'end',
      direction: 'down',
      maxHeight: 480,
    });
    // 868px above the window's bottom edge
    expect(menuPlacement(trigger(860), away, 220, 600, 'end').direction).toBe('up');
  });

  it('keeps the side rule of popupPlacement', () => {
    const narrow: MenuBounds = { ...WINDOW, viewportWidth: 320 };
    expect(
      menuPlacement({ left: 240, right: 272, top: 290, bottom: 322 }, narrow, 300, 187, 'end')
    ).toMatchObject({ side: 'full', direction: 'down' });
    expect(
      menuPlacement({ left: 160, right: 192, top: 290, bottom: 322 }, WINDOW, 220, 187, 'end').side
    ).toBe('start');
  });
});
