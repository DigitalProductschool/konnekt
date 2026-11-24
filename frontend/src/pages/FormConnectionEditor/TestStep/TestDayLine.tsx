import { testDayLineOf } from '@konnekt/rules/personas/messages';

import { useLanguage } from '../../../hooks/useLanguage';
import type { TestDayLineProps } from './types';

/**
 * The test-day line (S8.1; FR-016, W1; spec 008 C6; test-results-v5 R1): "Tested as if shared
 * today, 01.11.2026", without a full stop, in the result card's head under its heading (V5
 * 7599:61800, body/small, muted). It shows with a persona's results, so not on the skeleton of a
 * persona being generated anew (frame 19) nor in frame 18 or the failure (frame 20). The date is
 * `dd.mm.yyyy` in both languages (spec 009, FR-012)
 */
export default function TestDayLine({ today }: TestDayLineProps) {
  const { language } = useLanguage();
  return (
    <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
      {testDayLineOf(today, language)}
    </p>
  );
}
