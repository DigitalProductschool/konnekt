// The paginator (specs/011-connection-pdf/data-model.md section 4; research R4; contracts/
// pdf-document.md section 3): measured blocks → pages, before anything is drawn, so that the page
// count is known for "Page n of N". Ported from `prototype/paginate.mjs`. Pure: nothing here is
// stored, sent or logged (FR-041, FR-042)
import type { Block, Page, PlaceLabelTexts } from './types';

/**
 * Each unit's height on a page of its own: its blocks' heights and the gaps between them, the
 * first block's gap left out (it is dropped at the top of a page)
 */
function unitHeightsOf(blocks: readonly Block[]): Map<string, number> {
  const heights = new Map<string, number>();
  for (const block of blocks) {
    for (const unit of block.unitOf) {
      const sum = heights.get(unit);
      heights.set(unit, sum === undefined ? block.height : sum + block.gapBefore + block.height);
    }
  }
  return heights;
}

/**
 * Whether the chain that starts at `first` should start on a fresh page rather than below `y`.
 * It walks the whole chain (the blocks linked by `keepWithNext`): yes when the chain runs past the
 * page, or when a unit that any block of the chain opens would fit on a fresh page, with the part
 * of the chain leading into it, but not on what is left of this one (FR-024, FR-025, FR-026)
 */
function chainStartsOnFreshPage(
  blocks: readonly Block[],
  first: number,
  y: number,
  pageHeight: number,
  unitHeights: ReadonlyMap<string, number>
): boolean {
  const start = y + blocks[first].gapBefore;
  let top = start;
  for (let index = first; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (index > first) top += block.gapBefore;
    // Where the block would sit on a fresh page, the chain's first block at its top
    const offset = top - start;
    for (const unit of block.startsUnits) {
      const height = unitHeights.get(unit);
      if (height === undefined) continue;
      if (offset + height <= pageHeight && top + height > pageHeight) return true;
    }
    top += block.height;
    if (top > pageHeight) return true;
    if (!block.keepWithNext) return false;
  }
  return false;
}

/**
 * Places the blocks on pages of `pageHeight` points (the body's height), in order, each block
 * whole (FR-023; a rule taller than a page arrives already cut, FR-027). A chain breaks only
 * before its first block, or inside only where a block would run past the page; a unit that fits
 * on a fresh page but not on the rest of this one starts on the next page, and a taller one flows
 * and splits between its blocks. A block's gap is dropped at the top of a page. Returns each
 * page's blocks with their tops in the body
 */
export function paginate(blocks: readonly Block[], pageHeight: number): Page[] {
  const unitHeights = unitHeightsOf(blocks);
  const pages: Page[] = [];
  let page: Page = [];
  let y = 0;
  blocks.forEach((block, index) => {
    if (y > 0) {
      const chained = index > 0 && blocks[index - 1].keepWithNext;
      const breaks = chained
        ? y + block.gapBefore + block.height > pageHeight
        : chainStartsOnFreshPage(blocks, index, y, pageHeight, unitHeights);
      if (breaks) {
        pages.push(page);
        page = [];
        y = 0;
      }
    }
    const top = y === 0 ? 0 : y + block.gapBefore;
    page.push({ index, y: top });
    y = top + block.height;
  });
  if (page.length > 0) pages.push(page);
  return pages;
}

const ELLIPSIS = '…';

/**
 * `text`'s longest start, cut between characters with its trailing spaces dropped and "…" after
 * it, for which `fits` holds; "…" alone when none does. `fits` is assumed to hold for shorter
 * starts whenever it holds for a longer one (a width bound does)
 */
export function cutToFit(text: string, fits: (cut: string) => boolean): string {
  const characters = Array.from(text);
  const cut = (count: number): string =>
    `${characters.slice(0, count).join('').trimEnd()}${ELLIPSIS}`;
  let fitting = 0;
  let failing = characters.length;
  while (failing - fitting > 1) {
    const middle = Math.floor((fitting + failing) / 2);
    if (fits(cut(middle))) fitting = middle;
    else failing = middle;
  }
  return cut(fitting);
}

/**
 * The bottom's place label of a page (FR-021): where its first block is, "2 Documents and data
 * items" or "3 Rules per variant › Variant Taxi", plus " (continued)" unless that block opens the
 * section or variant named. Null on page 1 (the page that holds the first block), on a page that
 * starts outside the sections (the gaps), and on an empty page.
 *
 * `fits`, when given, is the drawing's test of one line (its width in the label's style within the
 * label's box, design-notes 8.2 D9): a label that fails it has only the variant's name cut with
 * "…" (`cutToFit()`), so that the section and "(continued)" stay whole (FR-025, SC-005)
 */
export function placeLabelOf(
  page: Page,
  blocks: readonly Block[],
  texts: PlaceLabelTexts,
  fits?: (label: string) => boolean
): string | null {
  if (page.length === 0 || page[0].index === 0) return null;
  const { section, variant, opens } = blocks[page[0].index].place;
  if (section === null) return null;
  const opened = variant !== null ? opens === 'variant' : opens === 'section';
  const labelWith = (name: string | null): string => {
    let label = `${section} ${texts.sections[section]}`;
    if (name !== null) label += ` › ${texts.variant(name)}`;
    return opened ? label : `${label} ${texts.continued}`;
  };
  const label = labelWith(variant);
  if (fits === undefined || variant === null || fits(label)) return label;
  return labelWith(cutToFit(variant, (name) => fits(labelWith(name))));
}
