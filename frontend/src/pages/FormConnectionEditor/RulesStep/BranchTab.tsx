import BranchName from '../../../components/BranchName';
import { ELEMENT_IDS } from '../constants';
import BranchMenu from './BranchMenu';
import type { BranchTabProps } from './types';

/**
 * Figma "Rules/Variant tab · fixes" (6529:39174, B2 of bug rules-ui-fixes): a label row with the
 * variant's name, label/default and black while open, body/default and muted otherwise, the (i)
 * of its description (F31) and, while open, the ⋯ of its menu (W3; design-notes §4), 4px apart,
 * then a black underline while open, under the whole row, ⋯ included. The (i) and the ⋯ are
 * buttons beside the tab, not in it, so that the tab stays one control. The ⋯ keeps its 32px
 * target in the 24px row by overhanging it by 4px above and below. A long name wraps.
 */
export default function BranchTab({
  branch,
  selected,
  deletable,
  onSelect,
  onKeyDown,
  onRename,
  onDelete,
}: BranchTabProps) {
  const text = selected
    ? 'text-kern-layout-text-default font-semibold'
    : 'text-kern-layout-text-muted hover:text-kern-layout-text-default';
  return (
    <div className="flex min-w-0 flex-col gap-8 pt-4">
      <div className="flex min-h-24 min-w-0 items-center gap-4">
        <BranchName name={branch.name} description={branch.description}>
          <button
            id={ELEMENT_IDS.branchTab(branch.key)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={ELEMENT_IDS.branchPanel(branch.key)}
            tabIndex={selected ? 0 : -1}
            onClick={onSelect}
            onKeyDown={onKeyDown}
            className={`${text} text-kern-static-medium rounded-kern-small focus-visible:outline-kern-action-focus-default cursor-pointer text-left leading-(--kern-typography-line-height-medium-static) wrap-anywhere focus-visible:outline-4 focus-visible:outline-offset-2`}
          >
            {branch.name}
          </button>
        </BranchName>
        {selected && (
          <div className="-my-4 shrink-0">
            <BranchMenu
              branchName={branch.name}
              deletable={deletable}
              onRename={onRename}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className={`h-2 w-full ${selected ? 'bg-kern-layout-text-default' : ''}`}
      />
    </div>
  );
}
