import { MEDIUM_TEXT, RULE_ROW_COPY, SMALL_TEXT } from './constants';
import RulePredicate from './RulePredicate';
import type { RuleSentenceProps } from './types';
import { glyphOf } from './utils';

/**
 * Figma "Rules/Rule row" › "Sentence" (I6348:40889;6083:3462), in the design's form (C3): the
 * document's 16px glyph, "Personal ID ·" in `body/small` muted, the data in `label/default`, then
 * the condition, 8px apart and 4px between wrapped lines. The laid-out parts are hidden from
 * assistive technologies, which read the statement as one sentence; so are the ≥, < and = chips
 * (002-S2.6).
 */
export default function RuleSentence({ parts, text }: RuleSentenceProps) {
  return (
    <>
      <p aria-hidden="true" className="flex w-full flex-wrap items-center gap-x-8 gap-y-4">
        <img src={glyphOf(parts.documentType)} alt="" className="size-16 shrink-0" />
        <span className={`${SMALL_TEXT} text-kern-layout-text-muted`}>
          {parts.document} {RULE_ROW_COPY.documentSeparator}
        </span>
        <span className={`${MEDIUM_TEXT} text-kern-layout-text-default font-semibold`}>
          {parts.data}
        </span>
        {parts.predicate && <RulePredicate predicate={parts.predicate} />}
      </p>
      <p className="sr-only">{text}</p>
    </>
  );
}
