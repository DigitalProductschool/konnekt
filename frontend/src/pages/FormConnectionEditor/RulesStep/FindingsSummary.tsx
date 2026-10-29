import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useRef } from 'react';

import { summaryOf } from '../../../utils/rules/checks/findingMessages';
import { ELEMENT_IDS } from '../constants';
import { RULES_COPY, WITHOUT_ALERT_ROLE } from './constants';
import type { FindingsSummaryProps } from './types';
import { nextFindingTarget, summaryVariantOf } from './utils';

/**
 * The summary above the open branch's rules (spec 003, S2; FR-013; F1, F2, F3; Figma U01
 * 6616:44378, U02 6616:44400), drawn where the rules card draws its alerts: a KERN warning alert
 * when the branch has a conflict or no applicant can meet it, a KERN info alert otherwise, with
 * the text of `summaryOf()` as its title. Its "Go to next finding" (KERN tertiary) scrolls the
 * next rule or group with a finding, in display order, into view and moves the focus to its row
 * or group frame, which its note describes, starting over after the last one; it is left out when
 * no rule or group has a finding (W16), such as FR-010's sentence alone (W12). Nothing is shown
 * before the branch's first check, or for a branch without checked rules (W13). The status region
 * announces the changes, so the alert drops KERN's `role="alert"`, which would read the whole
 * summary out after every change (FR-015). Rendered with the branch's key, so that each branch
 * starts from its first finding.
 */
export default function FindingsSummary({ check, branch, names }: FindingsSummaryProps) {
  // The item the button visited last, which the next press goes on from
  const last = useRef<string | null>(null);
  const text = check ? summaryOf(check, branch, names) : '';
  if (!check || !text) {
    return null;
  }
  const { findings } = check;

  function goToNextFinding() {
    // Only the items on the screen: the rule open in the rule editor has no row
    const targets = findings
      .map((finding) => finding.itemId)
      .filter((itemId) => document.getElementById(ELEMENT_IDS.rule(branch.key, itemId)));
    const next = nextFindingTarget(targets, [...names.keys()], last.current);
    const element = next && document.getElementById(ELEMENT_IDS.rule(branch.key, next));
    if (!next || !element) {
      return;
    }
    last.current = next;
    element.focus({ preventScroll: true });
    // Scrolls only as far as needed. A group's frame starts with its header, which then comes
    // into view too, when the group is taller than the visible area
    element.scrollIntoView({ block: 'nearest' });
    if (element.getAttribute('role') === 'group') {
      element.firstElementChild?.scrollIntoView({ block: 'nearest' });
    }
  }

  return (
    <div className="p-8">
      <KernAlert
        variant={summaryVariantOf(check)}
        title={text}
        className="w-full"
        {...WITHOUT_ALERT_ROLE}
      >
        {findings.length > 0 && (
          <button type="button" onClick={goToNextFinding} className="kern-btn kern-btn--tertiary">
            <span className="kern-label">{RULES_COPY.goToNextFinding}</span>
          </button>
        )}
      </KernAlert>
    </div>
  );
}
