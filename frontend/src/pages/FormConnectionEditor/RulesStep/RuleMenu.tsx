import groupIcon from '../../../assets/icons/group-brackets.svg';
import renameIcon from '../../../assets/icons/rename.svg';
import ActionMenu from './ActionMenu';
import { RULES_COPY } from './constants';
import type { MenuAction, RuleMenuProps } from './types';

/**
 * The ⋯ menu of a rule (U14 6113:28988; U16 6344:53529): edit, rename, duplicate, "Group with
 * other rules" while another rule shares its level and it isn't in a sub-group (US2-AS6), and
 * delete.
 */
export default function RuleMenu({
  ruleName,
  canGroup,
  onEdit,
  onRename,
  onDuplicate,
  onGroup,
  onDelete,
}: RuleMenuProps) {
  const actions: MenuAction[] = [
    { label: RULES_COPY.editRule, icon: { kern: 'kern-icon--edit' }, onSelect: onEdit },
    { label: RULES_COPY.rename, icon: { src: renameIcon }, onSelect: onRename },
    {
      label: RULES_COPY.duplicate,
      icon: { kern: 'kern-icon--content-copy' },
      onSelect: onDuplicate,
    },
    ...(canGroup
      ? [{ label: RULES_COPY.groupWithOthers, icon: { src: groupIcon }, onSelect: onGroup }]
      : []),
    {
      label: RULES_COPY.deleteRule,
      icon: { kern: 'kern-icon--delete' },
      danger: true,
      separated: true,
      onSelect: onDelete,
    },
  ];
  return <ActionMenu label={RULES_COPY.menuLabel(ruleName)} actions={actions} />;
}
