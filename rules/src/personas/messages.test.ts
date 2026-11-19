import { describe, expect, it } from 'vitest';

import {
  chipNameOf,
  classesSinceOf,
  confirmAllOf,
  confirmOneOf,
  creatingAllTextOf,
  creatingOneOf,
  dataHeadingOf,
  displayDateOf,
  editedHiddenTextOf,
  failingValueHiddenTextOf,
  failureHintOf,
  firstName,
  noLongerMeetsOf,
  noRulesNoteOf,
  nowMeetsOf,
  outcomeNameOf,
  possessiveOf,
  resultHeadingOf,
  runStatusOf,
  testDayLineOf,
  validUntilOf,
} from './messages';
import type { Persona } from './types';

/** A persona; only the name matters here */
function persona(name: string): Persona {
  return { id: 'persona-1', name, values: {}, generated: {}, status: 'ready' };
}

const MIA = persona('Mia Schulz');
const ANNA = persona('Anna Weber');
const YUSUF = persona('Yusuf Demir');
const TODAY = '2026-11-01';

describe('testDayLineOf (FR-016, W1; spec 008 FR-024; test-results-v5 R1)', () => {
  it('words the day the results assume, in dd.mm.yyyy, without a full stop (V5 7599:61800)', () => {
    expect(testDayLineOf(TODAY)).toBe('Tested as if shared today, 01.11.2026');
  });

  it('words it in German, the date still dd.mm.yyyy (glossary §2 "today in Germany")', () => {
    expect(testDayLineOf(TODAY, 'de')).toBe(
      'Getestet, als würden die Daten heute geteilt: 01.11.2026'
    );
  });
});

describe('displayDateOf (spec 008 FR-024)', () => {
  it('writes YYYY-MM-DD as dd.mm.yyyy', () => {
    expect(displayDateOf('2007-07-08')).toBe('08.07.2007');
    expect(displayDateOf('0001-01-01')).toBe('01.01.0001');
  });

  it('leaves anything else unchanged', () => {
    expect(displayDateOf('')).toBe('');
    expect(displayDateOf('08.07.2007')).toBe('08.07.2007');
    expect(displayDateOf('2007-7-8')).toBe('2007-7-8');
  });
});

describe('the data card’s formats (spec 008 FR-024, CLAR #46)', () => {
  it('writes an expiry date as "Valid until <date>"', () => {
    expect(validUntilOf('2040-08-19')).toBe('Valid until 19.08.2040');
  });

  it('writes the classes of one issue date with "since", without years', () => {
    expect(classesSinceOf('B, BE', '2010-05-02')).toBe('B, BE since 02.05.2010');
    expect(classesSinceOf('B', '2025-08-20')).toBe('B since 20.08.2025');
  });

  it('writes classes without an issue date alone', () => {
    expect(classesSinceOf('AM', null)).toBe('AM');
  });

  it('writes them in German, the dates still dd.mm.yyyy', () => {
    expect(validUntilOf('2040-08-19', 'de')).toBe('Gültig bis 19.08.2040');
    expect(classesSinceOf('B, BE', '2010-05-02', 'de')).toBe('B, BE seit 02.05.2010');
    expect(classesSinceOf('AM', null, 'de')).toBe('AM');
  });
});

describe('chipNameOf (FR-015)', () => {
  it('gives the full name with the outcome', () => {
    expect(chipNameOf(MIA, 'Standard', true)).toBe('Mia Schulz: meets the rules of Standard');
    expect(chipNameOf(MIA, 'Standard', false)).toBe(
      'Mia Schulz: doesn’t meet the rules of Standard'
    );
  });

  it('gives them in German, the names unchanged (glossary §3 "persona chips")', () => {
    expect(chipNameOf(MIA, 'Standard', true, 'de')).toBe(
      'Mia Schulz: erfüllt die Regeln von Standard'
    );
    expect(chipNameOf(MIA, 'Standard', false, 'de')).toBe(
      'Mia Schulz: erfüllt die Regeln von Standard nicht'
    );
  });
});

describe('firstName and possessiveOf (design-notes §1.1)', () => {
  it('takes the trimmed name up to its first space', () => {
    expect(firstName(MIA)).toBe('Mia');
    expect(firstName(persona('Mia'))).toBe('Mia');
    expect(firstName(persona('  Anna-Lena Roth '))).toBe('Anna-Lena');
  });

  it('always adds ’s, also after an s', () => {
    expect(possessiveOf('Mia')).toBe('Mia’s');
    expect(possessiveOf('Jonas')).toBe('Jonas’s');
    expect(dataHeadingOf(persona('Hans Maier'))).toBe('Hans’s data');
  });

  it('has no genitive in German: "von" after the noun', () => {
    expect(possessiveOf('Mia', 'de')).toBe('von Mia');
    expect(possessiveOf('Jonas', 'de')).toBe('von Jonas');
    expect(dataHeadingOf(persona('Hans Maier'), 'de')).toBe('Daten von Hans');
  });
});

