import { DESCRIPTION_MAX_LENGTH } from '@connection-portal/rules/constants';
import { useEffect, useId, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';

import ConfirmDialog from '../../../components/ConfirmDialog';
import TextField from '../../../components/TextField';
import { ELEMENT_IDS } from '../constants';
import { RULES_COPY } from './constants';
import StartWithOption from './StartWithOption';
import type { VariantDialogProps } from './types';
import {
  branchOf,
  focusSoon,
  initialVariantForm,
  newBranchKey,
  variantFormProblem,
  variantFormReducer,
} from './utils';

/**
 * "Add variant" (U17 6139:32693) and, from a tab's "Rename", "Edit variant" (W3), which has no
 * intro and no "Start with". A missing or used name is refused under the name, as in U26
 * 6197:12011, announced, and the focus goes back to it. The variant starts based on Standard unless the
 * team member chooses "Start empty" (FR-019, FR-020).
 */
export default function VariantDialog({ state, dispatch }: VariantDialogProps) {
  const { dialog } = state;
  const open = dialog?.type === 'addVariant' || dialog?.type === 'editVariant';
  const editing = dialog?.type === 'editVariant' ? branchOf(state, dialog.branchKey) : undefined;
  const [form, dispatchForm] = useReducer(variantFormReducer, undefined, () =>
    initialVariantForm()
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const main = state.branches[0].name.trim();

  // Each opening starts from the variant's fields, or empty ones, with the focus on the name
  useEffect(() => {
    if (open) {
      dispatchForm({ type: 'reset', form: initialVariantForm(editing) });
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [open, editing]);

  function handleConfirm() {
    const problem = variantFormProblem(form, state, editing?.key ?? null);
    if (problem) {
      // Rendered first, so that the name is invalid and described when it takes the focus
      flushSync(() => dispatchForm({ type: 'refuse', error: problem }));
      nameRef.current?.focus();
      return;
    }
    const variant = { name: form.name, description: form.description };
    // The new variant's tab, or the edited one's, takes the focus once the dialog is closed
    const key = editing?.key ?? newBranchKey(state.branches);
    dispatch(
      editing
        ? { type: 'editVariant', branchKey: key, variant }
        : { type: 'addVariant', variant, origin: form.origin }
    );
    focusSoon(ELEMENT_IDS.branchTab(key));
  }

  return (
    <ConfirmDialog
      open={open}
      title={editing ? RULES_COPY.editVariantTitle : RULES_COPY.addVariantTitle}
      text=""
      confirmLabel={editing ? RULES_COPY.saveVariant : RULES_COPY.addVariantTitle}
      cancelLabel={RULES_COPY.cancel}
      onCancel={() => dispatch({ type: 'closeDialog' })}
      onConfirm={handleConfirm}
    >
      {/* Figma's "Dialog content/Add variant": the intro and the fields 24px apart */}
      <div className="flex flex-col gap-24">
        {!editing && (
          <p className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
            {RULES_COPY.addVariantIntro}
          </p>
        )}
        <TextField
          ref={nameRef}
          id={`${id}-name`}
          label={RULES_COPY.variantName}
          value={form.name}
          error={form.error}
          errorRole="alert"
          onChange={(event) =>
            dispatchForm({ type: 'change', changes: { name: event.target.value } })
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleConfirm();
            }
          }}
        />
        <div className="kern-form-input">
          <label htmlFor={`${id}-description`} className="kern-label">
            {RULES_COPY.description}{' '}
            <span className="kern-label__optional">{RULES_COPY.optional}</span>
          </label>
          <div id={`${id}-description-hint`} className="kern-hint">
            {RULES_COPY.descriptionHint}
          </div>
          <textarea
            id={`${id}-description`}
            rows={2}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={form.description}
            aria-describedby={`${id}-description-hint`}
            onChange={(event) =>
              dispatchForm({ type: 'change', changes: { description: event.target.value } })
            }
            className="kern-form-input__input h-64! min-h-0!"
          />
        </div>
        {!editing && (
          <fieldset className="flex flex-col gap-8">
            <legend className="text-kern-static-medium text-kern-layout-text-default mb-8 leading-(--kern-typography-line-height-medium-static) font-semibold">
              {RULES_COPY.startWith}
            </legend>
            <StartWithOption
              name={`${id}-origin`}
              value="based"
              label={RULES_COPY.basedOn(main)}
              help={RULES_COPY.basedOnHelp(main)}
              checked={form.origin === 'based'}
              onSelect={() => dispatchForm({ type: 'change', changes: { origin: 'based' } })}
            />
            <StartWithOption
              name={`${id}-origin`}
              value="empty"
              label={RULES_COPY.startEmpty}
              help={RULES_COPY.startEmptyHelp(main)}
              checked={form.origin === 'empty'}
              onSelect={() => dispatchForm({ type: 'change', changes: { origin: 'empty' } })}
            />
          </fieldset>
        )}
      </div>
    </ConfirmDialog>
  );
}
