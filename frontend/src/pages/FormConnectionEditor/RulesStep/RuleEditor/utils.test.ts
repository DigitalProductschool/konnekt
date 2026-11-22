import { resolveTarget } from '@connection-portal/rules/conditions';
import {
  CONTEXT,
  CONTEXT_DE,
  MDL,
  PID,
  PID_DE,
  rule,
  target,
} from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import { matchesSearch } from '../../../../components/ValuesPicker/utils';
import type { MissingControlInput } from './types';
import {
  boundaryWords,
  checkChoiceOf,
  checkSections,
  dataSections,
  hintsOf,
  initialRuleEditorState,
  missingControl,
  withProposal,
} from './utils';

const COMPLETE: MissingControlInput = {
  document: 'pid',
  target: { document_type: 'pid', field: 'birthdate', part: null, licence_class: null },
  unrequested: false,
  partMissing: false,
  condition: { operator: 'at_least_years_ago', years: 21 },
  conditionComplete: true,
  valuesInput: false,
  message: 'You must be at least 21 years old.',
};

describe('missingControl', () => {
  it('names nothing for a complete rule', () => {
    expect(missingControl(COMPLETE)).toBeNull();
  });

  it('names the first picker without its choice, in the order of the editor', () => {
    const empty = { ...COMPLETE, target: null, condition: null, conditionComplete: false };
    expect(missingControl({ ...empty, document: null })).toBe('document');
    expect(missingControl(empty)).toBe('data');
    expect(missingControl({ ...COMPLETE, partMissing: true, condition: null })).toBe('part');
    expect(missingControl({ ...COMPLETE, condition: null, conditionComplete: false })).toBe(
      'check'
    );
  });

  it('names the data picker for data that is no longer requested', () => {
    expect(missingControl({ ...COMPLETE, unrequested: true })).toBe('data');
  });

  it('names the value field, or the values picker of a check on a value set', () => {
    expect(missingControl({ ...COMPLETE, conditionComplete: false })).toBe('value');
    expect(missingControl({ ...COMPLETE, conditionComplete: false, valuesInput: true })).toBe(
      'values'
    );
  });

  it('names the message last, also when it is only spaces', () => {
    expect(missingControl({ ...COMPLETE, message: '  ' })).toBe('message');
  });
});

describe('hintsOf', () => {
  const TODAY = '2026-10-25';
  const resolved = (document: string, field: string, part: string | null = null) => {
    const found = resolveTarget(target(document, field, part), CONTEXT.documents);
    if (!found) {
      throw new Error(`${document}.${field} isn't in the test catalog`);
    }
    return found;
  };

  it('asks for the part of a field made of parts (U32)', () => {
    expect(hintsOf(resolved('pid', 'place_of_birth'), null, TODAY, 'en')).toEqual([
      'Place of birth has parts. Choose the part to check.',
    ]);
  });

  // F34 (CLAR 2026-11-07 #25): the Date of birth takes the other dates' hint
  it('gives every date, the Date of birth too, F34’s hint', () => {
    expect(hintsOf(resolved('pid', 'birthdate'), null, TODAY, 'en')).toEqual([
      'Check the time since or until this date, or compare it with a fixed date.',
    ]);
    expect(hintsOf(resolved('pid', 'date_of_expiry'), null, TODAY, 'en')).toEqual([
      'Check the time since or until this date, or compare it with a fixed date.',
    ]);
  });

  it('says that citizens who turn N on the day of sharing count (U11)', () => {
    const hints = hintsOf(
      resolved('pid', 'birthdate'),
      { operator: 'at_least_years_ago', years: 21 },
      TODAY,
      'en'
    );
    expect(hints).toContain('Citizens who turn 21 that day count.');
    expect(
      hintsOf(
        resolved('pid', 'birthdate'),
        { operator: 'less_than_years_ago', years: 21 },
        TODAY,
        'en'
      )
    ).not.toContain('Citizens who turn 21 that day count.');
    expect(
      hintsOf(
        resolved('pid', 'date_of_issuance'),
        { operator: 'at_least_years_ago', years: 2 },
        TODAY,
        'en'
      )
    ).not.toContain('Citizens who turn 2 that day count.');
  });
});

describe('date of birth in the rule editor (B7)', () => {
  const dataLabels = (document: typeof PID) =>
    dataSections(document, 'en').flatMap((section) =>
      section.choices.map((choice) => choice.label)
    );

  it('names the date of birth as an age in the data menu, for the PID and the mDL', () => {
    expect(dataLabels(PID)).toContain('Date of birth (Age)');
    expect(dataLabels(MDL)).toContain('Date of birth (Age)');
    expect(dataLabels(PID)).not.toContain('Date of birth');
  });

  it('finds it in the data menu’s search by "age" and by "birth"', () => {
    const found = (search: string) =>
      dataLabels(PID).filter((label) => matchesSearch(label, search));
    expect(found('age')).toContain('Date of birth (Age)');
    expect(found('birth')).toContain('Date of birth (Age)');
  });

  // F34 (cosmetic 9) and CLAR 2026-11-08 #63: every date, the Date of birth too, offers "Time
  // ago", "Time from now" and "Fixed date"
  it('offers every date, the Date of birth too, "Time ago", "Time from now" and "Fixed date"', () => {
    expect(checkSections('date', true, 'en').map((section) => section.heading)).toEqual([
      'Time ago',
      'Time from now',
      'Fixed date',
    ]);
  });

  it('keeps "date of birth" in the missing-value note', () => {
    const resolved = resolveTarget(target('pid', 'birthdate'), CONTEXT.documents);
    if (!resolved) {
      throw new Error('pid.birthdate isn’t in the test catalog');
    }
    const hints = hintsOf(resolved, { operator: 'before', date: '2000-01-01' }, '2026-10-25', 'en');
    expect(hints.some((hint) => hint.includes('If the date of birth is missing'))).toBe(true);
    expect(hints.join(' ')).not.toContain('(Age)');
  });
});

