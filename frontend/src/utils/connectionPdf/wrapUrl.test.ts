import { describe, expect, it } from 'vitest';

import { urlLines } from './wrapUrl';

/** A mono font's width: every character 1 unit wide */
const mono = (text: string): number => Array.from(text).length;

const REQUEST =
  'https://wallet.stuttgart.de/api/connect/3f2a9c1e-5b7d-4e8a-a716-446655440000/request';

describe('urlLines (R11, FR-011)', () => {
  it('keeps a URL that fits on one line', () => {
    expect(urlLines(REQUEST, 200, mono)).toEqual([REQUEST]);
  });

  it("never breaks at a UUID's hyphens", () => {
    const lines = urlLines(REQUEST, 50, mono);
    expect(lines).toEqual([
      'https://wallet.stuttgart.de/api/connect/',
      '3f2a9c1e-5b7d-4e8a-a716-446655440000/request',
    ]);
    for (const line of lines.slice(0, -1)) expect(line.endsWith('/')).toBe(true);
  });

  it('breaks a long path only after a "/", filling each line', () => {
    const url = 'https://example.org/alpha/beta/gamma/delta/epsilon/zeta/eta/theta';
    const lines = urlLines(url, 20, mono);
    expect(lines).toEqual([
      'https://example.org/',
      'alpha/beta/gamma/',
      'delta/epsilon/zeta/',
      'eta/theta',
    ]);
    for (const line of lines) expect(mono(line)).toBeLessThanOrEqual(20);
  });

  it("breaks a segment wider than the line on its own at the line's end", () => {
    const url = 'https://a.de/0123456789abcdefghijklmnop/x/';
    const lines = urlLines(url, 10, mono);
    expect(lines).toEqual(['https://', 'a.de/', '0123456789', 'abcdefghij', 'klmnop/x/']);
    for (const line of lines) expect(mono(line)).toBeLessThanOrEqual(10);
  });

  it('puts at least one character on a line narrower than a character', () => {
    expect(urlLines('ab/c', 0.5, mono)).toEqual(['a', 'b', '/', 'c']);
  });

  it('gives the URL back when the lines are joined', () => {
    const urls = [
      REQUEST,
      'https://example.org/alpha/beta/gamma/delta/epsilon/zeta/eta/theta',
      'https://a.de/0123456789abcdefghijklmnop/x/',
      'https://a.de//double//slashes/',
      '/leading/slash',
      'no-slash-at-all-but-very-long-indeed',
      '',
    ];
    for (const url of urls) {
      for (const width of [1, 7, 13, 40, 500]) {
        expect(urlLines(url, width, mono).join('')).toBe(url);
      }
    }
  });

  it('uses the given measure, not the character count', () => {
    const wide = (text: string): number => text.length * 2;
    expect(urlLines('https://a.de/b', 20, wide)).toEqual(['https://', 'a.de/b']);
    expect(urlLines('https://a.de/b', 20, mono)).toEqual(['https://a.de/b']);
  });
});
