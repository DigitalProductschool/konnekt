import BranchName from '../../../components/BranchName';
import { ELEMENT_IDS } from '../constants';
import BranchMenu from './BranchMenu';
import { TAB_ACTIONS_CLASSES } from './constants';
import type { BranchTabProps } from './types';

/**
 * One variant tab of the rules step (S11): `BranchName`'s tab form, Figma "Rules/Variant tab ·
 * fixes" (6529:39174; U37 6134:8603, 6134:8719, U38 6134:9153): the tab with the name, its icon
 * and the ⋯ of its menu 4px apart, the 2px indicator under the row while open. The icon is the
 * (i) of the description, only with one, on every tab (FR-035c; FR-041 as clarified on
 * 2026-11-18, which drops FR-041b's grey "No findings." (i)), or the findings' icon, or a
 * problem's red icon, which wins over them: its tooltip says the problem, then, below a divider,
 * the findings (FR-041a; U06 note 8; the accessible name stays "<variant> has findings",
 * 003-S4.4); without any of them, no icon. Every tab has
 * its ⋯ (F28, CLAR #21: Rename for every branch, Delete for the variants, Copy link), as a button
 * beside the tab, not in it; it keeps its 32px target in the 24px row by overhanging it by 4px
 * above and below.
 */
export default function BranchTab({
  branch,
  selected,
  deletable,
  findings,
  problem,
  onSelect,
  onKeyDown,
  onRename,
  onDelete,
  onCopyLink,
}: BranchTabProps) {
  return (
    <BranchName
      name={branch.name}
      description={branch.description}
      findings={problem ? { ...problem, more: findings } : findings}
      tab={{
        id: ELEMENT_IDS.branchTab(branch.key),
        panelId: ELEMENT_IDS.branchPanel(branch.key),
        selected,
        onSelect,
        onKeyDown,
      }}
      actions={
        <div className={TAB_ACTIONS_CLASSES}>
          <BranchMenu
            branchName={branch.name}
            deletable={deletable}
            onRename={onRename}
            onDelete={onDelete}
            onCopyLink={onCopyLink}
          />
        </div>
      }
    />
  );
}
