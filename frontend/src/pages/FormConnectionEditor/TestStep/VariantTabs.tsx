import type { KeyboardEvent } from 'react';

import { ELEMENT_IDS } from '../constants';
import { RULES_COPY } from '../RulesStep/constants';
import { tabAfterKey } from '../RulesStep/utils';
import type { VariantTabsProps } from './types';
import VariantTab from './VariantTab';

/**
 * The variant tabs (S8.2; F6, O4; FR-015, FR-018; Figma "Variant tabs" 7057:58717): one tab per
 * variant, by its name, in the rules step's tab order, 24px apart over a 1px decorative border,
 * as the rules step's tabs without their ⋯ and "Add variant". The tabs follow WAI-ARIA's tab
 * pattern (research R16): the arrow keys, Home and End select another variant and move the focus
 * there. Each tab's (i) or warning icon sits beside it, which a tab list mustn't contain, so the
 * tab list is an empty element that owns the tabs (`aria-owns`), as on the rules step. Each tab
 * controls the step's variant panel (`ELEMENT_IDS.testPanel`), which `TestStep` renders for the
 * selected one. Changing the tab keeps the selected persona (FR-004).
 */
export default function VariantTabs({ branches, selected, checks, onSelect }: VariantTabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = tabAfterKey(event.key, index, branches.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    const { key } = branches[next];
    onSelect(key);
    document.getElementById(ELEMENT_IDS.testTab(key))?.focus();
  }

  return (
    <div className="flex flex-wrap items-end gap-x-24 border-b border-(--kern-color-decorative-border-default)">
      <div
        role="tablist"
        aria-label={RULES_COPY.variants}
        aria-owns={branches.map((branch) => ELEMENT_IDS.testTab(branch.key)).join(' ')}
        // Out of the row's flow, so that the row's gap doesn't count it
        className="absolute"
      />
      {branches.map((branch, index) => (
        <VariantTab
          key={branch.key}
          branch={branch}
          selected={branch.key === selected}
          check={checks[branch.key] ?? null}
          onSelect={() => onSelect(branch.key)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        />
      ))}
    </div>
  );
}
