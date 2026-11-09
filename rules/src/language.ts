// The website's two languages (research R1, FR-002): the language type, its default, the
// languages' own names and `defineTexts`, the copy table every module of the frontend and of the
// rules logic keeps its texts in. `frontend/` and `mcp/` import it as
// `@connection-portal/rules/language` (the package's `./*` export covers it)

export type Language = 'en' | 'de';

export const LANGUAGES: readonly Language[] = ['en', 'de'];

export const DEFAULT_LANGUAGE: Language = 'en';

/** Each language's name in that language, as the language toggle shows it. */
export const languageNames: Record<Language, string> = { en: 'English', de: 'Deutsch' };

/** Whether `value` is one of the website's languages, exactly as written ('DE' is not). */
export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

/**
 * A copy table: the English column and the German one under their languages. `de` is typed by
 * `en`, so a German column that lacks a key or adds one fails the type check.
 */
export const defineTexts = <T>(en: T, de: T): Record<Language, T> => ({ en, de });
