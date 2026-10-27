import checkIcon from '../../../assets/icons/check-white-small.svg';
import { RULES_COPY } from './constants';
import type { SelectBoxProps } from './types';

/**
 * A rule's box in select mode (U16 6344:53557; Figma "Data/Check item", 20px box). It sits in a
 * column 16px from the rules card's left edge, level with the rule's name, whatever the level:
 * positioned against the card, it keeps its place in the flow from top to bottom. 15px: the
 * card's padding box starts inside its 1px border. The focus ring is around the box only, for
 * keyboard focus.
 */
export default function SelectBox({ id, ruleName, checked, onToggle }: SelectBoxProps) {
  return (
    <span className="absolute left-15 mt-10 flex size-20">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={RULES_COPY.selectRule(ruleName)}
        className="peer rounded-kern-small border-kern-layout-border bg-kern-layout-background-default checked:border-kern-action-default checked:bg-kern-action-default focus-visible:outline-kern-layout-text-default size-20 cursor-pointer appearance-none border focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      <img
        src={checkIcon}
        alt=""
        className="pointer-events-none absolute inset-0 hidden size-20 peer-checked:block"
      />
    </span>
  );
}
