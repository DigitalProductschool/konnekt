import BranchName from '../../../components/BranchName';
import { ELEMENT_IDS } from '../constants';
import BranchMenu from './BranchMenu';
import type { BranchTabProps } from './types';

/**
 * Figma "Rules/Variant tab" (U17 6134:8719): the variant's name, label/default and black while
 * open, body/default and muted otherwise, with the (i) of its description (F31) and a black
 * underline while open, under the name and the (i). The open tab also has the ⋯ of its menu,
 * beside the underline (W3; decision 2026-10-25, design-notes §4). The (i) and the ⋯ sit beside
 * the tab, not in it, so that the tab stays one control.
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
    <div role="presentation" className="flex shrink-0 items-start gap-4">
      <div className="flex flex-col gap-8 pt-4">
        <div className="flex h-24 items-center">
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
              className={`${text} text-kern-static-medium rounded-kern-small focus-visible:outline-kern-action-focus-default cursor-pointer leading-(--kern-typography-line-height-medium-static) whitespace-nowrap focus-visible:outline-4 focus-visible:outline-offset-2`}
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
      {selected && (
        <BranchMenu
          branchName={branch.name}
          deletable={deletable}
          onRename={onRename}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
