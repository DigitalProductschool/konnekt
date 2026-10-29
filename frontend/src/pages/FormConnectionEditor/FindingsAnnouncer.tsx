import type { FindingsAnnouncerProps } from './types';

/**
 * The rule checks' status region (spec 003 S2, W1; FR-015): visually hidden and polite, it reads
 * out what the latest change did to the findings, with the sentences of one change together,
 * such as "Rule 02 conflicts with Rule 01.". The editor renders it in the wizard's overlay,
 * outside the steps, so that it stays in the page across a change of step and a new text is
 * always announced. It never takes the focus.
 */
export default function FindingsAnnouncer({ announcement }: FindingsAnnouncerProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
