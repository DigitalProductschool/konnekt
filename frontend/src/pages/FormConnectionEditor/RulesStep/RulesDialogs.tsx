import ConfirmDialog from '../../../components/ConfirmDialog';
import { statementOf } from '../../../utils/rules/statements';
import { RULES_COPY } from './constants';
import type { RulesDialogsProps } from './types';
import { branchOf, deleteDialogText, groupOf, ruleOf } from './utils';
import VariantDialog from './VariantDialog';

/**
 * The Rules step's dialogs: "Delete Rule 03?" (U14 6113:29056), "Delete Group 01?", built like
 * it (W8; design-notes §5), both saying in Standard what the deletion does to the variants based
 * on it (U23 6185:8847; F14); "Save changes to Rule 01?" (U28 6197:10989, F10); "Add variant" and
 * "Edit variant" (U17 6139:32693, W3); and "Delete Ambulance?" (W3). Closing any of them keeps
 * everything as it was.
 */
export default function RulesDialogs({
  state,
  context,
  editing,
  dispatch,
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
  const deletingVariant =
    dialog?.type === 'deleteVariant' ? branchOf(state, dialog.branchKey) : undefined;
  const statement = deleting ? statementOf(deleting, context) : null;
  const deletedText =
    dialog && (deleting || deletingGroup) && 'branchKey' in dialog
      ? deleteDialogText(
          state,
          { branchKey: dialog.branchKey, itemId: (deleting ?? deletingGroup)?.id ?? '' },
          statement?.text ?? null
        )
      : '';
  const editedName = state.editing?.draft.name ?? '';
  return (
    <>
      <ConfirmDialog
        open={deleting !== null}
        title={RULES_COPY.deleteTitle(deleting?.name ?? '')}
        text={deletedText}
        confirmLabel={RULES_COPY.deleteRule}
        cancelLabel={RULES_COPY.cancel}
        danger
        onCancel={onCancel}
        onConfirm={onConfirmDelete}
      />
      <ConfirmDialog
        open={deletingGroup !== null}
        title={RULES_COPY.deleteTitle(deletingGroup?.name ?? '')}
        text={deletedText}
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
      <VariantDialog state={state} dispatch={dispatch} />
      <ConfirmDialog
        open={deletingVariant !== undefined}
        title={RULES_COPY.deleteVariantTitle(deletingVariant?.name.trim() ?? '')}
        text={editing ? RULES_COPY.deleteVariantTextEditing : RULES_COPY.deleteVariantText}
        confirmLabel={RULES_COPY.deleteVariantConfirm}
        cancelLabel={RULES_COPY.cancel}
        danger
        onCancel={onCancel}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
