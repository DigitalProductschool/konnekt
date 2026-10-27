import type { RulePredicateProps } from './types';
import ValueChip from './ValueChip';

/**
 * The condition: the design's ≥, < or = chip (Figma "Rules/Symbol"), FR-003's words and a chip
 * for each value, then the letter case of a text rule (F7).
 */
export default function RulePredicate({ predicate }: RulePredicateProps) {
  const { symbol, words, values, tail } = predicate;
  return (
    <>
      {/* Figma's `circle` radius on a chip wider than tall: fully rounded, not an ellipse */}
      {symbol && (
        <span className="bg-kern-layout-background-default text-kern-static-small text-kern-layout-text-default flex min-w-24 justify-center rounded-full border border-(--kern-color-decorative-border-default) px-8 leading-(--kern-typography-line-height-medium-static) font-semibold">
          {symbol}
        </span>
      )}
      <span className="text-kern-static-medium text-kern-layout-text-muted">{words}</span>
      {values.map((value, index) => (
        // A value can show twice, such as an option outside its set
        <ValueChip key={`${index}-${value}`} value={value} />
      ))}
      {tail && <span className="text-kern-static-medium text-kern-layout-text-muted">{tail}</span>}
    </>
  );
}
