import { describe, expect, it } from 'vitest';

import { INITIAL_COPY_STATE } from './constants';
import { copyReducer, copyTextsOf, isCut } from './utils';

describe('copyReducer', () => {
  it('reads "Copied" after copying and counts each attempt', () => {
    const copied = copyReducer(INITIAL_COPY_STATE, { type: 'copied' });
    expect(copied).toEqual({ status: 'copied', attempt: 1 });
    expect(copyReducer(copied, { type: 'copied' })).toEqual({ status: 'copied', attempt: 2 });
  });

  it('records a failure and goes back to idle on reset, keeping the count', () => {
    const failed = copyReducer(INITIAL_COPY_STATE, { type: 'failed' });
    expect(failed).toEqual({ status: 'failed', attempt: 1 });
    expect(copyReducer(failed, { type: 'reset' })).toEqual({ status: 'idle', attempt: 1 });
  });
});

describe('isCut', () => {
  it('is true only when the text is wider than its box', () => {
    expect(isCut({ scrollWidth: 700, clientWidth: 571 })).toBe(true);
    expect(isCut({ scrollWidth: 571, clientWidth: 571 })).toBe(false);
    expect(isCut({ scrollWidth: 300, clientWidth: 571 })).toBe(false);
  });
});

describe('copyTextsOf', () => {
  it('gives the link\'s texts in English, "Copied" after copying', () => {
    expect(copyTextsOf('link', 'en')).toEqual({
      copy: 'Copy link',
      copied: 'Copied',
      announced: 'Link copied',
      failed: 'Copying didn’t work. The link is selected, so you can copy it yourself.',
    });
  });

  it('gives the link\'s texts in German, "Kopiert" after copying', () => {
    const texts = copyTextsOf('link', 'de');
    expect(texts.copy).toBe('Link kopieren');
    expect(texts.copied).toBe('Kopiert');
    expect(texts.announced).toBe('Link kopiert');
    expect(texts.failed).toBe(
      'Das Kopieren hat nicht funktioniert. Der Link ist markiert, sodass Sie ihn selbst kopieren können.'
    );
  });

  it('keeps the texts a caller replaces and fills the rest in the language', () => {
    expect(copyTextsOf('field', 'en', { announced: 'Token copied' })).toEqual({
      copy: 'Copy',
      copied: 'Copied',
      announced: 'Token copied',
      failed: 'Copying didn’t work. The text is selected, so you can copy it yourself.',
    });
    expect(copyTextsOf('field', 'de', { announced: 'Token kopiert' }).copy).toBe('Kopieren');
  });
});
