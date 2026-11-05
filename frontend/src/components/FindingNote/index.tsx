import { kindTextOf } from '@connection-portal/rules/checks/findingMessages';

import { FINDING_LOOKS } from './constants';
import type { FindingNoteProps } from './types';

/**
 * The note under a rule or a group's header that has a finding (S2; A3, A5; FR-012, FR-019;
 * Figma `Rules/Problem note` 6177:7837, levels `conflicting` and `redundant`: U01 6171:7010, U02
 * 6171:7510, 6750:41000, U08 6753:41332): the 20 px kind icon, 4 px, then the text in body/small
 * regular at Figma's 14 px (KERN's primitive `--kern-font-size-14`, not KERN 2.8's 16 px
 * `small-static`; decision 2026-11-01, design-notes §7) and the default text colour, 24 px from the left and 8 px above the row's or group's
 * bottom edge. Only the icon shows the kind (KERN's warning triangle for a conflict, its info icon
 * otherwise); it is hidden from assistive technologies, and a visually hidden kind text takes its
 * place, so that the note reads "Conflicting: Can’t be met together with Rule 02." (W19)
 */
export default function FindingNote({ id, kind, text }: FindingNoteProps) {
  return (
    <p
      id={id}
      className="text-kern-layout-text-default flex items-center gap-4 pb-8 pl-24 text-(length:--kern-font-size-14) leading-(--kern-typography-line-height-medium-static) wrap-anywhere"
    >
      <span
        aria-hidden="true"
        className={`kern-icon ${FINDING_LOOKS[kind].icon} kern-icon--small shrink-0`}
      />
      <span className="sr-only">{kindTextOf(kind)} </span>
      {text}
    </p>
  );
}
