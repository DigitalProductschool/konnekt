// A sticky bar pins once its top scrolls past the scrolling area's top (B3, Figma note
// 6524:38720). A 1px sentinel overlaps the bar's top edge in the flow: while the bar rests, both
// share their top; once the bar pins, the sentinel scrolls on above it

/**
 * Whether the bar is pinned: its sentinel has moved above it. Half a pixel absorbs subpixel
 * rounding while both rest together.
 */
export function isPinned(sentinelTop: number, barTop: number): boolean {
  return sentinelTop < barTop - 0.5;
}
