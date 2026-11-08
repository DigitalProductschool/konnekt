import { MEDIUM_TEXT, SMALL_TEXT } from './constants';
import type { RulePredicateProps } from './types';
import ValueChip from './ValueChip';

/**
 * The condition: the design's ≥, < or = chip (Figma "Rules/Symbol" 6082:3409), the check's words
 * in `body/default` muted and a chip for each value (cosmetic 22), then the letter case of a text
 * rule.
 */
export default function RulePredicate({ predicate }: RulePredicateProps) {
  const { symbol, words, values, tail } = predicate;
  return (
    <>
      {/* Figma's `circle` radius on a chip wider than tall: fully rounded, not an ellipse */}
      {symbol && (
        <span
          className={`${SMALL_TEXT} bg-kern-layout-background-default text-kern-layout-text-default flex min-w-24 justify-center rounded-full border border-(--kern-color-decorative-border-default) px-8 font-semibold`}
        >
          {symbol}
        </span>
      )}
      <span className={`${MEDIUM_TEXT} text-kern-layout-text-muted`}>{words}</span>
      {values.map((value, index) => (
        // A value can show twice, such as an option outside its set
        <ValueChip key={`${index}-${value}`} value={value} />
      ))}
      {tail && <span className={`${MEDIUM_TEXT} text-kern-layout-text-muted`}>{tail}</span>}
    </>
  );
}
