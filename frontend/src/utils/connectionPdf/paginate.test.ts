import { describe, expect, it } from 'vitest';

import { cutToFit, paginate, placeLabelOf } from './paginate';
import type { Block, Page, PagePlace, PlaceLabelTexts } from './types';

const PAGE_HEIGHT = 100;

const NOWHERE: PagePlace = { section: null, variant: null, opens: null };

type BlockOptions = Partial<
  Pick<Block, 'gapBefore' | 'keepWithNext' | 'startsUnits' | 'unitOf' | 'place'>
>;

/** A block of made-up height; what it draws doesn't matter to the paginator */
function block(height: number, options: BlockOptions = {}): Block {
  return {
    height,
    gapBefore: 0,
    keepWithNext: false,
    startsUnits: [],
    unitOf: [],
    place: NOWHERE,
    bookmark: null,
    content: { kind: 'placeholder', key: 'block', within: [], text: '', depth: 0 },
    ...options,
  };
}

/** A heading: chained to what follows it */
function heading(height: number, options: BlockOptions = {}): Block {
  return block(height, { keepWithNext: true, ...options });
}

/** A unit's opening block, chained or not, and a member of it */
function opener(height: number, unit: string, options: BlockOptions = {}): Block {
  return block(height, { startsUnits: [unit], unitOf: [unit], ...options });
}

function member(height: number, units: string[], options: BlockOptions = {}): Block {
  return block(height, { unitOf: units, ...options });
}

function indexesOf(pages: Page[]): number[][] {
  return pages.map((page) => page.map(({ index }) => index));
}

/** Whether some page but the last ends with a chained block (a heading left behind, FR-024) */
function leavesAChainBehind(blocks: Block[], pages: Page[]): boolean {
  return pages.slice(0, -1).some((page) => blocks[page[page.length - 1].index].keepWithNext);
}

