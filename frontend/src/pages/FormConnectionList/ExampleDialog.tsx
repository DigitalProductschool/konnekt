import ConfirmDialog from '../../components/ConfirmDialog';
import { useCopy } from '../../hooks/useLanguage';
import { EXAMPLE_DIALOG_COPY } from './constants';
import type { ExampleDialogProps } from './types';

/**
 * The example dialog (spec 010, S3; FR-054, FR-055; Figma U18 6793:47710): "Start from an
 * example?", the sentence naming the draft it creates, "Go back" and "Create the example", in
 * KERN's 480px dialog with the two buttons side by side. It neither deletes nor publishes, so
 * "Go back", the ×, Escape and a click on the scrim close it without creating anything, and the
 * focus returns to "Start from an example" (the native dialog's opener). While the example is
 * being created it is busy ("Creating…") and nothing closes it; a failure keeps it open with
 * "Couldn’t create the example" above the text, the API's message and a 5xx answer's error ID,
 * and "Try again"
 */
export default function ExampleDialog({ state, onCancel, onConfirm }: ExampleDialogProps) {
  const copy = useCopy(EXAMPLE_DIALOG_COPY);
  return (
    <ConfirmDialog
      open={state.open}
      title={copy.title}
      text={copy.text}
      confirmLabel={copy.confirm}
      cancelLabel={copy.cancel}
      busyLabel={copy.busy}
      busy={state.creating}
      error={state.error}
      errorTitle={copy.errorTitle}
      retryLabel={copy.retry}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
