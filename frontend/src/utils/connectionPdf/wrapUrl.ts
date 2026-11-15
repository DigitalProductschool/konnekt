// A URL's lines in the PDF (research R11, FR-011): printed in full and in mono text, broken only
// after a "/". PDFKit's own line breaking (UAX #14) would break after a hyphen that a letter
// follows, as in a UUID's "…-a716-…", so the drawing gets these lines one by one instead. Pure
import type { LineWidth } from './types';

/** The URL's parts, each ending with its "/" (the last one may not): the only places to break */
function segmentsOf(url: string): string[] {
  return url.match(/[^/]*\/|[^/]+$/g) ?? [];
}

/**
 * Cuts a segment wider than the line on its own at the line's end, as many characters (code
 * points) per line as fit, at least one. The last piece is returned apart, as the line the next
 * segments may join.
 */
function splitWide(segment: string, width: number, measure: LineWidth): [string[], string] {
  const lines: string[] = [];
  let current = '';
  for (const character of segment) {
    if (current !== '' && measure(current + character) > width) {
      lines.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  return [lines, current];
}

/**
 * The lines `url` is drawn in at `width`, measured with `measure` (the URL style's width).
 * Lines break only after a "/", never at a hyphen; only a segment wider than the line on its own
 * breaks at the line's end. Joining the lines gives `url` back character for character.
 */
export function urlLines(url: string, width: number, measure: LineWidth): string[] {
  const lines: string[] = [];
  let current = '';
  for (const segment of segmentsOf(url)) {
    if (measure(current + segment) <= width) {
      current += segment;
      continue;
    }
    if (current !== '') lines.push(current);
    if (measure(segment) <= width) {
      current = segment;
    } else {
      const [full, rest] = splitWide(segment, width, measure);
      lines.push(...full);
      current = rest;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}
