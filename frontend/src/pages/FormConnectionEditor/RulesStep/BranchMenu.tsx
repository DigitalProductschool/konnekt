import linkIcon from '../../../assets/icons/link-ink.svg';
import renameIcon from '../../../assets/icons/rename.svg';
import ActionMenu from '../../../components/ActionMenu';
import type { MenuAction } from '../../../components/ActionMenu/types';
import { RULES_COPY } from './constants';
import type { BranchMenuProps } from './types';

/**
 * A variant tab's ⋯ menu (W3; design-notes §4), built like the rule menu (U14 6113:28988), since
 * no frame draws it: "Rename" for every variant, Standard included, which opens Edit variant,
 * "Copy link" for a stored draft or a published connection (spec 007, S4; FR-028), and "Delete"
 * for every other one, after a confirmation.
 */
export default function BranchMenu({
  branchName,
  deletable,
  onRename,
  onDelete,
  onCopyLink,
}: BranchMenuProps) {
  const actions: MenuAction[] = [
    { label: RULES_COPY.renameVariant, icon: { src: renameIcon }, onSelect: onRename },
    ...(onCopyLink
      ? [{ label: RULES_COPY.copyLink, icon: { src: linkIcon }, onSelect: onCopyLink }]
      : []),
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
