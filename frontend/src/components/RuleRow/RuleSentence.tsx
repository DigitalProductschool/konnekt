import RulePredicate from './RulePredicate';
import type { RuleSentenceProps } from './types';
import { glyphOf } from './utils';

/**
 * Figma "Rules/Rule row" › Sentence, in FR-005's words (F1): the document's glyph and name, the
 * data, then the condition. The laid-out parts are hidden from assistive technologies, which
 * read the statement as one sentence; so are the ≥, < and = chips (FR-005).
 */
export default function RuleSentence({ parts, text }: RuleSentenceProps) {
  return (
    <>
      <p aria-hidden="true" className="flex w-full flex-wrap items-center gap-x-8 gap-y-4">
        <span className="relative size-16 shrink-0">
          <img src={glyphOf(parts.documentType)} alt="" className="absolute inset-0 size-full" />
        </span>
        <span className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {parts.document} –
        </span>
        <span className="text-kern-static-medium text-kern-layout-text-default font-semibold">
          {parts.data}
        </span>
        {parts.predicate && <RulePredicate predicate={parts.predicate} />}
      </p>
      <p className="sr-only">{text}</p>
    </>
  );
}
