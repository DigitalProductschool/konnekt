import { createContext } from 'react';

import type { LanguageContextValue } from './types';

// The language context: `LanguageProvider` provides it, `useLanguage()` and `useCopy()` read it.
// It lives here, not in `index.tsx`, so that the provider's module exports only its component
export const LanguageContext = createContext<LanguageContextValue | null>(null);
