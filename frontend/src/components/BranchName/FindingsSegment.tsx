import { FINDINGS_ICONS } from './constants';
import type { FindingsSegmentProps } from './types';

/**
 * The findings segment of a variant tab's tooltip (spec 003, S4; A6, W20; design-notes.md §4;
 * Figma `Rules/Tooltip` 6139:3739, "Findings segment": U10 6758:43524, U11 6758:43967): below the
 * description, a 1 px divider in the bubble's text colour at 24 % opacity, 8 px above and below,
 * then the finding: the 20 px kind icon, 8 px, and `tabFindingsOf()`'s text, top-aligned. Without
 * a description, the finding alone. The text says what the findings are, so the icon is
 * decorative. Spans only: the bubble is phrasing content, the button's description
 */
export default function FindingsSegment({ findings, divided }: FindingsSegmentProps) {
  return (
    <span className="flex w-full flex-col gap-8">
      {divided && (
        <span
          aria-hidden="true"
          className="bg-kern-layout-text-default block h-1 w-full opacity-24"
        />
      )}
      <span className="flex w-full items-start gap-8">
        <span
          aria-hidden="true"
          className={`kern-icon ${FINDINGS_ICONS[findings.kind]} kern-icon--small shrink-0`}
        />
        <span className="min-w-0 flex-1 break-words">{findings.text}</span>
      </span>
    </span>
  );
}