describe('paginate', () => {
  it('places every block whole, once and in order, below the one before it', () => {
    const heights = [30, 45, 20, 60, 10, 80, 25, 100, 5];
    const blocks = heights.map((height, index) =>
      block(height, { gapBefore: 5, keepWithNext: index % 3 === 1 })
    );
    const pages = paginate(blocks, PAGE_HEIGHT);

    expect(pages.flat().map(({ index }) => index)).toEqual(heights.map((_, index) => index));
    for (const page of pages) {
      page.forEach(({ index, y }, position) => {
        expect(y + blocks[index].height).toBeLessThanOrEqual(PAGE_HEIGHT);
        if (position > 0) {
          const before = page[position - 1];
          expect(y).toBe(before.y + blocks[before.index].height + blocks[index].gapBefore);
        }
      });
    }
  });

  it('counts the pages before anything is drawn', () => {
    const blocks = [40, 40, 40, 40, 40].map((height) => block(height));

    expect(indexesOf(paginate(blocks, PAGE_HEIGHT))).toEqual([[0, 1], [2, 3], [4]]);
    expect(paginate([], PAGE_HEIGHT)).toEqual([]);
    expect(paginate([block(100), block(100)], PAGE_HEIGHT)).toHaveLength(2);
  });

  it('keeps the gap before a block inside a page and drops it at the top of one', () => {
    const blocks = [
      block(50, { gapBefore: 12 }),
      block(20, { gapBefore: 10 }),
      block(40, { gapBefore: 10 }),
    ];

    expect(paginate(blocks, PAGE_HEIGHT)).toEqual([
      [
        { index: 0, y: 0 },
        { index: 1, y: 60 },
      ],
      [{ index: 2, y: 0 }],
    ]);
    // The gap counts when deciding: 80 + 15 + 10 runs past the page, 80 + 10 wouldn't
    expect(indexesOf(paginate([block(80), block(10, { gapBefore: 15 })], PAGE_HEIGHT))).toEqual([
      [0],
      [1],
    ]);
  });

  it('moves a chain whole when its last block does not fit', () => {
    // A heading, an AND/OR connector and a rule: the rule would run past the page
    const blocks = [block(50), heading(10), heading(10), block(40)];
    const pages = paginate(blocks, PAGE_HEIGHT);

    expect(indexesOf(pages)).toEqual([[0], [1, 2, 3]]);
    expect(pages[1][0].y).toBe(0);
  });

  it('breaks inside a chain only where a block runs past even a fresh page', () => {
    // The chain moves first; on the fresh page the 95-point block still overflows below the
    // heading, so the chain breaks there and nowhere else
    const blocks = [block(30), heading(10), block(95), block(5)];

    expect(indexesOf(paginate(blocks, PAGE_HEIGHT))).toEqual([[0], [1], [2, 3]]);
  });

  it('moves a unit that fits a fresh page but not the rest of this one', () => {
    const blocks = [block(50), opener(20, 'v'), member(20, ['v']), member(20, ['v'])];

    expect(indexesOf(paginate(blocks, PAGE_HEIGHT))).toEqual([[0], [1, 2, 3]]);
    // A unit that fits the rest of the page stays
    expect(indexesOf(paginate(blocks.slice(1), PAGE_HEIGHT))).toEqual([[0, 1, 2]]);
  });

  it("counts the gaps between a unit's blocks in its height, but not the first one's", () => {
    // 20 + 5 + 20 + 5 + 20 = 70 from 35: past the page, so the unit moves (60 would have fit)
    const blocks = [
      block(30),
      opener(20, 'g', { gapBefore: 5 }),
      member(20, ['g'], { gapBefore: 5 }),
      member(20, ['g'], { gapBefore: 5 }),
    ];

    expect(indexesOf(paginate(blocks, PAGE_HEIGHT))).toEqual([[0], [1, 2, 3]]);
  });

  it('lets a unit taller than a page flow, splitting it between its blocks', () => {
    const members = [30, 30, 30, 30, 30].map((height) => member(height, ['v']));
    const blocks = [block(50), opener(20, 'v'), ...members];

    expect(indexesOf(paginate(blocks, PAGE_HEIGHT))).toEqual([[0, 1, 2], [3, 4, 5], [6]]);
  });

  it('the pinned bug: a variant moved to the next page takes the section heading chained to it along', () => {
    const section = { section: 3, variant: null, opens: 'section' } as const;

    // The variant (10 + 20 + 20 = 50) fits a fresh page with the heading leading into it, but
    // not the rest of this one: the heading, which opens no unit itself, moves with it. Checking
    // only the heading's own units leaves both on page 1 and splits the variant
    const fits = [
      block(60),
      heading(10, { place: section }),
      opener(10, 'taxi', { keepWithNext: true }),
      member(20, ['taxi']),
      member(20, ['taxi']),
    ];
    const fitsPages = paginate(fits, PAGE_HEIGHT);
    expect(indexesOf(fitsPages)).toEqual([[0], [1, 2, 3, 4]]);
    expect(leavesAChainBehind(fits, fitsPages)).toBe(false);

    // The variant (10 + 4 × 20 = 90) fits a fresh page alone, but not with the 20-point heading
    // leading into it: it flows, below its heading. A block inside the chain that broke without
    // an overflow would move the variant and leave the heading at the bottom of page 1
    const flows = [
      block(40),
      heading(20, { place: section }),
      opener(10, 'taxi', { keepWithNext: true }),
      ...[20, 20, 20, 20].map((height) => member(height, ['taxi'])),
    ];
    const flowsPages = paginate(flows, PAGE_HEIGHT);
    expect(indexesOf(flowsPages)).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6],
    ]);
    expect(leavesAChainBehind(flows, flowsPages)).toBe(false);
  });

  it('checks a unit that a later block of the chain opens: a sub-group inside a group', () => {
    // The group (140) is taller than a page and flows; the sub-group (10 + 3 × 20 = 70), opened
    // by the second header of the chain, fits a fresh page below the group's header: both move
    const blocks = [
      block(50),
      opener(10, 'g1', { keepWithNext: true }),
      opener(10, 'g2', { keepWithNext: true, unitOf: ['g1', 'g2'] }),
      ...[20, 20, 20].map((height) => member(height, ['g1', 'g2'])),
      ...[20, 20, 20].map((height) => member(height, ['g1'])),
    ];

    expect(indexesOf(paginate(blocks, PAGE_HEIGHT))).toEqual([[0], [1, 2, 3, 4, 5, 6], [7, 8]]);
  });
});