describe('the panel heading (FR-004)', () => {
  it('uses the first name', () => {
    expect(dataHeadingOf(MIA)).toBe('Mia’s data');
  });

  it('uses the first name in German (glossary §2 "message")', () => {
    expect(dataHeadingOf(MIA, 'de')).toBe('Daten von Mia');
  });
});

describe('resultHeadingOf (FR-015; spec 008 FR-024, U65 7057:58811)', () => {
  it.each([
    [0, 'Result: meets the rules'],
    [1, 'Result: doesn’t meet 1 rule'],
    [2, 'Result: doesn’t meet 2 rules'],
    [3, 'Result: doesn’t meet 3 rules'],
  ])('%i rules not met give "%s"', (rules, heading) => {
    expect(resultHeadingOf(rules)).toBe(heading);
  });

  it.each([
    [0, 'Ergebnis: erfüllt alle Regeln'],
    [1, 'Ergebnis: erfüllt 1 Regel nicht'],
    [2, 'Ergebnis: erfüllt 2 Regeln nicht'],
    [3, 'Ergebnis: erfüllt 3 Regeln nicht'],
  ])('%i rules not met give "%s" in German', (rules, heading) => {
    expect(resultHeadingOf(rules, 'de')).toBe(heading);
  });
});

describe('outcomeNameOf (FR-015; glossary §2 "meets / doesn’t meet")', () => {
  it('names the outcomes of rows that are not met', () => {
    expect(outcomeNameOf('not_met')).toBe('Not met');
    expect(outcomeNameOf('not_checked')).toBe('Couldn’t be checked');
  });

  it('names them in German', () => {
    expect(outcomeNameOf('not_met', 'de')).toBe('Nicht erfüllt');
    expect(outcomeNameOf('not_checked', 'de')).toBe('Konnte nicht geprüft werden');
  });
});

describe('noRulesNoteOf (U06)', () => {
  it('names the variant', () => {
    expect(noRulesNoteOf('School transport')).toBe(
      'School transport has no rules yet, so every citizen meets it. ' +
        'Add rules in the Rules step to test them.'
    );
  });

  it('names the variant in German', () => {
    expect(noRulesNoteOf('School transport', 'de')).toBe(
      'School transport hat noch keine Regeln und wird daher von allen erfüllt. ' +
        'Fügen Sie im Schritt „Regeln“ Regeln hinzu, um sie zu testen.'
    );
  });
});

describe('confirmOneOf and confirmAllOf (FR-012, W9; design-notes §7)', () => {
  it('asks about one persona by its first name', () => {
    expect(confirmOneOf(MIA)).toEqual({
      title: 'Generate new data for Mia?',
      body: 'Your changes to Mia’s data will be replaced. The other two citizens stay as they are.',
    });
  });

  it('names every persona with changes, in the given order', () => {
    const title = 'Generate new data for all citizens?';
    expect(confirmAllOf([MIA])).toEqual({
      title,
      body: 'Your changes to Mia’s data will be replaced.',
    });
    expect(confirmAllOf([MIA, ANNA])).toEqual({
      title,
      body: 'Your changes to Mia’s and Anna’s data will be replaced.',
    });
    expect(confirmAllOf([MIA, ANNA, YUSUF]).body).toBe(
      'Your changes to Mia’s, Anna’s and Yusuf’s data will be replaced.'
    );
    expect(confirmAllOf([persona('Jonas Beck'), MIA]).body).toBe(
      'Your changes to Jonas’s and Mia’s data will be replaced.'
    );
  });

  it('repeats a shared first name as it is', () => {
    expect(confirmAllOf([MIA, persona('Mia Roth')]).body).toBe(
      'Your changes to Mia’s and Mia’s data will be replaced.'
    );
  });

  it('asks in German, without a genitive', () => {
    expect(confirmOneOf(MIA, 'de')).toEqual({
      title: 'Neue Daten für Mia erstellen?',
      body:
        'Ihre Änderungen an den Daten von Mia werden ersetzt. ' +
        'Die beiden anderen Beispielpersonen bleiben unverändert.',
    });
    const title = 'Neue Daten für alle Beispielpersonen erstellen?';
    expect(confirmAllOf([MIA], 'de')).toEqual({
      title,
      body: 'Ihre Änderungen an den Daten von Mia werden ersetzt.',
    });
    expect(confirmAllOf([MIA, ANNA], 'de').body).toBe(
      'Ihre Änderungen an den Daten von Mia und Anna werden ersetzt.'
    );
    expect(confirmAllOf([MIA, ANNA, YUSUF], 'de').body).toBe(
      'Ihre Änderungen an den Daten von Mia, Anna und Yusuf werden ersetzt.'
    );
    expect(confirmAllOf([MIA, persona('Mia Roth')], 'de').body).toBe(
      'Ihre Änderungen an den Daten von Mia und Mia werden ersetzt.'
    );
  });
});

