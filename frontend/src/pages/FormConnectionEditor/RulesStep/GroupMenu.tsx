import groupIcon from '../../../assets/icons/group-brackets.svg';
import renameIcon from '../../../assets/icons/rename.svg';
import ActionMenu from './ActionMenu';
import { RULES_COPY } from './constants';
import type { GroupMenuProps } from './types';

/**
 * The ⋯ menu of a group or sub-group (W6, W8; design-notes §5), built like the rule menu (U14
 * 6113:28988), since no frame draws it: its own error message, rename, ungroup, and delete.
 */
export default function GroupMenu({
  groupName,
  hasMessage,
  onAddMessage,
  onRemoveMessage,
  onRename,
  onUngroup,
  onDelete,
}: GroupMenuProps) {
  return (
    <ActionMenu
      label={RULES_COPY.groupMenuLabel(groupName)}
      actions={[
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
        { label: RULES_COPY.ungroup, icon: { src: groupIcon }, onSelect: onUngroup },
        {
          label: RULES_COPY.deleteGroup,
          icon: { kern: 'kern-icon--delete' },
          danger: true,
          separated: true,
          onSelect: onDelete,
        },
      ]}
    />
  );
}
