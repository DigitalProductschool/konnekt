/**
 * Pure pagination: blocks with measured heights → pages of { index, y }.
 *
 * - A block is never split (a rule card, a URL row, a document's field list).
 * - keepWithNext chains a block to the next one (headings, a group's header, the AND/OR
 *   connector, a group's last member and its closing block): the page breaks only before the
 *   first block of a chain, never inside it.
 * - A unit (a variant, a group, the result links) that fits on a fresh page, together with the
 *   chain that leads into it, but not in what is left of this page starts on the next page; a
 *   unit taller than a page flows and splits between its blocks.
 *
 * @param {{height: number, gapBefore: number, keepWithNext?: boolean, startsUnits?: string[],
 *   unitOf?: string[]}[]} blocks
 * @param {number} pageHeight
 */
export function paginate(blocks, pageHeight) {
  const unitHeights = new Map();
  for (const block of blocks) {
    for (const unit of block.unitOf ?? []) {
      const sum = unitHeights.get(unit);
      unitHeights.set(unit, sum === undefined ? block.height : sum + block.gapBefore + block.height);
    }
  }

  // Whether the chain that starts at `index` should start on a fresh page rather than at `y`
  const breakBefore = (index, y) => {
    const start = y + blocks[index].gapBefore;
    let top = start;
    for (let j = index; ; j += 1) {
      const block = blocks[j];
      if (j > index) top += block.gapBefore;
      const offset = top - start; // where the block would sit on a fresh page
      for (const unit of block.startsUnits ?? []) {
        const height = unitHeights.get(unit);
        if (offset + height <= pageHeight && top + height > pageHeight) return true;
      }
      top += block.height;
      if (top > pageHeight) return true;
      if (!block.keepWithNext || j + 1 >= blocks.length) return false;
    }
  };

  const pages = [];
  let page = [];
  let y = 0;
  blocks.forEach((block, index) => {
    const chained = index > 0 && blocks[index - 1].keepWithNext;
    const overflow = y + block.gapBefore + block.height > pageHeight;
    if (y > 0 && (chained ? overflow : breakBefore(index, y))) {
      pages.push(page);
      page = [];
      y = 0;
    }
    const top = y === 0 ? 0 : y + block.gapBefore;
    page.push({ index, y: top });
    y = top + block.height;
  });
  if (page.length > 0) pages.push(page);
  return pages;
}
