import { noticeText } from '@connection-portal/rules/checks/findingMessages';

import BranchName from '../../../components/BranchName';
import { useLanguage } from '../../../hooks/useLanguage';
import { ELEMENT_IDS } from '../constants';
import type { VariantTabProps } from './types';

/**
 * One variant tab of the test step (S8.2; F6, F27, F38; FR-018, FR-041; spec 008 S13; Figma
 * "Rules/Variant tab · fixes" 6529:39174 in U69 7057:60401, U71 7058:61380): `BranchName`'s tab
 * form, the rules step's tab (design-notes §3 "Tabs") without its ⋯ (variants are renamed on the
 * rules step, F28) and without the grey "No findings." ⓘ (F27: the rules step's only; U71
 * 7058:61380 draws none), so the icon after the name is the description's (i), as on Standard
 * (U69 7057:60402), or the warning triangle.
 *
 * The test step shows one finding only (F38, FR-041; CLAR Q29 (b), (d)): spec 003's
 * `none_can_meet` notice of the variant, as the checks give it (the baseline's evaluator, FR-003),
 * selected or not: the ⚠ (U71 7058:61618) named "Standard has findings" and its tooltip (U71
 * 7058:61632) with the description, if any, then "No citizen can meet the rules of Standard." on
 * hover, keyboard focus and a tap. The frame's "Rule 01 and Rule 02 contradict each other, …" is a
 * contradiction finding, which stays on the rules step (Q29 (b)). No line repeats it above the
 * result heading (CLAR #50, FR-041e).
 */
export default function VariantTab({
  branch,
  selected,
  check,
  onSelect,
  onKeyDown,
}: VariantTabProps) {
  const { language } = useLanguage();
  const notice = check?.notice?.kind === 'none_can_meet' ? check.notice : null;
  const findings = notice
    ? { kind: 'warning' as const, text: noticeText(notice, branch.name, language) }
    : null;
  return (
    <BranchName
      name={branch.name}
      description={branch.description}
      findings={findings}
      tab={{
        id: ELEMENT_IDS.testTab(branch.key),
        panelId: ELEMENT_IDS.testPanel(branch.key),
        selected,
        onSelect,
        onKeyDown,
      }}
    />
  );
}
