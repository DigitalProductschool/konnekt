import { testDayLineOf } from '@connection-portal/rules/personas/messages';

import type { TestDayLineProps } from './types';

/**
 * The test-day line (S8.1; FR-016, W1): "Tested as if shared today, 1 Nov 2026.", the first line
 * of the step's content, directly under the intro. Figma has no frame for it, so it reads as the
 * intro does (`PageTitle`'s hint). The step shows it only while results are shown
 */
export default function TestDayLine({ today }: TestDayLineProps) {
  return (
    <p className="text-kern-static-medium text-kern-layout-text-muted break-words">
      {testDayLineOf(today)}
    </p>
  );
}
