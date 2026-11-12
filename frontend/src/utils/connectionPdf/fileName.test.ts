import { describe, expect, it } from 'vitest';

import { FILE_NAME_FALLBACK, FILE_NAME_MAX_CODE_POINTS, fileNameOf } from './fileName';

const VERSION = 'a1b2c3d4';

const published = (name: string): string =>
  fileNameOf({ kind: 'published', name, version: VERSION });

describe('fileNameOf (data-model section 7, FR-044)', () => {
  it('names a published connection "<name>_<version>.pdf"', () => {
    expect(published('Wohngeld Antrag')).toBe('Wohngeld Antrag_a1b2c3d4.pdf');
  });

  it('names a draft "<name>_draft_<version>.pdf"', () => {
    expect(fileNameOf({ kind: 'draft', name: 'Wohngeld', version: VERSION })).toBe(
      'Wohngeld_draft_a1b2c3d4.pdf'
    );
  });

  it('replaces each character a file name cannot hold with "-"', () => {
    for (const character of ['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
      expect(published(`a${character}b`)).toBe(`a-b_${VERSION}.pdf`);
    }
    expect(published('a/\\:*?"<>|b')).toBe(`a---------b_${VERSION}.pdf`);
  });

  it('replaces every control character with "-"', () => {
    expect(published('a\u0000b\tc\nd\u001fe\u007ff\u0085g')).toBe(`a-b-c-d-e-f-g_${VERSION}.pdf`);
  });

  it('replaces leading and trailing dots and spaces with "-", and keeps inner ones', () => {
    expect(published('.hidden')).toBe(`-hidden_${VERSION}.pdf`);
    expect(published(' . name . ')).toBe(`---name---_${VERSION}.pdf`);
    expect(published('Antrag v1.2 Stand')).toBe(`Antrag v1.2 Stand_${VERSION}.pdf`);
  });

  it('keeps 100 code points of a 200-character name and never cuts the rest', () => {
    const name = 'x'.repeat(200);
    expect(published(name)).toBe(`${'x'.repeat(100)}_${VERSION}.pdf`);
    expect(fileNameOf({ kind: 'draft', name, version: VERSION })).toBe(
      `${'x'.repeat(100)}_draft_${VERSION}.pdf`
    );
  });

  it('trims a trailing space, dot or "-" left by the cut', () => {
    const name = `${'x'.repeat(96)} .-/${'y'.repeat(50)}`;
    expect(published(name)).toBe(`${'x'.repeat(96)}_${VERSION}.pdf`);
  });

  it('counts emoji as code points and never splits one', () => {
    const name = '🙂'.repeat(150);
    const result = published(name);
    const part = result.slice(0, -`_${VERSION}.pdf`.length);
    expect(Array.from(part)).toHaveLength(FILE_NAME_MAX_CODE_POINTS);
    expect(part).toBe('🙂'.repeat(100));
    expect(published(`${'a'.repeat(99)}🙂🙂`)).toBe(`${'a'.repeat(99)}🙂_${VERSION}.pdf`);
  });

  it('reads "connection" for an empty name', () => {
    expect(published('')).toBe(`${FILE_NAME_FALLBACK}_${VERSION}.pdf`);
    expect(fileNameOf({ kind: 'draft', name: '', version: VERSION })).toBe(
      `connection_draft_${VERSION}.pdf`
    );
  });

  it('reads "connection" for a name of only replaced characters', () => {
    expect(published('/\\:*?"<>|')).toBe(`connection_${VERSION}.pdf`);
    expect(published(' . ')).toBe(`connection_${VERSION}.pdf`);
    expect(published('\u0000\u0001')).toBe(`connection_${VERSION}.pdf`);
  });
});