describe('placeLabelOf', () => {
  const english: PlaceLabelTexts = {
    sections: {
      1: 'Links for your service',
      2: 'Documents and data items',
      3: 'Rules per variant',
    },
    variant: (name) => `Variant ${name}`,
    continued: '(continued)',
  };

  /** The label of a page whose first block has this place (block 0 is page 1's title) */
  function labelOf(place: PagePlace, texts: PlaceLabelTexts = english): string | null {
    const blocks = [block(10), block(10, { place })];
    return placeLabelOf([{ index: 1, y: 0 }], blocks, texts);
  }

  it('says nothing on page 1, on an empty page or on a page that starts outside the sections', () => {
    const blocks = [block(10, { place: { section: 1, variant: null, opens: 'section' } })];

    expect(placeLabelOf([{ index: 0, y: 0 }], blocks, english)).toBeNull();
    expect(placeLabelOf([], blocks, english)).toBeNull();
    expect(labelOf(NOWHERE)).toBeNull();
  });

  it('names the section, with "(continued)" unless the page opens it', () => {
    expect(labelOf({ section: 2, variant: null, opens: 'section' })).toBe(
      '2 Documents and data items'
    );
    expect(labelOf({ section: 2, variant: null, opens: null })).toBe(
      '2 Documents and data items (continued)'
    );
    expect(labelOf({ section: 1, variant: null, opens: null })).toBe(
      '1 Links for your service (continued)'
    );
    expect(labelOf({ section: 3, variant: null, opens: 'section' })).toBe('3 Rules per variant');
  });

  it('names the variant in section 3, with "(continued)" unless the page opens it', () => {
    expect(labelOf({ section: 3, variant: 'Taxi', opens: 'variant' })).toBe(
      '3 Rules per variant › Variant Taxi'
    );
    expect(labelOf({ section: 3, variant: 'Taxi', opens: null })).toBe(
      '3 Rules per variant › Variant Taxi (continued)'
    );
  });

  it('builds the label from the texts it is given', () => {
    const german: PlaceLabelTexts = {
      sections: { 1: 'Links für Ihren Dienst', 2: 'Dokumente und Felder', 3: 'Regeln je Variante' },
      variant: (name) => `Variante ${name}`,
      continued: '(Fortsetzung)',
    };

    expect(labelOf({ section: 3, variant: 'Taxi', opens: null }, german)).toBe(
      '3 Regeln je Variante › Variante Taxi (Fortsetzung)'
    );
    expect(labelOf({ section: 2, variant: null, opens: null }, german)).toBe(
      '2 Dokumente und Felder (Fortsetzung)'
    );
  });

  describe('with the drawing’s test of one line (T050)', () => {
    /** FR-045's longest variant name: 100 characters */
    const LONG_NAME = 'Variant 1 for applicants from a district of the city and the documents '
      .repeat(2)
      .slice(0, 100);
    /** A made-up width: one unit per code point */
    const within =
      (room: number) =>
      (label: string): boolean =>
        Array.from(label).length <= room;

    function fittedLabelOf(
      place: PagePlace,
      room: number,
      texts: PlaceLabelTexts = english
    ): string | null {
      const blocks = [block(10), block(10, { place })];
      return placeLabelOf([{ index: 1, y: 0 }], blocks, texts, within(room));
    }

    it('keeps "(continued)" and the section whole and cuts only the long variant name with "…"', () => {
      const label = fittedLabelOf({ section: 3, variant: LONG_NAME, opens: null }, 80);
      const head = '3 Rules per variant › Variant ';
      const tail = '… (continued)';

      expect(LONG_NAME).toHaveLength(100);
      expect(label).not.toBeNull();
      expect(label!.startsWith(head)).toBe(true);
      expect(label!.endsWith(tail)).toBe(true);
      expect(Array.from(label!).length).toBeLessThanOrEqual(80);
      // As much of the name as fits: one more character would not
      const kept = label!.slice(head.length, -tail.length);
      expect(kept.length).toBeGreaterThan(0);
      expect(LONG_NAME.startsWith(kept)).toBe(true);
      expect(Array.from(`${head}${LONG_NAME.slice(0, kept.length + 1)}${tail}`).length).toBe(81);
    });

    it('does the same in German', () => {
      const german: PlaceLabelTexts = {
        sections: {
          1: 'Links für Ihren Dienst',
          2: 'Dokumente und Felder',
          3: 'Regeln je Variante',
        },
        variant: (name) => `Variante ${name}`,
        continued: '(Fortsetzung)',
      };
      const label = fittedLabelOf({ section: 3, variant: LONG_NAME, opens: null }, 80, german);

      expect(label!.startsWith('3 Regeln je Variante › Variante Variant 1')).toBe(true);
      expect(label!.endsWith('… (Fortsetzung)')).toBe(true);
      expect(Array.from(label!).length).toBeLessThanOrEqual(80);
    });

    it('cuts a variant’s opening label at the name too, and leaves a label that fits whole', () => {
      expect(fittedLabelOf({ section: 3, variant: LONG_NAME, opens: 'variant' }, 60)).toBe(
        `3 Rules per variant › Variant ${LONG_NAME.slice(0, 29).trimEnd()}…`
      );
      expect(fittedLabelOf({ section: 3, variant: 'Taxi', opens: null }, 80)).toBe(
        '3 Rules per variant › Variant Taxi (continued)'
      );
      expect(fittedLabelOf({ section: 2, variant: null, opens: null }, 10)).toBe(
        '2 Documents and data items (continued)'
      );
    });

    it('keeps "…" alone for the name when no part of it fits', () => {
      expect(fittedLabelOf({ section: 3, variant: LONG_NAME, opens: null }, 20)).toBe(
        '3 Rules per variant › Variant … (continued)'
      );
    });
  });
});

describe('cutToFit', () => {
  const within =
    (room: number) =>
    (text: string): boolean =>
      Array.from(text).length <= room;

  it('keeps the longest start that fits with "…", trailing spaces dropped', () => {
    expect(cutToFit('Hire car licence', within(10))).toBe('Hire car…');
    expect(cutToFit('Hire car licence', within(6))).toBe('Hire…');
  });

  it('counts code points, so that a surrogate pair is never split', () => {
    expect(cutToFit('ab😀cd', within(4))).toBe('ab😀…');
  });

  it('gives "…" alone when nothing fits', () => {
    expect(cutToFit('Taxi', within(0))).toBe('…');
  });
});
