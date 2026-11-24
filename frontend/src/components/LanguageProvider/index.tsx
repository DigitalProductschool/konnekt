import { KernContextProvider } from '@kern-ux-annex/kern-react-kit';
import type { Language } from '@konnekt/rules/language';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { setRequestLanguage } from '../../api/client';
import { KERN_TRANSLATIONS } from '../../constants';
import { LANGUAGE_STORAGE_KEY } from '../../utils/language/constants';
import { languageFromStorageEvent, resolveLanguage } from '../../utils/language/resolveLanguage';
import { LanguageContext } from './constants';
import type { LanguageProviderProps } from './types';

/** The browser's preferred language, `navigator.language`; null where the browser gives none */
function readBrowserLanguage(): string | null {
  try {
    return navigator.language || null;
  } catch {
    return null;
  }
}

/** The stored choice; null when none is stored or the storage is blocked (private windows) */
function readStoredLanguage(): string | null {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Keeps the choice for the next visits; a full or blocked storage keeps it for this visit only */
function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Quota exceeded or blocked: the choice lasts until the page is closed
  }
}

/**
 * The language of the first render: the stored choice, else the browser's language. The API
 * client takes it at once, so the first requests already carry it. Running it twice (React's
 * StrictMode does in development) gives the same language and the same client state
 */
function initialLanguage(browserLanguage: string | null): Language {
  const language = resolveLanguage(readStoredLanguage(), browserLanguage);
  setRequestLanguage(language);
  return language;
}

/**
 * Holds the website's language (spec 009, research R7, data-model "Language choice"): read
 * before the first render from the browser's stored choice or, on a first visit, its language,
 * so that no screen shows another language first. Choosing a language stores it, and a choice
 * made in another tab is followed. `<html lang>` and the API client's `Accept-Language` follow
 * every change; the kit's own texts too, through the `KernContextProvider` inside.
 *
 * Besides `useLocalDraftStore` and `useRememberedHomepage`, this is the only code that touches
 * `window.localStorage`: one key, `konnekt:language:v1`. It also is the only code that
 * reads `navigator.language`. Nothing here logs.
 */
export default function LanguageProvider({ children }: LanguageProviderProps) {
  // Read once per visit; a cleared storage in another tab falls back to it
  const [browserLanguage] = useState(readBrowserLanguage);
  const [language, setLanguageState] = useState(() => initialLanguage(browserLanguage));

  const setLanguage = useCallback(
    (next: Language) => {
      if (next === language) return;
      setLanguageState(next);
      storeLanguage(next);
    },
    [language]
  );

  // Another tab's choice; the other tab has already stored it
  useEffect(() => {
    function followOtherTab(event: StorageEvent) {
      const next = languageFromStorageEvent(event.key, event.newValue, browserLanguage);
      if (next !== null) setLanguageState(next);
    }
    window.addEventListener('storage', followOtherTab);
    return () => window.removeEventListener('storage', followOtherTab);
  }, [browserLanguage]);

  // Before paint, so that assistive technology and the next requests never lag behind the screen
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    setRequestLanguage(language);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      <KernContextProvider translations={KERN_TRANSLATIONS[language]}>
        {children}
      </KernContextProvider>
    </LanguageContext.Provider>
  );
}
