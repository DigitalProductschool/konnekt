import type { Language } from '@connection-portal/rules/language';

export interface LanguageSegmentProps {
  /** The language this button chooses */
  code: Language;
  /** Whether it is the website's current language: white, marked `aria-current` */
  current: boolean;
  /** Chooses the language; the current button does nothing */
  onChoose: (code: Language) => void;
}
