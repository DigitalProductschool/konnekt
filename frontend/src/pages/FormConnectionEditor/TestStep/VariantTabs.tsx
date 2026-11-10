import type { KeyboardEvent } from 'react';

import { useCopy } from '../../../hooks/useLanguage';
import { ELEMENT_IDS } from '../constants';
import { RULES_STEP_COPY, TAB_ROW_CLASSES } from '../RulesStep/constants';
import { tabAfterKey } from '../RulesStep/utils';
import type { VariantTabsProps } from './types';
import VariantTab from './VariantTab';

/**
 * The variant tabs (S8.2; F6, O4; FR-015, FR-018; spec 008 S13; Figma "Variant tabs" 7057:58717,
 * U69 7057:60401, U71 7058:61380, U72 7058:61656): one tab per variant, by its name, in the rules
 * step's tab order, 24px apart and bottom-aligned on a 1px decorative border, 39px high: the rules
 * step's row (`TAB_ROW_CLASSES`) without its ⋯, "Add variant" and the variant ⓘ (F27, F28).
 * The tabs follow WAI-ARIA's tab pattern (research R16): the arrow keys, Home and End select
 * another variant and move the focus there. Each tab's (i) or warning icon sits beside it, which a
 * tab list mustn't contain, so the tab list is an empty element that owns the tabs (`aria-owns`),
 * as on the rules step. Each tab controls the step's variant panel (`ELEMENT_IDS.testPanel`),
 * which `TestStep` renders for the selected one. Changing the tab keeps the selected persona
 * (FR-004).
 */
export default function VariantTabs({ branches, selected, checks, onSelect }: VariantTabsProps) {
  const rulesCopy = useCopy(RULES_STEP_COPY);
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
    <div className={TAB_ROW_CLASSES}>
      <div
        role="tablist"
        aria-label={rulesCopy.variants}
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
