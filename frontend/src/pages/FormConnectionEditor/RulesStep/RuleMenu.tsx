import copyToIcon from '../../../assets/icons/copy-to-variant.svg';
import groupIcon from '../../../assets/icons/group-brackets.svg';
import renameIcon from '../../../assets/icons/rename.svg';
import resetIcon from '../../../assets/icons/reset-restore.svg';
import ActionMenu from '../../../components/ActionMenu';
import type { MenuAction } from '../../../components/ActionMenu/types';
import { RULES_COPY } from './constants';
import type { RuleMenuProps } from './types';

/**
 * The ⋯ menu of a rule (U14 6113:28988; U16 6344:53529; U18 6324:39971), with only what applies:
 * edit, rename, duplicate, "Copy to variant" while the connection has other variants, "Group
 * with other rules" while another rule shares its level and it isn't in a sub-group (US2-AS6),
 * "Reset to Standard" for a rule changed in its variant (FR-024), and delete, which becomes
 * "Remove from this variant" for a rule the variant inherits. A removed rule only offers
 * "Restore rule" (U23 6185:8802; FR-024).
 */
export default function RuleMenu({
  ruleName,
  standing,
  canGroup,
  canCopy,
  canReset,
  mainName,
  onEdit,
  onRename,
  onDuplicate,
  onCopy,
  onGroup,
  onReset,
  onDelete,
  onRestore,
}: RuleMenuProps) {
  const actions: MenuAction[] =
    standing === 'removed'
      ? [{ label: RULES_COPY.restoreRule, onSelect: onRestore }]
      : [
          { label: RULES_COPY.editRule, icon: { kern: 'kern-icon--edit' }, onSelect: onEdit },
          { label: RULES_COPY.rename, icon: { src: renameIcon }, onSelect: onRename },
          {
            label: RULES_COPY.duplicate,
            icon: { kern: 'kern-icon--content-copy' },
            onSelect: onDuplicate,
          },
          ...(canCopy
            ? [{ label: RULES_COPY.copyToVariant, icon: { src: copyToIcon }, onSelect: onCopy }]
            : []),
          ...(canGroup
            ? [{ label: RULES_COPY.groupWithOthers, icon: { src: groupIcon }, onSelect: onGroup }]
            : []),
          ...(canReset
            ? [{ label: RULES_COPY.resetTo(mainName), icon: { src: resetIcon }, onSelect: onReset }]
            : []),
          {
            label: standing === 'inherited' ? RULES_COPY.removeFromVariant : RULES_COPY.deleteRule,
            icon: { kern: 'kern-icon--delete' },
            danger: true,
            separated: true,
            onSelect: onDelete,
          },
        ];
  return <ActionMenu label={RULES_COPY.menuLabel(ruleName)} actions={actions} />;
}
