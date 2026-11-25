import type { Language } from '@konnekt/rules/language';
import { useContext } from 'react';

import { LanguageContext } from '../components/LanguageProvider/constants';
import type { LanguageContextValue } from '../components/LanguageProvider/types';

/** The website's language and the way to choose another, from the LanguageProvider above. */
export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (value === null) {
    throw new Error('useLanguage needs a LanguageProvider');
  }
  return value;
}

/** A copy table's column in the current language (spec 009, research R1). */
export function useCopy<T>(table: Record<Language, T>): T {
  const { language } = useLanguage();
  return table[language];
}