describe('the loading status (U11; design-notes §8)', () => {
  it('words a run of all three citizens', () => {
    expect(creatingAllTextOf('en')).toBe('Creating 3 sample citizens…');
    expect(runStatusOf([MIA, ANNA, YUSUF], [])).toBe('Creating 3 sample citizens…');
  });

  it('words a run of one or two citizens', () => {
    expect(creatingOneOf(MIA)).toBe('Creating new data for Mia…');
    expect(runStatusOf([MIA, ANNA], [])).toBe('Creating new data for Mia and Anna…');
  });

  it('words a fill run', () => {
    expect(runStatusOf([], [MIA])).toBe('Adding new data for Mia…');
    expect(runStatusOf([], [MIA, ANNA])).toBe('Adding new data for Mia and Anna…');
    expect(runStatusOf([], [MIA, ANNA, YUSUF])).toBe('Adding new data for Mia, Anna and Yusuf…');
  });

  it('words a merged run with free and filled slots', () => {
    expect(runStatusOf([YUSUF], [MIA])).toBe(
      'Creating new data for Yusuf. Adding new data for Mia…'
    );
  });

  it('is empty without a run', () => {
    expect(runStatusOf([], [])).toBe('');
  });

  it('words every run in German (glossary §2 "sample citizen")', () => {
    expect(creatingAllTextOf('de')).toBe('3 Beispielpersonen werden erstellt …');
    expect(runStatusOf([MIA, ANNA, YUSUF], [], 'de')).toBe('3 Beispielpersonen werden erstellt …');
    expect(creatingOneOf(MIA, 'de')).toBe('Neue Daten für Mia werden erstellt …');
    expect(runStatusOf([MIA, ANNA], [], 'de')).toBe(
      'Neue Daten für Mia und Anna werden erstellt …'
    );
    expect(runStatusOf([], [MIA, ANNA, YUSUF], 'de')).toBe(
      'Neue Daten für Mia, Anna und Yusuf werden ergänzt …'
    );
    expect(runStatusOf([YUSUF], [MIA], 'de')).toBe(
      'Neue Daten für Yusuf werden erstellt. Neue Daten für Mia werden ergänzt …'
    );
    expect(runStatusOf([], [], 'de')).toBe('');
  });
});

describe('failureHintOf (FR-013, F7)', () => {
  it('says publish for a new connection and save when editing', () => {
    expect(failureHintOf(false)).toBe('Try again, or publish without testing.');
    expect(failureHintOf(true)).toBe('Try again, or save without testing.');
  });

  it('says it in German', () => {
    expect(failureHintOf(false, 'de')).toBe(
      'Versuchen Sie es erneut oder veröffentlichen Sie, ohne zu testen.'
    );
    expect(failureHintOf(true, 'de')).toBe(
      'Versuchen Sie es erneut oder speichern Sie, ohne zu testen.'
    );
  });
});

describe('announcements (FR-017)', () => {
  it('uses the full name', () => {
    expect(nowMeetsOf(MIA, 'Standard')).toBe('Mia Schulz now meets the rules of Standard.');
    expect(noLongerMeetsOf(MIA, 'Standard')).toBe(
      'Mia Schulz no longer meets the rules of Standard.'
    );
  });

  it('uses the full name in German', () => {
    expect(nowMeetsOf(MIA, 'Standard', 'de')).toBe(
      'Mia Schulz erfüllt jetzt die Regeln von Standard.'
    );
    expect(noLongerMeetsOf(MIA, 'Standard', 'de')).toBe(
      'Mia Schulz erfüllt die Regeln von Standard nicht mehr.'
    );
  });
});

describe('hidden texts (K1, K2; design-notes §4.2)', () => {
  it('marks a failing and a changed value', () => {
    expect(failingValueHiddenTextOf('en')).toBe('Fails a rule:');
    expect(editedHiddenTextOf('en')).toBe(', edited');
  });

  it('marks them in German', () => {
    expect(failingValueHiddenTextOf('de')).toBe('Erfüllt eine Regel nicht:');
    expect(editedHiddenTextOf('de')).toBe(', bearbeitet');
  });
});
