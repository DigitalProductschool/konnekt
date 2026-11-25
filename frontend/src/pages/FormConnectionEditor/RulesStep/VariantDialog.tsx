import { DESCRIPTION_MAX_LENGTH } from '@konnekt/rules/constants';
import { useEffect, useId, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';

import ConfirmDialog from '../../../components/ConfirmDialog';
import TextField from '../../../components/TextField';
import { useLanguage } from '../../../hooks/useLanguage';
import { ELEMENT_IDS } from '../constants';
import { RULES_STEP_COPY, START_WITH_CLASSES, VARIANT_FIELD_CLASSES } from './constants';
import StartWithOption from './StartWithOption';
import type { VariantDialogProps } from './types';
import {
  branchOf,
  focusSoon,
  initialVariantForm,
  variantFormProblem,
  variantFormReducer,
} from './utils';

/**
 * "Add variant" (S11; U37 6139:32693, 600px wide) and, from a tab's "Rename", "Edit variant"
 * (F28, 002-S4.4), which has no intro and no "Start with": "Variant name" with the design's "*",
 * "Description (optional)" as a textarea of at most 500 characters with spell check (FR-032) and
 * the helper under its label. A missing or used name ("Enter a name for the variant.", "There’s
 * already a variant called "Ambulance"."; W18, C5) is refused under the name, as U52 6197:12011
 * draws it, announced, and the focus goes back to it. The variant starts linked to Standard
 * (FR-052h) unless the team member chooses "Start empty" (002-S4.1).
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
  const { language } = useLanguage();
  const copy = RULES_STEP_COPY[language];
  // The refusal in the language shown: the same check again, as the fields haven't changed since
  const error =
    form.error === null
      ? null
      : (variantFormProblem(form, state, editing?.key ?? null, language) ?? form.error);

  // Each opening starts from the variant's fields, or empty ones, with the focus on the name
  useEffect(() => {
    if (open) {
      dispatchForm({ type: 'reset', form: initialVariantForm(editing) });
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [open, editing]);

  function handleConfirm() {
    const problem = variantFormProblem(form, state, editing?.key ?? null, language);
    if (problem) {
      // Rendered first, so that the name is invalid and described when it takes the focus
      flushSync(() => dispatchForm({ type: 'refuse', error: problem }));
      nameRef.current?.focus();
      return;
    }
    const variant = { name: form.name, description: form.description };
    // The new variant's tab, or the edited one's, takes the focus once the dialog is closed. A
    // new variant's key is its id, made here (spec 007, research R10)
    const key = editing?.key ?? crypto.randomUUID();
    dispatch(
      editing
        ? { type: 'editVariant', branchKey: key, variant }
        : { type: 'addVariant', variant, origin: form.origin, id: key }
    );
    focusSoon(ELEMENT_IDS.branchTab(key));
  }

  return (
    <ConfirmDialog
      open={open}
      title={editing ? copy.editVariantTitle : copy.addVariantTitle}
      text=""
      confirmLabel={editing ? copy.saveVariant : copy.addVariantTitle}
      cancelLabel={copy.cancel}
      wide
      onCancel={() => dispatch({ type: 'closeDialog' })}
      onConfirm={handleConfirm}
    >
      {/* Figma's "Dialog content/Add variant": the intro and the fields 24px apart */}
      <div className="flex flex-col gap-24">
        {!editing && (
          <p className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
            {copy.addVariantIntro}
          </p>
        )}
        <div className={VARIANT_FIELD_CLASSES.name}>
          <TextField
            ref={nameRef}
            id={`${id}-name`}
            label={copy.variantName}
            requiredMark
            value={form.name}
            error={error}
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
        </div>
        <div className={VARIANT_FIELD_CLASSES.description}>
          <TextField
            id={`${id}-description`}
            multiline
            optional
            label={copy.description}
            hint={copy.descriptionHint}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={form.description}
            onChange={(event) =>
              dispatchForm({ type: 'change', changes: { description: event.target.value } })
            }
          />
        </div>
        {!editing && (
          <fieldset className={START_WITH_CLASSES.group}>
            <legend className={START_WITH_CLASSES.legend}>{copy.startWith}</legend>
            <StartWithOption
              name={`${id}-origin`}
              value="based"
              label={copy.basedOn(main)}
              help={copy.basedOnHelp(main)}
              checked={form.origin === 'based'}
              onSelect={() => dispatchForm({ type: 'change', changes: { origin: 'based' } })}
            />
            <StartWithOption
              name={`${id}-origin`}
              value="empty"
              label={copy.startEmpty}
              help={copy.startEmptyHelp(main)}
              checked={form.origin === 'empty'}
              onSelect={() => dispatchForm({ type: 'change', changes: { origin: 'empty' } })}
            />
          </fieldset>
        )}
      </div>
    </ConfirmDialog>
  );
}
