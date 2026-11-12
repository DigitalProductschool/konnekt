import type {
  FormConnectionDraft,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { Language } from '@connection-portal/rules/language';
import type { RulesProblemCode } from '@connection-portal/rules/types';
import { publishProblems } from '@connection-portal/rules/validation';
import { describe, expect, it } from 'vitest';

import { DOCUMENTS_COPY } from '../../pages/FormConnectionEditor/DocumentsStep/constants';
import { PDF_TEXTS } from './constants';
import { gapsOf, missingOf, type RuleProblemCode } from './gaps';
import { SAMPLE_DRAFT, SAMPLE_DRAFT_GAPS, SAMPLE_PUBLISHED, sampleRuleContext } from './testData';

const LANGUAGES: Language[] = ['en', 'de'];

/** The gaps' texts of a draft, with validation's context from the draft in `language` */
function gapTextsOf(draft: FormConnectionDraft, language: Language): string[] {
  return gapsOf(draft, sampleRuleContext(draft, language), language).map((gap) => gap.text);
}

/** `publishProblems()`'s messages for a draft in `language` */
function problemTextsOf(draft: FormConnectionDraft, language: Language): string[] {
  return publishProblems(draft.branches, sampleRuleContext(draft, language)).map(
    (problem) => problem.message
  );
}

/** A copy of D to change */
function draftD(): FormConnectionDraft {
  return structuredClone(SAMPLE_DRAFT);
}

/** A copy of C to change */
function draftC(): FormConnectionDraft {
  return structuredClone(SAMPLE_DRAFT_GAPS);
}

/** D with Standard alone and without rules: only the connection's own gaps can show */
function withoutRules(): FormConnectionDraft {
  const draft = draftD();
  draft.branches = [{ ...draft.branches[0], items: [] }];
  return draft;
}

function ruleOf(items: RuleTreeItem[], id: string): RuleItem {
  const found = items.find((item) => item.id === id);
  if (found?.type !== 'rule') {
    throw new Error(`no rule ${id}`);
  }
  return found;
}

describe('gapsOf', () => {
  it.each(LANGUAGES)('finds none for A and D (%s)', (language) => {
    expect(
      gapsOf(SAMPLE_PUBLISHED, sampleRuleContext(SAMPLE_PUBLISHED, language), language)
    ).toEqual([]);
    expect(gapTextsOf(SAMPLE_DRAFT, language)).toEqual([]);
    expect(gapTextsOf(withoutRules(), language)).toEqual([]);
  });

  it('finds exactly C’s two gaps, in English', () => {
    expect(gapsOf(SAMPLE_DRAFT_GAPS, sampleRuleContext(SAMPLE_DRAFT_GAPS, 'en'), 'en')).toEqual([
      { text: 'Licence class B in Hire car has no error message.' },
      { text: 'Licence still valid in Hire car: choose a check.' },
    ]);
  });

  it('finds exactly C’s two gaps, in German', () => {
    expect(gapTextsOf(SAMPLE_DRAFT_GAPS, 'de')).toEqual([
      'Licence class B in Hire car hat keine Fehlermeldung.',
      'Licence still valid in Hire car: Wählen Sie eine Prüfung.',
    ]);
  });

  it('words the gaps in its language, whatever the context’s', () => {
    const englishContext = sampleRuleContext(SAMPLE_DRAFT_GAPS, 'en');
    expect(gapsOf(SAMPLE_DRAFT_GAPS, englishContext, 'de').map((gap) => gap.text)).toEqual(
      gapTextsOf(SAMPLE_DRAFT_GAPS, 'de')
    );
  });

  it('finds a missing name, in the create flow’s words', () => {
    const draft = withoutRules();
    draft.name = '   ';
    expect(gapTextsOf(draft, 'en')).toEqual(['Enter a name for the connection.']);
    expect(gapTextsOf(draft, 'de')).toEqual(['Geben Sie einen Namen für die Anbindung ein.']);
  });

  it('finds a name and a description too long, counting characters as the server does', () => {
    const draft = withoutRules();
    draft.name = '😀'.repeat(200);
    draft.description = ` ${'é'.repeat(500)} `;
    expect(gapTextsOf(draft, 'en')).toEqual([]);
    draft.name = 'n'.repeat(201);
    draft.description = 'd'.repeat(501);
    expect(gapTextsOf(draft, 'en')).toEqual([
      'The name can have at most 200 characters.',
      'The description can have at most 500 characters.',
    ]);
    expect(gapTextsOf(draft, 'de')).toEqual([
      'Der Name darf höchstens 200 Zeichen lang sein.',
      'Die Beschreibung darf höchstens 500 Zeichen lang sein.',
    ]);
  });

  it('finds no documents, in the server’s words', () => {
    const draft = withoutRules();
    draft.documents = [];
    expect(gapTextsOf(draft, 'en')).toEqual(['Add at least one document.']);
    expect(gapTextsOf(draft, 'de')).toEqual(['Fügen Sie mindestens ein Dokument hinzu.']);
  });

  it('finds each document without data items, naming it', () => {
    const draft = withoutRules();
    draft.documents = draft.documents.map((document) => ({ ...document, fields: [] }));
    expect(gapTextsOf(draft, 'en')).toEqual([
      'Personal ID: Choose at least one data item, or remove this document.',
      'Driving licence: Choose at least one data item, or remove this document.',
    ]);
    const german = draftD();
    german.branches = [{ ...german.branches[0], items: [] }];
    german.documents = [{ ...german.documents[1], label: 'Führerschein', fields: [] }];
    expect(gapTextsOf(german, 'de')).toEqual([`Führerschein: ${DOCUMENTS_COPY.de.needsDataLine}`]);
    expect(DOCUMENTS_COPY.de.needsDataLine).toBe(
      'Wählen Sie mindestens ein Feld aus oder entfernen Sie dieses Dokument.'
    );
  });

  it('lists the connection’s own gaps first, then every problem of publishProblems() in its order', () => {
    const draft = draftC();
    draft.name = '';
    draft.documents = [draft.documents[0], { ...draft.documents[1], fields: [] }];
    for (const language of LANGUAGES) {
      const texts = gapTextsOf(draft, language);
      const problems = problemTextsOf(draft, language);
      expect(problems.length).toBeGreaterThan(2);
      expect(texts).toEqual([
        language === 'en'
          ? 'Enter a name for the connection.'
          : 'Geben Sie einen Namen für die Anbindung ein.',
        `${draft.documents[1].label}: ${DOCUMENTS_COPY[language].needsDataLine}`,
        ...problems,
      ]);
    }
  });

  it('lists each kind of the rules’ problems in the server’s words, naming rule and variant', () => {
    const draft = draftD();
    const [standard, taxi, hireCar] = draft.branches;
    ruleOf(standard.items, 'rule-1').message = '';
    ruleOf(standard.items, 'rule-2').target = null;
    ruleOf(standard.items, 'rule-5').message = 'm'.repeat(501);
    ruleOf(hireCar.items, 'rule-10').name = '';
    ruleOf(hireCar.items, 'rule-11').condition = { operator: 'includes_one_of', values: [] };
    taxi.description = 'd'.repeat(501);
    expect(gapTextsOf(draft, 'en')).toEqual([
      'Minimum age in Standard has no error message.',
      'Licence class B in Standard: choose the data to check.',
      'The error message of Licence still valid in Standard can have at most 500 characters.',
      'The description of Taxi can have at most 500 characters.',
      'Enter a name for every rule in Hire car.',
      'Licence class B in Hire car: choose at least one value.',
    ]);
    expect(gapTextsOf(draft, 'de')).toEqual(problemTextsOf(draft, 'de'));
  });

  it('lists rules on data that is no longer requested', () => {
    const draft = draftD();
    draft.documents = [draft.documents[0]];
    const texts = gapTextsOf(draft, 'en');
    expect(texts).toContain('Licence class B in Standard checks data that’s no longer requested.');
    expect(texts).toEqual(problemTextsOf(draft, 'en'));
  });

  // UNCERTAIN (carried from T016): a variant without a name keeps its own problem, but its items'
  // problems, whose messages would name an empty variant ("… in : …"), are left out
  it('leaves out the items’ problems of a variant without a name, and keeps the others', () => {
    const draft = draftC();
    draft.branches[2].name = '  ';
    ruleOf(draft.branches[0].items, 'rule-1').message = '';
    expect(problemTextsOf(draft, 'en')).toContain('Licence class B in  has no error message.');
    expect(gapTextsOf(draft, 'en')).toEqual([
      'Minimum age in Standard has no error message.',
      'Enter a name for every variant.',
    ]);
    expect(gapTextsOf(draft, 'de')).toEqual([
      'Minimum age in Standard hat keine Fehlermeldung.',
      'Geben Sie für jede Variante einen Namen ein.',
    ]);
  });

  it('keeps the items’ problems of a variant whose own problem is another', () => {
    const draft = draftC();
    draft.branches[2].description = 'd'.repeat(501);
    expect(gapTextsOf(draft, 'en')).toEqual([
      'The description of Hire car can have at most 500 characters.',
      'Licence class B in Hire car has no error message.',
      'Licence still valid in Hire car: choose a check.',
    ]);
  });

  it('never lists a rule check’s finding (FR-041)', () => {
    // A second rule on the same data with the same check: the checks find it redundant,
    // publishing accepts it
    const draft = draftD();
    const standard = draft.branches[0];
    standard.items = [
      ...standard.items,
      { ...ruleOf(standard.items, 'rule-1'), id: 'rule-13', name: 'Minimum age again' },
    ];
    draft.next_rule_number = 14;
    expect(problemTextsOf(draft, 'en')).toEqual([]);
    expect(gapTextsOf(draft, 'en')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------

/** Every code a rule's problem can have, with what its instruction reads; null for a name's */
const EXPECTED: Record<RuleProblemCode, { en: string | null; de: string | null }> = {
  itemNameMissing: { en: null, de: null },
  itemNameTooLong: { en: null, de: null },
  nameTaken: { en: null, de: null },
  nameReserved: { en: null, de: null },
  chooseData: { en: 'Choose the data to check.', de: 'Wählen Sie die zu prüfenden Daten.' },
  notRequested: {
    en: 'Add the data again in Documents, or edit or delete the rule.',
    de: 'Fügen Sie die Daten im Schritt „Dokumente“ wieder hinzu oder bearbeiten oder löschen Sie die Regel.',
  },
  unknownPart: { en: 'Choose the data to check.', de: 'Wählen Sie die zu prüfenden Daten.' },
  choose_check: { en: 'Choose a check.', de: 'Wählen Sie eine Prüfung.' },
  enter_number: { en: 'Enter a number.', de: 'Geben Sie eine Zahl ein.' },
  enter_text: {
    en: 'Enter a text to compare with.',
    de: 'Geben Sie einen Text zum Vergleichen ein.',
  },
  choose_value: { en: 'Choose at least one value.', de: 'Wählen Sie mindestens einen Wert.' },
  values_from_list: { en: 'Choose values from the list.', de: 'Wählen Sie Werte aus der Liste.' },
  value_once: { en: 'Choose each value only once.', de: 'Wählen Sie jeden Wert nur einmal.' },
  enter_date: { en: 'Enter a date.', de: 'Geben Sie ein Datum ein.' },
  years_at_least_1: {
    en: 'Enter a number of years of at least 1.',
    de: 'Geben Sie mindestens 1 Jahr ein.',
  },
  choose_unit: { en: 'Choose years or months.', de: 'Wählen Sie Jahre oder Monate.' },
  amount_at_least_1: {
    en: 'Enter a number of years of at least 1.',
    de: 'Geben Sie mindestens 1 Jahr ein.',
  },
  noMessage: {
    en: 'Write the message for citizens.',
    de: 'Schreiben Sie die Nachricht für Bürgerinnen und Bürger.',
  },
  messageTooLong: {
    en: 'Shorten the message for citizens to at most 500 characters.',
    de: 'Kürzen Sie die Nachricht für Bürgerinnen und Bürger auf höchstens 500 Zeichen.',
  },
};

const RULE_CODES = Object.keys(EXPECTED) as RuleProblemCode[];

describe('missingOf', () => {
  it('maps every code a rule can have: 4 of its name, 15 of its content', () => {
    expect(RULE_CODES).toHaveLength(19);
    for (const language of LANGUAGES) {
      for (const code of RULE_CODES) {
        expect([code, missingOf({ code }, language)]).toEqual([code, EXPECTED[code][language]]);
      }
    }
  });

  it('gives each content code an instruction with a capital letter and a full stop', () => {
    for (const language of LANGUAGES) {
      for (const code of RULE_CODES) {
        const text = missingOf({ code }, language);
        if (text !== null) {
          expect(text).toMatch(/^\p{Lu}.*\.$/u);
        }
      }
    }
  });

  it('reuses the create flow’s and the PDF’s texts', () => {
    expect(missingOf({ code: 'noMessage' }, 'de')).toBe(PDF_TEXTS.de.writeMessage);
    expect(missingOf({ code: 'chooseData' }, 'en')).toBe(PDF_TEXTS.en.chooseData);
  });

  it('names the unit of an amount of months', () => {
    const months = { operator: 'at_least_from_now', amount: 0, unit: 'months' as const };
    expect(missingOf({ code: 'amount_at_least_1' }, 'en', months)).toBe(
      'Enter a number of months of at least 1.'
    );
    expect(missingOf({ code: 'amount_at_least_1' }, 'de', months)).toBe(
      'Geben Sie mindestens 1 Monat ein.'
    );
  });

  it('gives null for a code no rule has', () => {
    const others: RulesProblemCode[] = [
      'tooManyBranches',
      'mainBranch',
      'branchNameMissing',
      'descriptionTooLong',
      'invalidIdentifier',
      'rulesOnly',
      'tooFewMembers',
      'unknownVariant',
    ];
    for (const code of others) {
      expect(missingOf({ code }, 'en')).toBeNull();
    }
  });

  it.each(LANGUAGES)('reads C’s two rules’ instructions (%s)', (language) => {
    const problems = publishProblems(
      SAMPLE_DRAFT_GAPS.branches,
      sampleRuleContext(SAMPLE_DRAFT_GAPS, language)
    );
    expect(problems.map((problem) => problem.itemId)).toEqual(['rule-11', 'rule-12']);
    expect(problems.map((problem) => missingOf(problem, language))).toEqual(
      language === 'en'
        ? ['Write the message for citizens.', 'Choose a check.']
        : ['Schreiben Sie die Nachricht für Bürgerinnen und Bürger.', 'Wählen Sie eine Prüfung.']
    );
  });
});
