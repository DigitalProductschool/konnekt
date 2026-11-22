// The example connection (spec 010, research R7, FR-056): the fixture that
// backend/scripts/export_check_fixtures.py writes from backend/app/example.py holds the example in
// English and German as the editor loads it. In each language the rules package's validation finds
// no problem in it, the rule checks find nothing in either branch, and its two rules read as the
// spec words them (FR-055).
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  RequestedDocumentView,
  RuleItem,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import { describe, expect, it } from 'vitest';

import { buildCheckedBranch } from './checks/checkedTree';
import { checkBranch } from './checks/findings';
import type { CheckOptions } from './checks/types';
import { requestedRuleDocuments } from './conditions';
import example from './fixtures/example-connection.json';
import type { Language } from './language';
import { statementOf } from './statements';
import type { RuleContext } from './types';
import { firstProblem } from './validation';

/** One language's example: the stored draft as the editor loads it, and the catalog it needs */
interface ExampleInLanguage {
  draft: {
    name: string;
    description: string;
    documents: RequestedDocumentView[];
    branches: BranchInput[];
    next_rule_number: number;
    next_group_number: number;
    step: string;
    example: string;
  };
  document_types: DocumentType[];
  option_sets: OptionSet[];
}

const EXAMPLE: Record<Language, ExampleInLanguage> = {
  en: example.en as ExampleInLanguage,
  de: example.de as ExampleInLanguage,
};

const LANGUAGES: Language[] = ['en', 'de'];

/** A day to check on; the example's conditions are relative to it */
const TODAY = '2026-10-28';

/** A clock that never reaches the deadline */
const IN_TIME: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

/** What validation and the rule checks read: the requested documents with their requested data */
function requestedContext(language: Language): RuleContext {
  const { draft, document_types, option_sets } = EXAMPLE[language];
  return {
    documents: requestedRuleDocuments(
      document_types,
      draft.documents.map((document) => ({
        document_type: document.document_type,
        fields: document.fields.map((field) => field.key),
      }))
    ),
    optionSets: option_sets,
    language,
  };
}

/** What the rule rows read: the catalog's documents, as the rules step passes them */
function catalogContext(language: Language): RuleContext {
  const { document_types, option_sets } = EXAMPLE[language];
  return { documents: document_types, optionSets: option_sets, language };
}

/** The statements of a branch's rules, in display order */
function statementsOf(branch: BranchInput, language: Language): (string | undefined)[] {
  return branch.items.map((item) => statementOf(item as RuleItem, catalogContext(language))?.text);
}

describe('the example connection', () => {
  it.each(LANGUAGES)('is stored as the editor loads it (%s)', (language) => {
    const { draft } = EXAMPLE[language];

    expect(draft.documents.map((document) => document.document_type)).toEqual(['pid', 'mdl']);
    expect(draft.documents.map((document) => document.fields.length)).toEqual([7, 2]);
    expect(draft.branches.map((branch) => branch.origin)).toEqual(['main', 'based']);
    expect(draft.branches.every((branch) => branch.id)).toBe(true);
    expect(draft.branches.map((branch) => branch.items.map((item) => item.id))).toEqual([
      ['rule-1', 'rule-2'],
      ['rule-1', 'rule-2'],
    ]);
    expect([draft.next_rule_number, draft.next_group_number]).toEqual([3, 1]);
    expect(draft.step).toBe('connection');
    expect(draft.example).toBe('unchanged');
  });

  it.each(LANGUAGES)('has no problem for validation (%s)', (language) => {
    const { draft } = EXAMPLE[language];

    expect(firstProblem(draft.branches, requestedContext(language))).toBeNull();
  });

  it.each(LANGUAGES)('gives the rule checks no finding in any branch (%s)', (language) => {
    const { draft } = EXAMPLE[language];
    const context = requestedContext(language);

    for (const branch of draft.branches) {
      const checked = buildCheckedBranch({ ...branch, key: branch.id ?? '' }, context, TODAY);
      const result = checkBranch(checked, IN_TIME);

      expect(checked.leftOut).toEqual([]);
      expect(result).toMatchObject({
        complete: true,
        notice: null,
        findings: [],
        checkedRules: 2,
      });
    }
  });

  // The rule rows' sentences: FR-055's "Date of birth (Age) is at least 21 years old" and
  // "Licence class B – Issue date is at least 2 years ago", after the document's name
  it('reads its rules as the spec words them, in English', () => {
    const [standard, variant] = EXAMPLE.en.draft.branches;

    expect(statementsOf(standard, 'en')).toEqual([
      'Personal ID · Date of birth (Age) is at least 21 years old',
      'Driving licence · Licence class B – Issue date is at least 2 years ago',
    ]);
    expect(statementsOf(variant, 'en')).toEqual([
      'Personal ID · Date of birth (Age) is at least 19 years old',
      'Driving licence · Licence class B – Issue date is at least 1 year ago',
    ]);
  });

  it('reads its rules in German', () => {
    const [standard, variant] = EXAMPLE.de.draft.branches;

    expect(statementsOf(standard, 'de')).toEqual([
      'Personalausweis · Alter (Geburtsdatum) ist mindestens 21 Jahre alt',
      'Führerschein · Führerscheinklasse B – Ausstellungsdatum liegt mindestens 2 Jahre zurück',
    ]);
    expect(statementsOf(variant, 'de')).toEqual([
      'Personalausweis · Alter (Geburtsdatum) ist mindestens 19 Jahre alt',
      'Führerschein · Führerscheinklasse B – Ausstellungsdatum liegt mindestens 1 Jahr zurück',
    ]);
  });
});
