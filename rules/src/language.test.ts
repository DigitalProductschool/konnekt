import { describe, expect, it } from 'vitest';

import { DEFAULT_LANGUAGE, defineTexts, isLanguage, languageNames, LANGUAGES } from './language';

describe('isLanguage', () => {
  it.each(['en', 'de'])('accepts %s', (value) => {
    expect(isLanguage(value)).toBe(true);
  });

  it.each(['DE', 'fr', null, 1])('rejects %s', (value) => {
    expect(isLanguage(value)).toBe(false);
  });
});

describe('the languages', () => {
  it('lists English and German, English first and the default', () => {
    expect(LANGUAGES).toEqual(['en', 'de']);
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(languageNames).toEqual({ en: 'English', de: 'Deutsch' });
  });
});

describe('defineTexts', () => {
  it('returns both columns under their keys', () => {
    const english = { logOut: 'Log out', count: (n: number) => `${n} rules` };
    const german = { logOut: 'Abmelden', count: (n: number) => `${n} Regeln` };
    const texts = defineTexts(english, german);
    expect(texts.en).toBe(english);
    expect(texts.de).toBe(german);
    expect(texts.de.count(2)).toBe('2 Regeln');
  });
});
