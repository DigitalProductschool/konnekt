import ConfirmDialog from '../../components/ConfirmDialog';
import { REMOVE_DATA_COPY } from './constants';
import RemovedDataRuleItem from './RemovedDataRuleItem';
import type { RemoveDataDialogProps } from './types';
import { removalCopyOf } from './utils';

/**
 * Figma "Remove Personal ID?" (U10 6324:40071) and "Stop requesting Date of birth?" (U10
 * 6324:40396), asked before data that rules check stops being requested: removing a document,
 * deselecting a field, or unticking "All data" (FR-029, US4-AS3; F18). It names those rules
 * with their variants in a list between the design's two sentences. Confirming applies the
 * change and keeps the rules, which refuse publishing and saving while they remain (F11).
 */
export default function RemoveDataDialog({
  removal,
  rules,
  editing,
  onCancel,
  onConfirm,
}: RemoveDataDialogProps) {
  const copy = removalCopyOf(removal, rules.length, editing);
  return (
    <ConfirmDialog
      open={removal !== null}
      title={copy.title}
      text={copy.text}
      confirmLabel={copy.confirmLabel}
      cancelLabel={REMOVE_DATA_COPY.cancel}
      danger
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <ul className="kern-list kern-list--bullet kern-list--large">
        {rules.map((rule) => (
          <RemovedDataRuleItem key={rule.key} rule={rule} />
        ))}
      </ul>
      <p className="kern-body kern-body--large">{copy.after}</p>
    </ConfirmDialog>
  );
}
