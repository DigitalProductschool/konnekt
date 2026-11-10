import { statementOf } from '@connection-portal/rules/statements';
import { findItem } from '@connection-portal/rules/tree';

import ConfirmDialog from '../../../components/ConfirmDialog';
import { useLanguage } from '../../../hooks/useLanguage';
import { RULES_STEP_COPY } from './constants';
import type { RulesDialogsProps } from './types';
import { branchOf, deleteDialogText, groupOf, joinNames, ruleOf } from './utils';
import VariantDialog from './VariantDialog';

/**
 * The Rules step's dialogs: "Delete Rule 03?" (U34 6113:29056) with the current app's body and no
 * sentence on the rule's effect (F70, CLAR #56), "Delete Group 01?" and "Delete Sub-group 02?",
 * built like it (W8; design-notes §5), all saying in Standard what the deletion does to the
 * variants based on it (F14): a rule's with U47's drawn body, "This deletes it from Standard and
 * from the variants that follow it: Ambulance and School transport. If a variant changed this
 * rule, it keeps its own version." (6185:8847; CLAR #56), plus the group it dissolves (W12,
 * 002-S4.17; `deleteDialogText`); "Save changes to Rule
 * 01?" (U28 6197:10989, F10); "Add variant" and "Edit variant" (U17 6139:32693, W3); and "Delete
 * “School transport”?" (U60 6523:37869, 6790:45039 in the edit flow; CLAR #38) with "Keep
 * variant", naming the variants that stay. Closing any of them keeps
 * everything as it was. The delete dialogs keep `ConfirmDialog`'s scrim (a click on it answers
 * "Cancel"): what they delete stays undoable until the connection is saved, so they aren't
 * FR-052's "dialog that deletes" (design-notes §5.2, T052's decision; T057).
 */
export default function RulesDialogs({
  state,
  context,
  editing,
  active = true,
  dispatch,
  onCancel,
  onConfirmDelete,
  onSaveChanges,
  onDiscardChanges,
}: RulesDialogsProps) {
  const { dialog } = state;
  const { language } = useLanguage();
  const copy = RULES_STEP_COPY[language];
  const deleting =
    dialog?.type === 'deleteRule' ? ruleOf(branchOf(state, dialog.branchKey), dialog.ruleId) : null;
  const deletingGroup =
    dialog?.type === 'deleteGroup'
      ? groupOf(branchOf(state, dialog.branchKey), dialog.groupId)
      : null;
  // A sub-group's dialog confirms with its menu's "Delete sub-group" (build note U54 #13)
  const deletingSubGroup =
    dialog?.type === 'deleteGroup' &&
    (findItem(branchOf(state, dialog.branchKey)?.items ?? [], dialog.groupId)?.depth ?? 0) > 0;
  const deletingVariant =
    dialog?.type === 'deleteVariant' ? branchOf(state, dialog.branchKey) : undefined;
  // The variants that stay, in tab order, which the body names ("Standard and Ambulance")
  const others = state.branches
    .filter((branch) => branch !== deletingVariant)
    .map((branch) => branch.name.trim());
  // The statement in the language shown, whatever the editor's context says (spec 009, R4)
  const statement = deleting ? statementOf(deleting, { ...context, language }) : null;
  const deletedText =
    dialog && (deleting || deletingGroup) && 'branchKey' in dialog
      ? deleteDialogText(
          state,
          { branchKey: dialog.branchKey, itemId: (deleting ?? deletingGroup)?.id ?? '' },
          statement?.text ?? null,
          language
        )
      : '';
  const editedName = state.editing?.draft.name ?? '';
  return (
    <>
      <ConfirmDialog
        open={deleting !== null}
        title={copy.deleteTitle(deleting?.name ?? '')}
        text={deletedText}
        confirmLabel={copy.deleteRule}
        cancelLabel={copy.cancel}
        danger
        onCancel={onCancel}
        onConfirm={onConfirmDelete}
      />
      <ConfirmDialog
        open={deletingGroup !== null}
        title={copy.deleteTitle(deletingGroup?.name ?? '')}
        text={deletedText}
        confirmLabel={deletingSubGroup ? copy.deleteSubGroup : copy.deleteGroup}
        cancelLabel={copy.cancel}
        danger
        onCancel={onCancel}
        onConfirm={onConfirmDelete}
      />
      <ConfirmDialog
        open={dialog?.type === 'saveChanges'}
        title={copy.saveChangesTitle(editedName)}
        text={copy.saveChangesText}
        confirmLabel={copy.saveChanges}
        cancelLabel={copy.discard}
        onCancel={onDiscardChanges}
        onClose={onCancel}
        onConfirm={onSaveChanges}
      />
      <VariantDialog state={state} dispatch={dispatch} />
      <ConfirmDialog
        open={deletingVariant !== undefined}
        title={copy.deleteVariantTitle(deletingVariant?.name.trim() ?? '')}
        text={
          deletingVariant
            ? (editing
                ? active
                  ? copy.deleteVariantTextEditing
                  : copy.deleteVariantTextEditingInactive
                : copy.deleteVariantText)(
                deletingVariant.name.trim(),
                joinNames(others, language),
                others.length
              )
            : ''
        }
        confirmLabel={copy.deleteVariantConfirm}
        cancelLabel={copy.keepVariant}
        danger
        onCancel={onCancel}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
