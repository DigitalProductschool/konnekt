import type { ProblemNoteProps } from './types';

/** Figma "Rules/Problem note" (blocking, 6110:3657): the problem under a flagged rule. */
export default function ProblemNote({ id, message }: ProblemNoteProps) {
  return (
    <p
      id={id}
      className="text-kern-static-small text-kern-feedback-danger flex items-center gap-8 pb-8 pl-24 leading-(--kern-typography-line-height-medium-static) font-semibold"
    >
      <span
        aria-hidden="true"
        className="kern-icon kern-icon--info kern-icon--small bg-kern-feedback-danger! shrink-0"
      />
      {message}
    </p>
  );
}
