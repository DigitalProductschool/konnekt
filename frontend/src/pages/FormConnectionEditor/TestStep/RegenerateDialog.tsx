import ConfirmDialog from '../../../components/ConfirmDialog';
import type { ConfirmText } from '../../../utils/rules/personas/messages';
import { confirmAllOf, confirmOneOf } from '../../../utils/rules/personas/messages';
import type { Persona, PersonaConfirm } from '../../../utils/rules/personas/types';
import { TEST_STEP_COPY } from './constants';
import type { RegenerateDialogProps } from './types';

/**
 * The question's title and text, from the personas' names, in the chips' order. Empty while no
 * question is open (the closed dialog is hidden) or when a persona is missing
 */
function textOf(confirm: PersonaConfirm | null, personas: readonly Persona[] | null): ConfirmText {
  if (confirm === null || personas === null) {
    return { title: '', body: '' };
  }
  if (confirm.type === 'one') {
    const persona = personas[confirm.slot];
    return persona ? confirmOneOf(persona) : { title: '', body: '' };
  }
  return confirmAllOf(confirm.changed.flatMap((slot) => personas[slot] ?? []));
}

/**
 * The question before generating anew (S8.7; W9; FR-012; Figma U04 "dialog" 7058:61334): KERN's
 * dialog, opened from `state.confirm`, which `generateOne()` and `generateAll()` set only when a
 * persona to generate anew has changes. One persona: "Generate new data for Mia?"; all: the same
 * question for all applicants, naming every persona with changes. The buttons are "Cancel" and
 * "Generate new data"; the close button and Escape cancel too.
 *
 * It stays mounted while closed, so that closing it returns the focus to the button that opened
 * it ("Cancel", Escape: the browser does that); after "Generate new data" that button has given
 * way to the loading state, and `TestStep` moves the focus on (quickstart V9)
 */
export default function RegenerateDialog({
  confirm,
  personas,
  onConfirm,
  onCancel,
}: RegenerateDialogProps) {
  const text = textOf(confirm, personas);
  return (
    <ConfirmDialog
      open={confirm !== null}
      title={text.title}
      text={text.body}
      confirmLabel={TEST_STEP_COPY.generateNewData}
      cancelLabel={TEST_STEP_COPY.cancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
