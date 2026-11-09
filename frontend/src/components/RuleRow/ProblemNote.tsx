import { SMALL_TEXT } from './constants';
import type { ProblemNoteProps } from './types';

/**
 * Figma "Rules/Problem note" level=blocking (6110:3657): a spec 002 problem under a flagged rule
 * or group, the 20px info icon and `label/small` in `feedback-danger`, 8px apart, 24px in and 8px
 * above the outline's bottom (U44 6171:7489).
 */
export default function ProblemNote({ id, message }: ProblemNoteProps) {
  return (
    <p
      id={id}
      className={`${SMALL_TEXT} text-kern-feedback-danger flex items-center gap-8 pb-8 pl-24 font-semibold`}
    >
      <span
        aria-hidden="true"
        className="kern-icon kern-icon--info kern-icon--small bg-kern-feedback-danger! shrink-0"
      />
      {message}
    </p>
  );
}
