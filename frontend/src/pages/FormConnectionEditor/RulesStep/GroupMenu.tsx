import ActionMenu from '../../../components/ActionMenu';
import type { MenuAction } from '../../../components/ActionMenu/types';
import { useCopy } from '../../../hooks/useLanguage';
import { MENU_ENTRY_LOOKS, RULES_STEP_COPY } from './constants';
import type { GroupMenuProps, MenuEntryId } from './types';

/**
 * The ⋯ menu of a group or sub-group (U55 6522:32424; U56 6522:32540; build note U54 6522:33105),
 * with only what `menuEntriesOf()` gives it, in its order (FR-036; F29, F69, W22): "Rename"
 * (inline, with the duplicate check), "Add message", and "Remove message" next to it while the
 * group has one, "Ungroup", "Reset to Standard" for a group changed in its variant, "Copy link"
 * for a stored draft or a published connection (spec 007, S4), and after the divider "Delete
 * group" or "Delete sub-group", or "Remove from <variant>" for a group linked to Standard, which
 * has no Rename or Ungroup there. A removed or dissolved group only offers "Restore group" or
 * "Restore sub-group" and "Copy link". Not built (deferred or a Figma error): "Duplicate group",
 * "Group with other rules" on a group (CLAR #64), "Remove from group" (F7).
 */
export default function GroupMenu({
  groupName,
  subGroup,
  entries,
  branchName,
  mainName,
  handlers,
}: GroupMenuProps) {
  const copy = useCopy(RULES_STEP_COPY);
  const labels: Partial<Record<MenuEntryId, string>> = {
    rename: copy.rename,
    addMessage: copy.addMessage,
    removeMessage: copy.removeMessage,
    ungroup: copy.ungroup,
    reset: copy.resetTo(mainName),
    restore: subGroup ? copy.restoreSubGroup : copy.restoreGroup,
    copyLink: copy.copyLink,
    remove: copy.removeFrom(branchName),
    delete: subGroup ? copy.deleteSubGroup : copy.deleteGroup,
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
  return <ActionMenu label={copy.groupMenuLabel(groupName)} actions={actions} />;
}
