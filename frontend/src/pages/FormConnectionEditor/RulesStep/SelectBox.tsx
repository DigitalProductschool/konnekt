import { RULES_COPY } from './constants';
import type { SelectBoxProps } from './types';

/**
 * A rule's box in select mode (U36 6344:53557, 6344:53558, 6344:53559; Figma "Data/Check item"):
 * KERN's checkbox with the `Checkbox` override in index.css (design-notes §2 `Checkbox`, T016): a
 * 20px box, hover a 2px blue border, checked hover a 3px tint ring, keyboard focus a 3px ring
 * around the box only. The rule's row passes it in its `selectBox` slot (`RuleRow`). Positioned
 * against the rules card, it sits in a column 16px from the card's left edge whatever the level
 * (15px: the card's padding box starts inside its 1px border), 22px below the row's top: 20 here
 * and the override's 2px margin. Its name says which rule it chooses.
 */
export default function SelectBox({ id, ruleName, checked, onToggle }: SelectBoxProps) {
  return (
    <span className="absolute left-15 mt-20 flex">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={RULES_COPY.selectRule(ruleName)}
        className="kern-form-check__checkbox motion transition-colors duration-(--duration-colour)"
      />
    </span>
  );
}
