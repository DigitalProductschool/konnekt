import ConfirmDialog from '../../../components/ConfirmDialog';
import { statementOf } from '../../../utils/rules/statements';
import { RULES_COPY } from './constants';
import type { RulesDialogsProps } from './types';
import { branchOf, groupOf, ruleOf, subGroupCount } from './utils';

/**
 * The Rules step's dialogs: "Delete Rule 03?" (U14 6113:29056), "Delete Group 01?", built like
 * it (W8; design-notes §5), and "Save changes to Rule 01?" (U28 6197:10989, F10). Closing any of
 * them keeps everything as it was.
 */
export default function RulesDialogs({
  state,
  context,
  onCancel,
  onConfirmDelete,
  onSaveChanges,
  onDiscardChanges,
}: RulesDialogsProps) {
  const { dialog } = state;
  const deleting =
    dialog?.type === 'deleteRule' ? ruleOf(branchOf(state, dialog.branchKey), dialog.ruleId) : null;
  const deletingGroup =
    dialog?.type === 'deleteGroup'
      ? groupOf(branchOf(state, dialog.branchKey), dialog.groupId)
      : null;
  const statement = deleting ? statementOf(deleting, context) : null;
  const editedName = state.editing?.draft.name ?? '';
  return (
    <>
      <ConfirmDialog
        open={deleting !== null}
        title={RULES_COPY.deleteTitle(deleting?.name ?? '')}
        text={RULES_COPY.deleteText(statement?.text ?? null)}
        confirmLabel={RULES_COPY.deleteRule}
        cancelLabel={RULES_COPY.cancel}
        danger
        onCancel={onCancel}
        onConfirm={onConfirmDelete}
      />
      <ConfirmDialog
        open={deletingGroup !== null}
        title={RULES_COPY.deleteTitle(deletingGroup?.name ?? '')}
        text={RULES_COPY.deleteGroupText(
          deletingGroup?.name ?? '',
          deletingGroup ? subGroupCount(deletingGroup) : 0
        )}
        confirmLabel={RULES_COPY.deleteGroup}
        cancelLabel={RULES_COPY.cancel}
        danger
        onCancel={onCancel}
        onConfirm={onConfirmDelete}
      />
      <ConfirmDialog
        open={dialog?.type === 'saveChanges'}
        title={RULES_COPY.saveChangesTitle(editedName)}
        text={RULES_COPY.saveChangesText}
        confirmLabel={RULES_COPY.saveChanges}
        cancelLabel={RULES_COPY.discard}
        onCancel={onDiscardChanges}
        onClose={onCancel}
        onConfirm={onSaveChanges}
      />
    </>
  );
}
