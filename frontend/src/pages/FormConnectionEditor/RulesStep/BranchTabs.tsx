import type { KeyboardEvent } from 'react';

import InfoTooltip from '../../../components/InfoTooltip';
import { namesOf, tabFindingsOf } from '../../../utils/rules/checks/findingMessages';
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
 * open another tab and move the focus there. Each tab has its (i) and ⋯ beside it, which a tab
 * list mustn't contain, so the tab list is an empty element that owns the tabs (`aria-owns`),
 * and the row lays out the tabs with their buttons. Every tab whose variant has findings shows
 * their icon, selected or not (spec 003, S4; A6, W12, W13; FR-014; Figma U09 6753:41605): only
 * certain findings count, and a variant without checked rules or before its first check shows none.
 */
export default function BranchTabs({ state, checks, dispatch }: BranchTabsProps) {
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
        aria-owns={branches.map((branch) => ELEMENT_IDS.branchTab(branch.key)).join(' ')}
        // Out of the row's flow, so that the row's gap doesn't count it
        className="absolute"
      />
      <div className="flex min-w-0 flex-wrap items-end gap-x-24">
        {branches.map((branch, index) => {
          const check = checks[branch.key];
          return (
            <BranchTab
              key={branch.key}
              branch={branch}
              selected={branch.key === openBranch}
              deletable={index > 0}
              findings={check ? tabFindingsOf(check, branch, namesOf(branch.items)) : null}
              onSelect={() => dispatch({ type: 'selectBranch', branchKey: branch.key })}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onRename={() => dispatch({ type: 'askEditVariant', branchKey: branch.key })}
              onDelete={() => dispatch({ type: 'askDeleteVariant', branchKey: branch.key })}
            />
          );
        })}
      </div>
      {/* 2px lower than KERN's margins put it, so that its label is on the line of the tab
          labels, 22px above the border (Figma "Add variant · aligned" 6542:39560, B2); the
          negative margin keeps the row 48px tall */}
      <div className="-mb-2 flex items-center pt-2">
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
