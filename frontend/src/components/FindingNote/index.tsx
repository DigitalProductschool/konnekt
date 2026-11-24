import { kindTextOf } from '@konnekt/rules/checks/findingMessages';

import { useLanguage } from '../../hooks/useLanguage';
import { FINDING_LOOKS } from './constants';
import type { FindingNoteProps } from './types';

/**
 * Figma "Rules/Problem note" at the levels `conflicting` and `redundant` (6177:7837; U44
 * 6171:7489, 6750:41109; U45 6753:40823, 6171:7509): the note under a rule or a group's header
 * that has a finding of spec 003 (FR-012, FR-019). The 20px kind icon, 4px, then the text in
 * `body/small` (14/24, regular) and the default text colour, 24px in and 8px above the row's or
 * group's bottom edge. Only the icon shows the kind (the warning triangle for a conflict, the info
 * icon otherwise); it is hidden from assistive technologies, and a visually hidden kind text takes
 * its place, so that the note reads "Conflicting: Can’t be met together with Rule 02." (W19). The
 * texts come from `findingMessages.ts` (W13).
 */
export default function FindingNote({ id, kind, text }: FindingNoteProps) {
  const { language } = useLanguage();
  return (
    <p
      id={id}
      className="text-kern-layout-text-default text-kern-static-small flex items-center gap-4 pb-8 pl-24 leading-(--kern-typography-line-height-medium-static) wrap-anywhere"
    >
      <span
        aria-hidden="true"
        className={`kern-icon ${FINDING_LOOKS[kind].icon} kern-icon--small shrink-0`}
      />
      <span className="sr-only">{kindTextOf(kind, language)} </span>
      {text}
    </p>
  );
}
