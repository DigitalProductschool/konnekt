import { describe, expect, it } from 'vitest';

import {
  chipNameOf,
  classesSinceOf,
  confirmAllOf,
  confirmOneOf,
  creatingAllText,
  creatingOneOf,
  dataHeadingOf,
  displayDateOf,
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

describe('testDayLineOf (FR-016, W1; spec 008 FR-024)', () => {
  it('words the day the results assume, in dd.mm.yyyy', () => {
    expect(testDayLineOf(TODAY)).toBe('Tested as if shared today, 01.11.2026.');
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

describe('resultHeadingOf (FR-015; spec 008 FR-024, U65 7057:58811)', () => {
  it.each([
    [0, 'Result: meets the rules'],
    [1, 'Result: doesn’t meet 1 rule'],
    [2, 'Result: doesn’t meet 2 rules'],
    [3, 'Result: doesn’t meet 3 rules'],
  ])('%i rules not met give "%s"', (rules, heading) => {
    expect(resultHeadingOf(rules)).toBe(heading);
  });
});

describe('noRulesNoteOf (U06)', () => {
  it('names the variant', () => {
    expect(noRulesNoteOf('School transport')).toBe(
      'School transport has no rules yet, so every citizen meets it. ' +
        'Add rules in the Rules step to test them.'
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
});

describe('the loading status (U11; design-notes §8)', () => {
  it('words a run of all three citizens', () => {
    expect(creatingAllText).toBe('Creating 3 sample citizens…');
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
});

describe('failureHintOf (FR-013, F7)', () => {
  it('says publish for a new connection and save when editing', () => {
    expect(failureHintOf(false)).toBe('Try again, or publish without testing.');
    expect(failureHintOf(true)).toBe('Try again, or save without testing.');
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