// Spec 009, R10, V8: the message is the proposal if it is the proposal in any language, so that an
// untouched proposal follows a switch and a written one is shown as saved
describe('the proposal across the languages', () => {
  const AGE = rule(
    1,
    target('pid', 'birthdate'),
    { operator: 'at_least_years_ago', years: 21 },
    ''
  );
  const ENGLISH = 'You need to be at least 21 years old.';
  const GERMAN = 'Sie müssen mindestens 21 Jahre alt sein.';
  const editedOf = (message: string, context: typeof CONTEXT) =>
    initialRuleEditorState({ draft: { ...AGE, message }, context }).messageEdited;

  it('proposes in the context’s language', () => {
    expect(withProposal(AGE, CONTEXT, false).message).toBe(ENGLISH);
    expect(withProposal(AGE, CONTEXT_DE, false).message).toBe(GERMAN);
  });

  it('takes an English proposal under a German context for the proposal, and back', () => {
    expect(editedOf(ENGLISH, CONTEXT)).toBe(false);
    expect(editedOf(ENGLISH, CONTEXT_DE)).toBe(false);
    expect(editedOf(GERMAN, CONTEXT_DE)).toBe(false);
    expect(editedOf(GERMAN, CONTEXT)).toBe(false);
  });

  it('takes a written message, in either language, for the team member’s', () => {
    expect(editedOf('Only adults can apply.', CONTEXT)).toBe(true);
    expect(editedOf('Only adults can apply.', CONTEXT_DE)).toBe(true);
    expect(editedOf('Nur Erwachsene können einen Antrag stellen.', CONTEXT_DE)).toBe(true);
    expect(editedOf('', CONTEXT_DE)).toBe(false);
  });

  it('keeps a written message when the context changes', () => {
    const written = { ...AGE, message: 'Only adults can apply.' };
    expect(withProposal(written, CONTEXT_DE, true).message).toBe('Only adults can apply.');
  });
});

describe('the rule editor in German', () => {
  const TODAY = '2026-10-25';
  const resolvedDe = (document: string, field: string, part: string | null = null) => {
    const found = resolveTarget(target(document, field, part), CONTEXT_DE.documents);
    if (!found) {
      throw new Error(`${document}.${field} isn't in the test catalog`);
    }
    return found;
  };

  it('names the checks of a date as the statement does (glossary G§3)', () => {
    const labels = (dateOfBirth: boolean) =>
      checkSections('date', dateOfBirth, 'de').map((section) => [
        section.heading,
        section.choices.map((choice) => choice.label),
      ]);
    expect(labels(true)).toEqual([
      ['Zeit bis heute', ['ist mindestens', 'ist weniger als', 'ist genau']],
      ['Zeit ab heute', ['liegt mindestens', 'liegt weniger als']],
      ['Festes Datum', ['liegt vor dem', 'liegt nach dem', 'ist der']],
    ]);
    expect(labels(false)[0]).toEqual([
      'Zeit bis heute',
      ['liegt mindestens', 'liegt weniger als', 'liegt genau'],
    ]);
    // English reads the same on every date
    expect(checkSections('date', false, 'en')[0].choices.map((choice) => choice.label)).toEqual([
      'is at least',
      'is less than',
      'is exactly',
    ]);
    expect(
      checkChoiceOf({ operator: 'at_least_years_ago', years: 2 }, 'date', false, 'de')?.label
    ).toBe('liegt mindestens');
  });

  it('names the date of birth as an age in the data menu', () => {
    const labels = dataSections(PID_DE, 'de').flatMap((section) =>
      section.choices.map((choice) => choice.label)
    );
    expect(labels).toContain('Alter (Geburtsdatum)');
  });

  it('words the date notes in German, the dates as dd.mm.yyyy', () => {
    expect(
      hintsOf(
        resolvedDe('pid', 'birthdate'),
        { operator: 'at_least_years_ago', years: 21 },
        TODAY,
        'de'
      )
    ).toEqual([
      'Es zählt der Tag, an dem die antragstellende Person ihre Daten teilt. Heute (25.10.2026) bedeutet das: geboren am oder vor dem 25.10.2005.',
      'Wer an diesem Tag 21 wird, erfüllt die Regel.',
      'Fehlt das Feld „Geburtsdatum“ oder kann es nicht gelesen werden, ist die Regel nicht erfüllt. Konnekt meldet dann „konnte nicht geprüft werden“.',
    ]);
    expect(hintsOf(resolvedDe('pid', 'place_of_birth'), null, TODAY, 'de')).toEqual([
      'Das Feld „Geburtsort“ hat Bestandteile. Wählen Sie den zu prüfenden Bestandteil aus.',
    ]);
  });

  it('words a boundary in German', () => {
    expect(boundaryWords({ relation: 'on_or_after', date: '2027-04-23' }, 'Ablauf', 'de')).toBe(
      'Ablauf am oder nach dem 23.04.2027'
    );
    expect(
      boundaryWords({ relation: 'between', from: '2004-10-24', to: '2005-10-23' }, 'geboren', 'de')
    ).toBe('geboren zwischen dem 24.10.2004 und dem 23.10.2005');
    expect(boundaryWords({ relation: 'on_or_before', date: '2005-10-23' }, 'born', 'en')).toBe(
      'born on or before 23.10.2005'
    );
  });
});
