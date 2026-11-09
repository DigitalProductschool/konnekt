// The pure part of the language choice (spec 009, R7, FR-008, FR-009; data-model "Language
// choice"): which language a screen renders in, from what the browser stored and the browser's
// own language. No browser API here: `LanguageProvider` reads `localStorage` and
// `navigator.language` and passes the values in

import { isLanguage, type Language } from '@connection-portal/rules/language';

import { GERMAN_PRIMARY_SUBTAG, LANGUAGE_STORAGE_KEY } from './constants';

/** The browser language's primary subtag, lower-cased: `de` for `de-AT`, `de_CH` or `DE`. */
function primarySubtagOf(browserLanguage: string): string {
  return browserLanguage.split(/[-_]/, 1)[0].trim().toLowerCase();
}

/**
 * The language to render in: a stored `'en'` / `'de'` wins (the browser chose it); any other
 * stored value counts as no choice. Without a choice, German when the browser's language is
 * German in any region (`de`, `de-AT`, `de-CH`, `de-LI` …), else English; a missing or empty
 * browser language is English.
 */
export function resolveLanguage(stored: string | null, browserLanguage: string | null): Language {
  if (isLanguage(stored)) {
    return stored;
  }
  if (browserLanguage && primarySubtagOf(browserLanguage) === GERMAN_PRIMARY_SUBTAG) {
    return 'de';
  }
  return 'en';
}

/**
 * The language after another tab's `storage` event (V6): `null` when the event is about another
 * key (nothing to follow); a cleared storage (`key === null`) and a value that is not a language
 * resolve as no choice, by the browser's language.
 */
export function languageFromStorageEvent(
  key: string | null,
  newValue: string | null,
  browserLanguage: string | null
): Language | null {
  if (key === null) {
    return resolveLanguage(null, browserLanguage);
  }
  if (key !== LANGUAGE_STORAGE_KEY) {
    return null;
  }
  return resolveLanguage(newValue, browserLanguage);
}
