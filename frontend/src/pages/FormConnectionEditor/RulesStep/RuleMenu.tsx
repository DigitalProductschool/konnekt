import ActionMenu from '../../../components/ActionMenu';
import type { MenuAction } from '../../../components/ActionMenu/types';
import { MENU_ENTRY_LOOKS, RULES_COPY } from './constants';
import type { MenuEntryId, RuleMenuProps } from './types';

/**
 * The ⋯ menu of a rule (U55 6530:40150, 6522:32038, 6531:39026; U56 6522:32644; build note U54
 * 6522:33105), with only what `menuEntriesOf()` gives it, in its order (FR-036; F29, F30, F68):
 * "Edit rule", "Rename", "Duplicate", "Copy to variant" while some other variant could still
 * receive it, "Group with other rules" beside a neighbour on its level (not in a sub-group),
 * "Reset to Standard" for a rule changed in its variant (FR-024), "Copy link" for a stored draft
 * or a published connection (spec 007, S4), and after the divider "Delete rule", or "Remove from
 * <variant>" for a rule linked to Standard, which has no Rename or Duplicate there. A removed
 * rule only offers "Restore rule" and "Copy link". "Remove from group" stays out (F7).
 */
export default function RuleMenu({
  ruleName,
  entries,
  branchName,
  mainName,
  handlers,
}: RuleMenuProps) {
  const labels: Partial<Record<MenuEntryId, string>> = {
    edit: RULES_COPY.editRule,
    rename: RULES_COPY.rename,
    duplicate: RULES_COPY.duplicate,
    copyToVariant: RULES_COPY.copyToVariant,
    group: RULES_COPY.groupWithOthers,
    reset: RULES_COPY.resetTo(mainName),
    restore: RULES_COPY.restoreRule,
    copyLink: RULES_COPY.copyLink,
    remove: RULES_COPY.removeFrom(branchName),
    delete: RULES_COPY.deleteRule,
  };
  const restoring = entries.some((entry) => entry.id === 'restore');
  const actions: MenuAction[] = entries.flatMap(({ id }) => {
    const label = labels[id];
    const onSelect = handlers[id];
    if (!label || !onSelect) {
      return [];
    }
    const look = id === 'copyLink' && restoring ? {} : MENU_ENTRY_LOOKS[id];
    return [{ label, ...look, onSelect }];
  });
  return <ActionMenu label={RULES_COPY.menuLabel(ruleName)} actions={actions} />;
}
