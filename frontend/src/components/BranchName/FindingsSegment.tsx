import { SEGMENT_ICONS } from './constants';
import type { FindingsSegmentProps } from './types';

/**
 * The findings segment of a variant tab's tooltip (spec 003, S4; FR-041; Figma "Rules/Tooltip"
 * 6139:3739, "Findings segment": U46 6758:43524, U50 7375:101551): below the description, a 1px
 * divider in `layout-text-inverse` white at 24 %, then the finding: the 20px kind icon in white,
 * 8px, and the text, top-aligned, all 8px apart; the bubble puts it 8px under the description.
 * Without a description, the finding alone. The text says what the findings are, so the icon is
 * decorative. Spans only: the bubble is phrasing content, the button's description
 */
export default function FindingsSegment({ findings, divided }: FindingsSegmentProps) {
  return (
    <span className="flex w-full flex-col gap-8">
      {divided && (
        <span
          aria-hidden="true"
          className="bg-kern-layout-text-inverse block h-1 w-full opacity-24"
        />
      )}
      <span className="flex w-full items-start gap-8">
        <span
          aria-hidden="true"
          className={`kern-icon ${SEGMENT_ICONS[findings.kind]} kern-icon--small shrink-0`}
        />
        <span className="min-w-0 flex-1 break-words">{findings.text}</span>
      </span>
    </span>
  );
}
