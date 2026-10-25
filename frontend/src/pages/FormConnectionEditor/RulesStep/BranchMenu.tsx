import renameIcon from '../../../assets/icons/rename.svg';
import ActionMenu from './ActionMenu';
import { RULES_COPY } from './constants';
import type { BranchMenuProps, MenuAction } from './types';

/**
 * A variant tab's ⋯ menu (W3; design-notes §4), built like the rule menu (U14 6113:28988), since
 * no frame draws it: "Rename" for every variant, Standard included, which opens Edit variant,
 * and "Delete" for every other one, after a confirmation.
 */
export default function BranchMenu({ branchName, deletable, onRename, onDelete }: BranchMenuProps) {
  const actions: MenuAction[] = [
    { label: RULES_COPY.renameVariant, icon: { src: renameIcon }, onSelect: onRename },
    ...(deletable
      ? [
          {
            label: RULES_COPY.deleteVariant,
            icon: { kern: 'kern-icon--delete' },
            danger: true,
            separated: true,
            onSelect: onDelete,
          },
        ]
      : []),
  ];
  return <ActionMenu label={RULES_COPY.variantMenuLabel(branchName)} actions={actions} />;
}
