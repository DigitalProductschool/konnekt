import ActionMenu from '../../../components/ActionMenu';
import type { MenuAction } from '../../../components/ActionMenu/types';
import { useCopy } from '../../../hooks/useLanguage';
import { MENU_ENTRY_LOOKS, RULES_STEP_COPY } from './constants';
import type { BranchMenuProps, MenuEntryId, MenuHandlers } from './types';
import { menuEntriesOf } from './utils';

/**
 * A variant tab's ⋯ menu ("Rules/Variant menu", U59 6523:37519), on every tab of the rules step
 * (F28, CLAR #21), with what `menuEntriesOf({ kind: 'variant' })` gives it, in its order
 * (FR-036): "Rename", which opens "Edit variant" (F28: no inline rename), "Copy link" for a
 * stored draft or a published connection (spec 007, S4; F10), and after the divider "Delete
 * variant", after a confirmation, on every variant but Standard. "Unlink from Standard" stays out
 * (F10). Built on the ⋯ menus' `ActionMenu`, which places it (FR-009d).
 */
export default function BranchMenu({
  branchName,
  deletable,
  onRename,
  onDelete,
  onCopyLink,
}: BranchMenuProps) {
  const copy = useCopy(RULES_STEP_COPY);
  const entries = menuEntriesOf(
    { kind: 'variant' },
    { branchKind: deletable ? 'variant' : 'standard', linkable: onCopyLink !== null }
  );
  const labels: Partial<Record<MenuEntryId, string>> = {
    rename: copy.renameVariant,
    copyLink: copy.copyLink,
    delete: copy.deleteVariant,
  };
  const handlers: MenuHandlers = {
    rename: onRename,
    copyLink: onCopyLink ?? undefined,
    delete: onDelete,
  };
  const actions: MenuAction[] = entries.flatMap(({ id }) => {
    const label = labels[id];
    const onSelect = handlers[id];
    return label && onSelect ? [{ label, ...MENU_ENTRY_LOOKS[id], onSelect }] : [];
  });
  return <ActionMenu label={copy.variantMenuLabel(branchName)} actions={actions} />;
}
