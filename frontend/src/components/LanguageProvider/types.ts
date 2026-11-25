import type { Language } from '@konnekt/rules/language';
import type { ReactNode } from 'react';

export interface LanguageProviderProps {
  children: ReactNode;
}

/** The website's language and its choice, as `useLanguage()` returns them (spec 009, R7) */
export interface LanguageContextValue {
  /** The one language every screen renders in */
  language: Language;
  /**
   * Choose a language for this browser: every screen follows at once and the choice is kept for
   * the next visits. Choosing the current language does nothing.
   */
  setLanguage: (next: Language) => void;
}
