import { testDayLineOf } from '@connection-portal/rules/personas/messages';

import type { TestDayLineProps } from './types';

/**
 * The test-day line (S8.1; FR-016, W1; spec 008 C6): "Tested as if shared today, 01.11.2026.",
 * the first line of the step's content, directly under the intro. The frames draw no test-day
 * line (U65 Missing: FR-024e), so it reads as the intro does (`PageTitle`'s hint: body/small,
 * muted). The step shows it while results are shown, also while one persona is generated anew
 * (F45)
 */
export default function TestDayLine({ today }: TestDayLineProps) {
  return (
    <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
      {testDayLineOf(today)}
    </p>
  );
}
