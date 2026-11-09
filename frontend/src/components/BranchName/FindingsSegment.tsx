import { SEGMENT_ICONS } from './constants';
import type { FindingsSegmentProps, SegmentLineProps } from './types';

/** The segment's 1px divider in `layout-text-inverse` white at 24 % */
function SegmentDivider() {
  return (
    <span aria-hidden="true" className="bg-kern-layout-text-inverse block h-1 w-full opacity-24" />
  );
}

/** One line of the segment: the 20px kind icon in white, 8px, then the text, top-aligned */
function SegmentLine({ kind, text }: SegmentLineProps) {
  return (
    <span className="flex w-full items-start gap-8">
      <span
        aria-hidden="true"
        className={`kern-icon ${SEGMENT_ICONS[kind]} kern-icon--small shrink-0`}
      />
      <span className="min-w-0 flex-1 break-words">{text}</span>
    </span>
  );
}

/**
 * The findings segment of a variant tab's tooltip (spec 003, S4; FR-041; Figma "Rules/Tooltip"
 * 6139:3739, "Findings segment": U46 6758:43524, U50 7375:101551): below the description, a 1px
 * divider in `layout-text-inverse` white at 24 %, then the finding: the 20px kind icon in white,
 * 8px, and the text, top-aligned, all 8px apart; the bubble puts it 8px under the description.
 * Without a description, the finding alone. A problem's segment is followed by the variant's
 * findings (`more`), below a divider of their own, each line with its own icon (U06 note 8: the
 * description first, then the finding). The text says what the findings are, so the icons are
 * decorative. Spans only: the bubble is phrasing content, the button's description
 */
export default function FindingsSegment({ findings, divided }: FindingsSegmentProps) {
  const { more } = findings;
  return (
    <span className="flex w-full flex-col gap-8">
      {divided && <SegmentDivider />}
      <SegmentLine kind={findings.kind} text={findings.text} />
      {more && (
        <>
          <SegmentDivider />
          <SegmentLine kind={more.kind} text={more.text} />
        </>
      )}
    </span>
  );
}
