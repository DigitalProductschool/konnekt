import type { PersonaField } from '@connection-portal/rules/personas/types';
import { shownFieldsOf } from '@connection-portal/rules/personas/values';
import { useEffect, useReducer } from 'react';

import { ELEMENT_IDS } from '../constants';
import { TEST_STEP_COPY } from './constants';
import DocumentFields from './DocumentFields';
import type { PersonaEditorProps } from './types';
import {
  ageDraftKey,
  ageTextOf,
  dateOfBirthForAge,
  documentGroupsOf,
  draftsReducer,
  formatDisplayDate,
  NAME_DRAFT_KEY,
  nameProblem,
  parseEntry,
  parseWholeNumber,
} from './utils';
import ValueField from './ValueField';

/**
 * The data card's fields in edit mode (S8.5; F1, W11; FR-006 to FR-009, FR-017; Figma Name
 * 7058:60652, "Personal ID" 7058:60653, "Driving licence" 7058:60658): the name, then each
 * document's heading and fields, 24px apart. Every valid entry applies at once (`onSetValue`,
 * `onRename`), also the age and the date of birth that give each other; an invalid one shows its
 * error under its field and keeps the persona's last valid value, while its other changes apply
 * (FR-008). The drafts are this component's own (`draftsReducer`); "Done" unmounts it, which drops
 * the invalid ones (design-notes §5.3). It mounts when "Edit data" is pressed, and moves the focus
 * to the first field, the name
 */
export default function PersonaEditor({
  persona,
  fields,
  context,
  today,
  onSetValue,
  onRename,
}: PersonaEditorProps) {
  const [drafts, dispatch] = useReducer(draftsReducer, {});
  const nameId = ELEMENT_IDS.personaField(persona.id, NAME_DRAFT_KEY);

  useEffect(() => {
    document.getElementById(nameId)?.focus();
    // Only when edit mode starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameDraft = drafts[NAME_DRAFT_KEY];

  function changeName(text: string) {
    const error = nameProblem(text);
    dispatch({ type: 'edit', key: NAME_DRAFT_KEY, text, error });
    if (error === null) {
      onRename(text.trim());
    }
  }

  function changeText(key: string, kind: PersonaField['kind'], text: string, dateOfBirth: boolean) {
    const parsed = parseEntry(kind, text);
    if (!parsed.ok) {
      dispatch({ type: 'edit', key, text, error: parsed.error });
      return;
    }
    dispatch({ type: 'edit', key, text, error: null });
    onSetValue(key, parsed.value);
    if (dateOfBirth) {
      // The age follows the date
      dispatch({
        type: 'edit',
        key: ageDraftKey(key),
        text: ageTextOf(parsed.value, today),
        error: null,
      });
    }
  }

  function changeAge(key: string, text: string) {
    const draftKey = ageDraftKey(key);
    const entered = parseWholeNumber(text);
    if (!entered.ok) {
      dispatch({ type: 'edit', key: draftKey, text, error: entered.error });
      return;
    }
    if (entered.value === null) {
      // Cleared: the date of birth is empty too
      dispatch({ type: 'edit', key: draftKey, text, error: null });
      dispatch({ type: 'edit', key, text: '', error: null });
      onSetValue(key, null);
      return;
    }
    const current = persona.values[key];
    const born = dateOfBirthForAge(
      entered.value,
      typeof current === 'string' ? current : null,
      today
    );
    if (!born.ok) {
      dispatch({ type: 'edit', key: draftKey, text, error: born.error });
      return;
    }
    if (born.value === null) {
      return;
    }
    dispatch({ type: 'edit', key: draftKey, text, error: null });
    dispatch({ type: 'edit', key, text: formatDisplayDate(born.value), error: null });
    onSetValue(key, born.value);
  }

  return (
    <div className="flex flex-col gap-24">
      <ValueField
        id={nameId}
        label={TEST_STEP_COPY.name}
        text={nameDraft?.text ?? persona.name}
        kind="text"
        error={nameDraft?.error ?? null}
        onChange={changeName}
      />
      {documentGroupsOf(shownFieldsOf(persona, fields)).map((group) => (
        <DocumentFields
          key={group.documentType}
          group={group}
          persona={persona}
          context={context}
          today={today}
          drafts={drafts}
          onText={(field, text) => changeText(field.key, field.kind, text, field.dateOfBirth)}
          onAge={(field, text) => changeAge(field.key, text)}
          onValue={(field, value) => onSetValue(field.key, value)}
        />
      ))}
    </div>
  );
}
