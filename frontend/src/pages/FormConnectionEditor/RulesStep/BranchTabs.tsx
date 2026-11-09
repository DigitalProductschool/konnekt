import { namesOf, tabFindingsOf } from '@connection-portal/rules/checks/findingMessages';
import type { KeyboardEvent } from 'react';

import InfoTooltip from '../../../components/InfoTooltip';
import { ELEMENT_IDS } from '../constants';
import BranchTab from './BranchTab';
import { ADD_VARIANT_CLASSES, RULES_COPY, TAB_LIST_CLASSES, TAB_ROW_CLASSES } from './constants';
import type { BranchTabsProps } from './types';
import { tabAfterKey } from './utils';

/**
 * The variant tab row (S11; Figma "Variant tabs" U38 6134:9153, U37 6134:8515, U43 6168:7009):
 * one tab per variant, Standard first, and "+ Add variant", from the start of the step: before
 * the first rule and while a rule is edited too (F26), the tabs 24px apart and bottom-aligned
 * over the row's 1px line. The (i) after "Add variant" says what a variant is, in every state, on
 * hover, keyboard focus and a tap (F27, FR-035; U37 6151:33809, 6151:33820), in the action blue.
 * The tabs follow WAI-ARIA's tab pattern: the arrow keys, Home and End open another tab and move
 * the focus there. Each tab has its (i) and ⋯ beside it, which a tab list mustn't contain, so the
 * tab list is an empty element that owns the tabs (`aria-owns`), and the row lays out the tabs
 * with their buttons. Every tab whose variant has findings shows their icon, selected or not
 * (spec 003, S4; W13; FR-041): only certain findings count, and a variant without checked rules
 * or before its first check shows none; a spec 002 problem wins over them (U50 7375:101551).
 * The row stays transparent and unclipped: it sits in the step's pinned wrapper (U01 #18), whose
 * height is measured, so a wrapping row is fine.
 */
export default function BranchTabs({
  state,
  checks,
  dispatch,
  onCopyLink,
  problems,
}: BranchTabsProps) {
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
    <div className={TAB_ROW_CLASSES}>
      <div
        role="tablist"
        aria-label={RULES_COPY.variants}
        aria-owns={branches.map((branch) => ELEMENT_IDS.branchTab(branch.key)).join(' ')}
        // Out of the row's flow, so that the row's gap doesn't count it
        className="absolute"
      />
      <div className={TAB_LIST_CLASSES}>
        {branches.map((branch, index) => {
          const check = checks[branch.key];
          return (
            <BranchTab
              key={branch.key}
              branch={branch}
              selected={branch.key === openBranch}
              deletable={index > 0}
              findings={check ? tabFindingsOf(check, branch, namesOf(branch.items)) : null}
              problem={problems?.[branch.key] ?? null}
              onSelect={() => dispatch({ type: 'selectBranch', branchKey: branch.key })}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onRename={() => dispatch({ type: 'askEditVariant', branchKey: branch.key })}
              onDelete={() => dispatch({ type: 'askDeleteVariant', branchKey: branch.key })}
              onCopyLink={onCopyLink && (() => onCopyLink(branch.key))}
            />
          );
        })}
      </div>
      <div className={ADD_VARIANT_CLASSES}>
        <button
          id={ELEMENT_IDS.addVariant}
          type="button"
          onClick={() => dispatch({ type: 'askAddVariant' })}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--add kern-icon--small" />
          <span className="kern-label">{RULES_COPY.addVariant}</span>
        </button>
        <InfoTooltip
          label={RULES_COPY.aboutVariants}
          text={RULES_COPY.variantsInfo}
          iconSize="small"
          tone="action"
        />
      </div>
    </div>
  );
}
