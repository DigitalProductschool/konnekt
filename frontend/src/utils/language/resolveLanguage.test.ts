import { describe, expect, it } from 'vitest';

import { LANGUAGE_STORAGE_KEY } from './constants';
import { languageFromStorageEvent, resolveLanguage } from './resolveLanguage';

// data-model "Language choice": `stored` wins, else the browser's language decides (FR-008)
describe('resolveLanguage', () => {
  it('keeps the stored choice, whatever the browser says', () => {
    expect(resolveLanguage('en', 'de-DE')).toBe('en');
    expect(resolveLanguage('de', 'en-US')).toBe('de');
    expect(resolveLanguage('de', null)).toBe('de');
    expect(resolveLanguage('en', null)).toBe('en');
  });

  it('chooses German for a German browser in any region', () => {
    for (const browser of ['de', 'de-DE', 'de-AT', 'de-CH', 'de-LI', 'DE', 'de_DE', 'De-at']) {
      expect(resolveLanguage(null, browser)).toBe('de');
    }
  });

  it('chooses English for any other browser language', () => {
    for (const browser of ['en', 'en-US', 'en-GB', 'fr', 'fr-CH', 'nl', 'dea', 'en-DE']) {
      expect(resolveLanguage(null, browser)).toBe('en');
    }
  });

  it('chooses English without a browser language', () => {
    expect(resolveLanguage(null, null)).toBe('en');
    expect(resolveLanguage(null, '')).toBe('en');
  });

  it('counts a stored value that is not a language as no choice', () => {
    for (const stored of ['fr', 'DE', 'EN', 'de-AT', '', ' de', 'null', '"de"']) {
      expect(resolveLanguage(stored, 'de-AT')).toBe('de');
      expect(resolveLanguage(stored, 'en-US')).toBe('en');
      expect(resolveLanguage(stored, null)).toBe('en');
    }
  });
});

// V6: another tab's choice is followed; a cleared storage or a foreign value is no choice
describe('languageFromStorageEvent', () => {
  it("follows another tab's choice", () => {
    expect(languageFromStorageEvent(LANGUAGE_STORAGE_KEY, 'de', 'en-US')).toBe('de');
    expect(languageFromStorageEvent(LANGUAGE_STORAGE_KEY, 'en', 'de-AT')).toBe('en');
  });

  it('ignores an event about another key', () => {
    expect(languageFromStorageEvent('konnekt:drafts:v1', 'de', 'en-US')).toBeNull();
    expect(languageFromStorageEvent('', 'de', 'de')).toBeNull();
  });

  it('resolves a cleared storage (key null) as no choice', () => {
    expect(languageFromStorageEvent(null, null, 'de-CH')).toBe('de');
    expect(languageFromStorageEvent(null, null, 'en-GB')).toBe('en');
    expect(languageFromStorageEvent(null, null, null)).toBe('en');
  });

  it('resolves a removed key or a value that is not a language as no choice', () => {
    expect(languageFromStorageEvent(LANGUAGE_STORAGE_KEY, null, 'de-AT')).toBe('de');
    expect(languageFromStorageEvent(LANGUAGE_STORAGE_KEY, null, 'en-US')).toBe('en');
    expect(languageFromStorageEvent(LANGUAGE_STORAGE_KEY, 'fr', 'de')).toBe('de');
    expect(languageFromStorageEvent(LANGUAGE_STORAGE_KEY, 'DE', 'en-US')).toBe('en');
  });
});
