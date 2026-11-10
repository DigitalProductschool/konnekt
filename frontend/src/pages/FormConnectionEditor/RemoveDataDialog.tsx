import ConfirmDialog from '../../components/ConfirmDialog';
import { useLanguage } from '../../hooks/useLanguage';
import { removalDialogCopyOf } from './DocumentsStep/utils';
import type { RemoveDataDialogProps } from './types';

/**
 * The question before data stops being requested (F72, 002-S1.1; FR-029): "Remove Driving
 * licence?" for a list item's trash, asked always (U23 7298:62322 "Keep document" / "Remove
 * document"), and naming the rules that check the document when there are any (U24 7298:62500);
 * "Stop requesting Date of birth?" before a data item, "All data items" or the note's "Remove it"
 * takes away data that rules check (U26 6324:40396, "Cancel" / "Stop requesting"). One paragraph
 * names the rules with their variants (`ruleListText()`), so that it also describes the dialog.
 * Confirming applies the change and keeps the rules, which refuse publishing and saving while
 * they remain (002-S1.3). The ×, Escape and the scrim answer as the cancel button: nothing goes,
 * and a removal stays undoable through its toast, so the scrim stays on (FR-052a, T035). Its words
 * are in the language of the moment; the editor names the data from the catalog of the moment.
 */
export default function RemoveDataDialog({
  removal,
  rules,
  editing,
  onCancel,
  onConfirm,
}: RemoveDataDialogProps) {
  const { language } = useLanguage();
  const copy = removalDialogCopyOf(removal, rules, editing, language);
  return (
    <ConfirmDialog
      open={removal !== null}
      title={copy.title}
      text={copy.text}
      cancelLabel={copy.cancelLabel}
      confirmLabel={copy.confirmLabel}
      danger
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
