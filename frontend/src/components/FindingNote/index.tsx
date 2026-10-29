import { FINDING_LOOKS } from './constants';
import type { FindingNoteProps } from './types';

/**
 * The note under a rule or a group's header that has a finding (S2; FR-012, FR-019; Figma U01
 * 6171:7010, 6171:7024, U04 6178:8216), in the layout of spec 002's `Rules/Problem note`
 * (6110:3657): a conflict in KERN's warning colour and triangle, a redundant or always-met item in
 * KERN's info colour and icon (F4). The text starts with its kind (F5), so the icon is hidden from
 * assistive technologies.
 */
export default function FindingNote({ id, kind, text }: FindingNoteProps) {
  const look = FINDING_LOOKS[kind];
  return (
    <p
      id={id}
      className={`text-kern-static-small ${look.text} flex items-center gap-8 pb-8 pl-24 leading-(--kern-typography-line-height-medium-static) font-semibold`}
    >
      <span aria-hidden="true" className={`kern-icon ${look.icon} kern-icon--small shrink-0`} />
      {text}
    </p>
  );
}
