import { describe, expect, it } from 'vitest';

import {
  ageSuffixOf,
  chipNameOf,
  confirmAllOf,
  confirmOneOf,
  creatingAllText,
  creatingOneOf,
  dataHeadingOf,
  editedHiddenText,
  failingValueHiddenText,
  failureHintOf,
  firstName,
  meetsHeadingOf,
  messageColumnOf,
  noLongerMeetsOf,
  noRulesNoteOf,
  nowMeetsOf,
  possessiveOf,
  resultHeadingOf,
  runStatusOf,
  testDayLineOf,
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

describe('testDayLineOf (FR-016, W1)', () => {
  it('words the day the results assume', () => {
    expect(testDayLineOf(TODAY)).toBe('Tested as if shared today, 1 Nov 2026.');
  });
});

describe('chipNameOf (FR-015)', () => {
  it('gives the full name with the outcome', () => {
    expect(chipNameOf(MIA, 'Standard', true)).toBe('Mia Schulz: meets the rules of Standard');
    expect(chipNameOf(MIA, 'Standard', false)).toBe(
      'Mia Schulz: doesn’t meet the rules of Standard'
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
});

describe('the panel and result headings (FR-004, FR-015)', () => {
  it('uses the first name', () => {
    expect(dataHeadingOf(MIA)).toBe('Mia’s data');
    expect(meetsHeadingOf(MIA)).toBe('Rules Mia meets');
    expect(messageColumnOf(MIA)).toBe('Message Mia reads');
  });
});

describe('resultHeadingOf (FR-015, W10; design-notes §6.3)', () => {
  it.each([
    [0, 0, 'Result: meets the rules'],
    [1, 0, 'Result: doesn’t meet 1 rule'],
    [2, 0, 'Result: doesn’t meet 2 rules'],
    [1, 1, 'Result: doesn’t meet 1 rule and 1 group'],
    [0, 1, 'Result: doesn’t meet 1 group'],
    [0, 2, 'Result: doesn’t meet 2 groups'],
    [2, 3, 'Result: doesn’t meet 2 rules and 3 groups'],
  ])('%i rules and %i groups give "%s"', (rules, groups, heading) => {
    expect(resultHeadingOf({ rules, groups })).toBe(heading);
  });
});

describe('noRulesNoteOf (U06)', () => {
  it('names the variant', () => {
    expect(noRulesNoteOf('School transport')).toBe(
      'School transport has no rules yet, so every applicant meets it. ' +
        'Add rules in the Rules step to test them.'
    );
  });
});

describe('confirmOneOf and confirmAllOf (FR-012, W9; design-notes §7)', () => {
  it('asks about one persona by its first name', () => {
    expect(confirmOneOf(MIA)).toEqual({
      title: 'Generate new data for Mia?',
      body: 'Your changes to Mia’s data will be replaced. The other two applicants stay as they are.',
    });
  });

  it('names every persona with changes, in the given order', () => {
    const title = 'Generate new data for all applicants?';
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
});

describe('the loading status (U11; design-notes §8)', () => {
  it('words a run of all three applicants', () => {
    expect(creatingAllText).toBe('Creating 3 sample applicants…');
    expect(runStatusOf([MIA, ANNA, YUSUF], [])).toBe('Creating 3 sample applicants…');
  });

  it('words a run of one or two applicants', () => {
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
});

describe('failureHintOf (FR-013, F7)', () => {
  it('says publish for a new connection and save when editing', () => {
    expect(failureHintOf(false)).toBe('Try again, or publish without testing.');
    expect(failureHintOf(true)).toBe('Try again, or save without testing.');
  });
});

describe('ageSuffixOf (FR-007, F10; design-notes §4.1)', () => {
  it('gives the age today', () => {
    expect(ageSuffixOf('2007-07-08', TODAY)).toBe(' (age 19)');
    expect(ageSuffixOf('2026-11-01', TODAY)).toBe(' (age 0)');
  });

  it('says not born yet for a future date', () => {
    expect(ageSuffixOf('2030-01-01', TODAY)).toBe(' (not born yet)');
    expect(ageSuffixOf('2026-11-02', TODAY)).toBe(' (not born yet)');
  });

  it('is empty without a date', () => {
    expect(ageSuffixOf(null, TODAY)).toBe('');
    expect(ageSuffixOf('', TODAY)).toBe('');
    expect(ageSuffixOf(undefined, TODAY)).toBe('');
  });
});

describe('announcements (FR-017)', () => {
  it('uses the full name', () => {
    expect(nowMeetsOf(MIA, 'Standard')).toBe('Mia Schulz now meets the rules of Standard.');
    expect(noLongerMeetsOf(MIA, 'Standard')).toBe(
      'Mia Schulz no longer meets the rules of Standard.'
    );
  });
});

describe('hidden texts (K1, K2; design-notes §4.2)', () => {
  it('marks a failing and a changed value', () => {
    expect(failingValueHiddenText).toBe('Fails a rule:');
    expect(editedHiddenText).toBe(', edited');
  });
});
