// The PDF's geometry and colours (contracts/pdf-document.md section 1; design-notes 4; FR-039,
// FR-043) and the texts with arguments (section 5). Node only
import { describe, expect, it } from 'vitest';

import { PDF_COLOURS, PDF_LAYOUT, PDF_STYLES, PDF_TEXTS, PDF_WATCHDOG_MS } from './constants';

type ColourName = Exclude<keyof typeof PDF_COLOURS, 'watermarkOpacity'>;

/** A colour's relative luminance (WCAG 2.2) */
function luminanceOf(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** The WCAG contrast ratio of two colours */
function contrastOf(first: string, second: string): number {
  const [lighter, darker] = [luminanceOf(first), luminanceOf(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Every text colour on every background it sits on (design-notes 4): the page, the band and the
 * details box (published and draft), the pills, the chips, the marked, removed and neutral cards,
 * the gaps box, the step circle and the band's draft pill
 */
const TEXT_ON_BACKGROUND: [ColourName, ColourName][] = [
  ['text', 'white'],
  ['text', 'bandBackground'],
  ['text', 'draftBackground'],
  ['text', 'markBackground'],
  ['text', 'neutralBackground'],
  ['text', 'warningBackground'],
  ['muted', 'white'],
  ['muted', 'bandBackground'],
  ['muted', 'draftBackground'],
  ['muted', 'markBackground'],
  ['muted', 'neutralBackground'],
  ['accent', 'white'],
  ['accent', 'accentTint'],
  ['accent', 'bandBackground'],
  ['accent', 'markBackground'],
  ['accent', 'neutralBackground'],
  ['success', 'successBackground'],
  ['deactivated', 'deactivatedBackground'],
  ['draft', 'white'],
  ['draft', 'draftBackground'],
  ['mark', 'white'],
  ['mark', 'markBackground'],
  ['removed', 'neutralBackground'],
  ['warning', 'white'],
  ['warning', 'warningBackground'],
  ['white', 'draft'],
  ['white', 'accent'],
  ['white', 'warning'],
];

describe('PDF_LAYOUT', () => {
  it('is A4 with a body of 481.9 × 705.89 pt (FR-043)', () => {
    expect(PDF_LAYOUT.page).toEqual({ width: 595.28, height: 841.89 });
    expect(PDF_LAYOUT.body.width.toFixed(2)).toBe('481.90');
    expect(PDF_LAYOUT.body.height.toFixed(2)).toBe('705.89');
    expect(PDF_LAYOUT.body.x).toBe(56.69);
    expect(PDF_LAYOUT.body.y).toBe(84);
  });

  it('puts the band at y 24, 38 high, and the bottom rule at 841.89 − 52 + 18', () => {
    expect(PDF_LAYOUT.band.y).toBe(24);
    expect(PDF_LAYOUT.band.height).toBe(38);
    expect(PDF_LAYOUT.bottom.ruleY.toFixed(2)).toBe('807.89');
    expect(PDF_LAYOUT.bottom.textGap).toBe(8);
  });
});

describe('PDF_COLOURS and PDF_STYLES (FR-039)', () => {
  it.each(TEXT_ON_BACKGROUND)('%s on %s is at least 4.5:1', (text, background) => {
    expect(contrastOf(PDF_COLOURS[text], PDF_COLOURS[background])).toBeGreaterThanOrEqual(4.5);
  });

  it('checks the colour of every style but the watermark’s', () => {
    const checked = new Set(TEXT_ON_BACKGROUND.map(([text]) => PDF_COLOURS[text]));
    for (const [role, style] of Object.entries(PDF_STYLES)) {
      if (role !== 'watermark') {
        expect(checked.has(style.colour), role).toBe(true);
      }
    }
  });

  it('writes every colour as upper-case hex, and the watermark at 6 %', () => {
    for (const [name, value] of Object.entries(PDF_COLOURS)) {
      if (name !== 'watermarkOpacity') {
        expect(value, name).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
    expect(PDF_COLOURS.watermarkOpacity).toBe(0.06);
  });

  it('computes the ratio as WCAG does', () => {
    expect(contrastOf('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastOf('#FFFFFF', '#FFFFFF')).toBe(1);
  });
});

describe('PDF_WATCHDOG_MS', () => {
  it('is two minutes (R13)', () => {
    expect(PDF_WATCHDOG_MS).toBe(120_000);
  });
});

describe('PDF_TEXTS', () => {
  it('joins the variants to create with "and" / "und"', () => {
    const names = ['Standard', 'Taxi', 'Hire car'];
    expect(PDF_TEXTS.en.linksToCreate(names)).toBe(
      'There will be one request link for all variants, and a result link for each variant: Standard, Taxi and Hire car.'
    );
    expect(PDF_TEXTS.de.linksToCreate(names)).toBe(
      'Es wird einen Anfragelink für alle Varianten geben und einen Ergebnislink für jede Variante: Standard, Taxi und Hire car.'
    );
    expect(PDF_TEXTS.en.linksToCreate(['Standard', 'Taxi'])).toContain('Standard and Taxi.');
  });

  it('words a single variant in the singular', () => {
    expect(PDF_TEXTS.en.linksToCreate(['Standard'])).toBe(
      'There will be one request link and one result link for the variant Standard.'
    );
    expect(PDF_TEXTS.de.linksToCreate(['Standard'])).toBe(
      'Es wird einen Anfragelink und einen Ergebnislink für die Variante Standard geben.'
    );
  });

  it('builds the texts with arguments in both languages', () => {
    expect(PDF_TEXTS.en.lastSavedValue('09.11.2026, 16:45', 7)).toBe(
      '09.11.2026, 16:45 (draft save 7)'
    );
    expect(PDF_TEXTS.de.lastSavedValue('09.11.2026, 16:45', 7)).toBe(
      '09.11.2026, 16:45 (7. Speicherung)'
    );
    expect(PDF_TEXTS.en.page(2, 5)).toBe('Page 2 of 5');
    expect(PDF_TEXTS.de.page(2, 5)).toBe('Seite 2 von 5');
    expect(PDF_TEXTS.en.titleDraft('Taxi licence')).toBe(
      'Draft – Taxi licence – Connection details'
    );
    expect(PDF_TEXTS.de.title('Taxi licence')).toBe('Taxi licence – Details der Anbindung');
    expect(PDF_TEXTS.de.scheduledLinks('01.12.2026')).toContain('bis sie am 01.12.2026 startet.');
    expect(PDF_TEXTS.de.gapsTitle(3)).toBe('Vor dem Veröffentlichen zu erledigen (3)');
  });
});
