import { dataHeadingOf } from '@connection-portal/rules/personas/messages';
import type { PersonaField } from '@connection-portal/rules/personas/types';
import { shownFieldsOf } from '@connection-portal/rules/personas/values';
import { useEffect, useReducer, useRef } from 'react';

import ConfirmDialog from '../../../components/ConfirmDialog';
import { useLanguage } from '../../../hooks/useLanguage';
import { ELEMENT_IDS } from '../constants';
import { EDIT_DATA_COPY, TEST_STEP_COPY } from './constants';
import DocumentFields from './DocumentFields';
import type { EditDataDialogProps } from './types';
import {
  ageDraftKey,
  ageTextOf,
  changedValuesOf,
  CLOSED_EDIT_DATA,
  dateOfBirthForAge,
  documentGroupsOf,
  draftsInLanguage,
  editDataReducer,
  formatDisplayDate,
  hasEntryError,
  NAME_DRAFT_KEY,
  nameProblem,
  parseEntry,
  parseWholeNumber,
} from './utils';
import ValueField from './ValueField';

/**
 * "Edit data" as a dialog (spec 008 S13, FR-042, F40; Figma U66 7058:60639, U67 7058:60670):
 * "Edit Mia’s data", the intro "Change the values to try a particular case. Results update when
 * you save.", the name, then each document's heading and fields, 24px apart, and "Cancel" / "Save
 * and test"; the kit's 600px dialog with the scrim on (T035).
 *
 * The fields work on a copy of the persona's values (`editDataReducer`): a valid entry applies to
 * the copy at once, also the age and the date of birth that give each other, so that removing
 * class B hides "Class B since" and adding it again brings its date back (W4); an invalid one
 * shows its error under its field (004-S8.5; "Enter a date that exists, e.g. 28.02.2007."), and
 * while any field has one, "Save and test" saves nothing and moves the focus to the first such
 * field. "Save and test" hands the new name and the changed values to the step, which applies
 * them and shows the toast; "Cancel", the ×, Escape and the scrim drop them. Nothing of the
 * persona is stored, sent or logged (FR-047).
 *
 * It stays mounted while closed, so that closing it returns the focus to "Edit data" (the browser
 * does that); it opens with the focus on the name. Its copy starts anew with every opening: the
 * render that sees a new persona (or none) resets it.
 *
 * Its texts follow the website's language while it is open (spec 009, FR-003): the typed entries
 * stay, and the errors shown are worded again in the language of the moment (`draftsInLanguage()`)
 */
export default function EditDataDialog({
  persona,
  fields,
  context,
  today,
  onSave,
  onCancel,
}: EditDataDialogProps) {
  const { language } = useLanguage();
  const copy = TEST_STEP_COPY[language];
  const [state, dispatch] = useReducer(editDataReducer, CLOSED_EDIT_DATA);
  const formRef = useRef<HTMLDivElement>(null);
  const open = persona !== null && context !== null;
  const openFor = open ? persona.id : null;
  // A new opening, or the persona went (generated anew): the copy follows, in this render
  if (openFor !== state.personaId) {
    if (open) {
      dispatch({ type: 'start', persona });
    } else {
      dispatch({ type: 'close' });
    }
  }
  const nameId = persona ? ELEMENT_IDS.personaField(persona.id, NAME_DRAFT_KEY) : '';

  // The name takes the focus when the dialog opens (after `showModal()`, which runs first)
  useEffect(() => {
    if (openFor !== null) {
      document.getElementById(nameId)?.focus();
    }
  }, [openFor, nameId]);

  const ready = open && state.personaId === persona.id;
  const { values, drafts } = state;
  const shownDrafts = draftsInLanguage(drafts, fields, values, today, language);

  function changeName(text: string) {
    dispatch({ type: 'draft', key: NAME_DRAFT_KEY, text, error: nameProblem(text, language) });
  }

  function changeText(key: string, kind: PersonaField['kind'], text: string, dateOfBirth: boolean) {
    const parsed = parseEntry(kind, text, language);
    if (!parsed.ok) {
      dispatch({ type: 'draft', key, text, error: parsed.error });
      return;
    }
    dispatch({ type: 'draft', key, text, error: null });
    dispatch({ type: 'value', key, value: parsed.value });
    if (dateOfBirth) {
      // The age follows the date
      dispatch({
        type: 'draft',
        key: ageDraftKey(key),
        text: ageTextOf(parsed.value, today),
        error: null,
      });
    }
  }

  function changeAge(key: string, text: string) {
    const draftKey = ageDraftKey(key);
    const entered = parseWholeNumber(text, language);
    if (!entered.ok) {
      dispatch({ type: 'draft', key: draftKey, text, error: entered.error });
      return;
    }
    if (entered.value === null) {
      // Cleared: the date of birth is empty too
      dispatch({ type: 'draft', key: draftKey, text, error: null });
      dispatch({ type: 'draft', key, text: '', error: null });
      dispatch({ type: 'value', key, value: null });
      return;
    }
    const current = values[key];
    const born = dateOfBirthForAge(
      entered.value,
      typeof current === 'string' ? current : null,
      today,
      language
    );
    if (!born.ok) {
      dispatch({ type: 'draft', key: draftKey, text, error: born.error });
      return;
    }
    if (born.value === null) {
      return;
    }
    dispatch({ type: 'draft', key: draftKey, text, error: null });
    dispatch({ type: 'draft', key, text: formatDisplayDate(born.value), error: null });
    dispatch({ type: 'value', key, value: born.value });
  }

  function save() {
    if (!ready) {
      return;
    }
    if (hasEntryError(drafts)) {
      // Blocked until fixed (U67 7058:60670): the first field with an error takes the focus
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    onSave({
      name: (drafts[NAME_DRAFT_KEY]?.text ?? persona.name).trim(),
      values: changedValuesOf(persona.values, values),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      wide
      title={persona ? EDIT_DATA_COPY[language].title(dataHeadingOf(persona, language)) : ''}
      text={open ? copy.editDataIntro : ''}
      textClassName="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
      confirmLabel={copy.saveAndTest}
      cancelLabel={copy.cancel}
      onCancel={onCancel}
      onConfirm={save}
    >
      {ready && (
        // 24px under the intro, as between the fields' sections (the dialog puts 16 above it)
        <div ref={formRef} className="mt-8 flex flex-col gap-24">
          <ValueField
            id={nameId}
            label={copy.name}
            text={drafts[NAME_DRAFT_KEY]?.text ?? persona.name}
            kind="text"
            error={shownDrafts[NAME_DRAFT_KEY]?.error ?? null}
            onChange={changeName}
          />
          {documentGroupsOf(shownFieldsOf({ ...persona, values }, fields)).map((group) => (
            <DocumentFields
              key={group.documentType}
              group={group}
              personaId={persona.id}
              values={values}
              context={context}
              today={today}
              drafts={shownDrafts}
              onText={(field, text) => changeText(field.key, field.kind, text, field.dateOfBirth)}
              onAge={(field, text) => changeAge(field.key, text)}
              onValue={(field, value) => dispatch({ type: 'value', key: field.key, value })}
            />
          ))}
        </div>
      )}
    </ConfirmDialog>
  );
}
