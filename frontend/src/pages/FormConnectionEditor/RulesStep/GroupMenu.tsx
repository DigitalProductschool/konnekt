import groupIcon from '../../../assets/icons/group-brackets.svg';
import linkIcon from '../../../assets/icons/link-ink.svg';
import renameIcon from '../../../assets/icons/rename.svg';
import resetIcon from '../../../assets/icons/reset-restore.svg';
import ActionMenu from '../../../components/ActionMenu';
import type { MenuAction } from '../../../components/ActionMenu/types';
import { RULES_COPY } from './constants';
import type { GroupMenuProps } from './types';

/**
 * The ⋯ menu of a group or sub-group (W6, W8; design-notes §5), built like the rule menu (U14
 * 6113:28988), since no frame draws it: its own error message, rename, ungroup, "Copy link"
 * for a stored draft or a published connection (spec 007, S4; FR-028), and delete. A
 * group a based variant inherits can't be ungrouped or deleted there: it offers "Reset to
 * Standard" once changed, and "Remove from this variant" (W8). A removed group, or one dissolved
 * in the variant, only offers "Restore group" (U23 6185:41586), and "Copy link", since it is still
 * there for an agent to read and restore.
 */
export default function GroupMenu({
  groupName,
  standing,
  hasMessage,
  canReset,
  mainName,
  onAddMessage,
  onRemoveMessage,
  onRename,
  onUngroup,
  onReset,
  onDelete,
  onRestore,
  onCopyLink,
}: GroupMenuProps) {
  const inherited = standing === 'inherited';
  const copyLink: MenuAction[] = onCopyLink
    ? [{ label: RULES_COPY.copyLink, icon: { src: linkIcon }, onSelect: onCopyLink }]
    : [];
  // Beside "Restore", which has no icon, without its own, so that the two labels line up
  const plainCopyLink: MenuAction[] = copyLink.map(({ label, onSelect }) => ({ label, onSelect }));
  const actions: MenuAction[] =
    standing === 'removed'
      ? [{ label: RULES_COPY.restoreGroup, onSelect: onRestore }, ...plainCopyLink]
      : [
          hasMessage
            ? {
                label: RULES_COPY.removeMessage,
                icon: { kern: 'kern-icon--close' },
                onSelect: onRemoveMessage,
              }
            : {
                label: RULES_COPY.addMessage,
                icon: { kern: 'kern-icon--add' },
                onSelect: onAddMessage,
              },
          { label: RULES_COPY.rename, icon: { src: renameIcon }, onSelect: onRename },
          ...(inherited
            ? []
            : [{ label: RULES_COPY.ungroup, icon: { src: groupIcon }, onSelect: onUngroup }]),
          ...(canReset
            ? [{ label: RULES_COPY.resetTo(mainName), icon: { src: resetIcon }, onSelect: onReset }]
            : []),
          ...copyLink,
          {
            label: inherited ? RULES_COPY.removeFromVariant : RULES_COPY.deleteGroup,
            icon: { kern: 'kern-icon--delete' },
            danger: true,
            separated: true,
            onSelect: onDelete,
          },
        ];
  return <ActionMenu label={RULES_COPY.groupMenuLabel(groupName)} actions={actions} />;
}
