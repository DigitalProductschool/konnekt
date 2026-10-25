import type { KeyboardEvent } from 'react';

import InfoTooltip from '../../../components/InfoTooltip';
import { ELEMENT_IDS } from '../constants';
import BranchTab from './BranchTab';
import { RULES_COPY } from './constants';
import type { BranchTabsProps } from './types';
import { tabAfterKey } from './utils';

/**
 * Figma "Variant tabs" (U17 6134:9153; F16): one tab per variant, Standard first, and "+ Add
 * variant", from the start of the step: before the first rule and while a rule is edited too
 * (FR-019). While Standard is the only variant, an (i) after "Add variant" says what a variant
 * is (U17 6162:34206). The tabs follow WAI-ARIA's tab pattern: the arrow keys, Home and End
 * open another tab and move the focus there.
 */
export default function BranchTabs({ state, dispatch }: BranchTabsProps) {
  const { branches, openBranch } = state;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = tabAfterKey(event.key, index, branches.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    const { key } = branches[next];
    dispatch({ type: 'selectBranch', branchKey: key });
    document.getElementById(ELEMENT_IDS.branchTab(key))?.focus();
  }

  return (
    <div className="flex flex-wrap items-end gap-x-24 border-b border-(--kern-color-decorative-border-default)">
      <div
        role="tablist"
        aria-label={RULES_COPY.variants}
        className="flex flex-wrap items-end gap-x-24"
      >
        {branches.map((branch, index) => (
          <BranchTab
            key={branch.key}
            branch={branch}
            selected={branch.key === openBranch}
            deletable={index > 0}
            onSelect={() => dispatch({ type: 'selectBranch', branchKey: branch.key })}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onRename={() => dispatch({ type: 'askEditVariant', branchKey: branch.key })}
            onDelete={() => dispatch({ type: 'askDeleteVariant', branchKey: branch.key })}
          />
        ))}
      </div>
      <div className="flex items-center">
        <button
          id={ELEMENT_IDS.addVariant}
          type="button"
          onClick={() => dispatch({ type: 'askAddVariant' })}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--add kern-icon--small" />
          <span className="kern-label">{RULES_COPY.addVariant}</span>
        </button>
        {branches.length === 1 && (
          <InfoTooltip
            label={RULES_COPY.aboutVariants}
            text={RULES_COPY.variantsInfo}
            iconSize="small"
          />
        )}
      </div>
    </div>
  );
}
