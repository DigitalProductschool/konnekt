import { noticeText } from '@connection-portal/rules/checks/findingMessages';

import BranchName from '../../../components/BranchName';
import { ELEMENT_IDS } from '../constants';
import type { VariantTabProps } from './types';

/**
 * One variant tab (S8.2; F6, O4; FR-018; Figma "Rules/Variant tab · fixes" 6529:39174 in
 * 7057:58717; U07 7058:61618): a label row with the variant's name, label/default and black while
 * selected, body/default and muted otherwise, and its description's (i) 4px after it, then a 2px
 * black underline while selected, under the whole row. There's no ⋯: variants are renamed on the
 * rules step. A variant that no applicant can meet (spec 003's `none_can_meet` notice) shows
 * KERN's warning triangle in the (i)'s place, selected or not, named "Standard has findings"
 * (design-notes §2): `BranchName` with this one finding segment, whose tooltip (U07 7058:61632)
 * shows the description, if any, then "No applicant can meet the rules of Standard.", on hover and
 * on keyboard focus. Spec 003's other findings stay on the rules step. The icon is a button beside
 * the tab, so the tab stays one control. The focus ring shows for keyboard focus only: kern.css,
 * unlayered, does the reverse for `[tabindex]` (a ring on any `:focus`, `outline: 0` on
 * `:focus:focus-visible`), hence the `!` on both sides, as in `PersonaChip`.
 */
export default function VariantTab({
  branch,
  selected,
  check,
  onSelect,
  onKeyDown,
}: VariantTabProps) {
  const notice = check?.notice?.kind === 'none_can_meet' ? check.notice : null;
  const findings = notice
    ? { kind: 'warning' as const, text: noticeText(notice, branch.name) }
    : null;
  const text = selected
    ? 'text-kern-layout-text-default font-semibold'
    : 'text-kern-layout-text-muted hover:text-kern-layout-text-default';
  return (
    <div className="flex min-w-0 flex-col gap-8 pt-4">
      <div className="flex min-h-24 min-w-0 items-center">
        <BranchName name={branch.name} description={branch.description} findings={findings}>
          <button
            id={ELEMENT_IDS.testTab(branch.key)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={ELEMENT_IDS.testPanel(branch.key)}
            tabIndex={selected ? 0 : -1}
            onClick={onSelect}
            onKeyDown={onKeyDown}
            className={`${text} text-kern-static-medium rounded-kern-small focus-visible:outline-kern-action-focus-default! cursor-pointer text-left leading-(--kern-typography-line-height-medium-static) wrap-anywhere focus-visible:outline-4! focus-visible:outline-offset-2! [&:focus:not(:focus-visible)]:outline-none!`}
          >
            {branch.name}
          </button>
        </BranchName>
      </div>
      <span
        aria-hidden="true"
        className={`h-2 w-full ${selected ? 'bg-kern-layout-text-default' : ''}`}
      />
    </div>
  );
}
