// The words and sentence templates of the rule checks' finding texts in both languages (spec 009,
// research R4; contracts/rules-texts.md "Texts as tables"; glossary §2, §3), which
// `findingMessages.ts` composes. The English column is spec 008's copy, word for word (FR-014);
// the German one follows the glossary: German structure per template, explicit `one` / `other`
// forms instead of an appended "s", the fragment `contradict` that the banner's composer slices on
// in each language, " und " / " oder ", and stored names ("Rule 02", "Standard", variant names)
// inserted unchanged. Pure: no text here is logged, stored or sent (CLAUDE.md "Findings")
import { defineTexts } from '../language';
import type { BannerPart, ItemFindingKind } from './types';

/** What a finding calls an item: a rule, or a group or sub-group */
export type FindingNoun = 'rule' | 'group';

/** A word's forms by count: `one` for 1, `other` for any other count */
export interface PluralForms {
  one: string;
  other: string;
}

/** A banner line's beginning, capitalised as it starts a sentence or lower case after a colon */
interface CaseForms {
  capital: string;
  lower: string;
}

/** The texts of one language. `moment` is `atTheMoment` or '' */
export interface FindingTexts {
  /** The visually hidden text of a kind's icon (A3, W19) */
  kinds: Record<ItemFindingKind, string>;
  /** A list's last joint (W3) */
  conjunctions: { and: string; or: string };
  /** The counts row's last joint (spec 008 C4) */
  countsAnd: string;
  /** Ends a sentence that holds only for citizens who share today (FR-008, A7) */
  atTheMoment: string;
  /** What items that can't be met together do; the banner's composer slices on it */
  contradict: string;

  // Pieces of a group's own conflict
  /** "<members> in <place>" */
  inPlace: (place: BannerPart) => BannerPart[];
  /** The place of a note: the group itself */
  thisGroupPlace: string;
  /** After a single member */
  cannotBeMet: (moment: string) => string;
  /** Neither … nor …, and none of …, in an OR group */
  neither: CaseForms;
  nor: string;
  noneOf: CaseForms;
  canBeMet: (moment: string) => string;

  // Nouns of an item without a current name, and of the item a note is on
  thisNoun: Record<FindingNoun, string>;
  /** As the subject or the object of a sentence */
  anotherNoun: Record<FindingNoun, string>;
  /** After "the same as" (German "identisch mit", which takes the dative) */
  anotherNounDative: Record<FindingNoun, string>;
  /** As the object of a resolution */
  theNoun: Record<FindingNoun, string>;
  /** Items without a current name, as the subject or the object of a sentence */
  otherRules: string;
  /** Items without a current name, after "with" or "of" */
  otherRulesDative: string;

  // Notes (design-notes.md §2)
  cannotBeMetTogetherWith: (items: string, moment: string) => string;
  groupCannotBeMet: (moment: string) => string;
  ruleNoCitizenCanMeet: (moment: string) => string;
  sameAsNote: (other: string) => string;
  youCanDeleteThe: Record<FindingNoun, string>;
  everyCitizenMeetsThis: Record<FindingNoun, string>;
  /** A covered item that every citizen meets: "Every citizen meets <self> or Group 03." */
  everyCitizenMeets: (met: BannerPart[]) => BannerPart[];
  /** A covered item: "Anyone who meets <given> also meets <met>." */
  anyoneWhoMeets: (given: BannerPart[], met: BannerPart[]) => BannerPart[];

  // Resolutions for agents (spec 007, research R14)
  changeOrDeleteOneOf: (items: string, moment: string) => string;
  changeOrDeleteCannotBeMet: (item: string, moment: string) => string;
  changeOneOfOr: (items: string, item: string, moment: string) => string;
  changeOrDeleteNoCitizen: (item: string, moment: string) => string;
  /** `one`: what covers it is a single named item */
  youCanDeleteCovered: (item: string, covering: string, one: boolean) => string;
  alwaysMetResolution: (item: string) => string;
  alwaysMetResolutionUnnamed: Record<FindingNoun, string>;
  loosenOrDelete: (moment: string) => string;
  addRuleOrStricter: string;

  // Notices and the incomplete check (design-notes.md §3.2)
  noneCanMeetRules: (branchName: string) => string;
  noneCanMeetRulesToday: (branchName: string) => string;
  allMeetRules: (branchName: string) => string;
  soNoneCanMeetRules: (branchName: string) => string;
  incomplete: (branchName: string) => string;
  incompleteAfterCounts: string;

  // The counts row (design-notes.md §3.4)
  countNouns: Record<FindingNoun, PluralForms>;
  countContradict: PluralForms;
  countCannotBeMet: PluralForms;
  countDuplicate: PluralForms;
  countCovered: PluralForms;
  countAlwaysMet: PluralForms;

  // The banner's lines (design-notes.md §3.1)
  conditionLine: (item: BannerPart, moment: string) => BannerPart[];
  alwaysMetLine: (item: BannerPart) => BannerPart[];
  sameLine: (item: BannerPart, other: BannerPart) => BannerPart[];
  /** A conflict's line and the notice in one sentence (spec 008 C4), after `contradict` */
  soNoneCanMeetAppended: (rightNow: boolean, branchName: string) => string;

  // The tab (design-notes.md §4)
  tabLabel: (branchName: string) => string;
  /** What the tab's tooltip says before a branch's only line (W20) */
  oneLineLabels: { conflict: string; duplicate: string; finding: string };

  // The publish and save dialog (design-notes.md §6), after "<variant>: "
  dialogNoneCanMeet: string;
  dialogNoneCanMeetToday: string;
  dialogAllMeet: string;

  // Announcements (design-notes.md §5)
  conflictsWith: (item: string, items: string, moment: string) => string;
  noneCanMeetItem: (item: string) => string;
  noneCanMeetItemToday: (item: string) => string;
  noLongerConflictsWith: (item: string, items: string) => string;
  noLongerConflicting: (item: string) => string;
  isTheSameAs: (item: string, other: string) => string;
  makesNoDifference: (item: string, items: string) => string;
  noLongerRedundant: (item: string) => string;
  everyCitizenMeetsItem: (item: string) => string;
  noLongerAlwaysMet: (item: string) => string;
  /** A finding in a variant other than the one shown */
  inBranch: (branchName: string, sentence: string) => string;
}

export const FINDING_TEXTS = defineTexts<FindingTexts>(
  {
    kinds: { conflicting: 'Conflicting:', redundant: 'Redundant:', always_met: 'Always met:' },
    conjunctions: { and: ' and ', or: ' or ' },
    countsAnd: ', and ',
    atTheMoment: ' at the moment',
    contradict: ' contradict each other',

    inPlace: (place) => [' in ', place],
    thisGroupPlace: 'this group',
    cannotBeMet: (moment) => ` can’t be met${moment}`,
    neither: { capital: 'Neither ', lower: 'neither ' },
    nor: ' nor ',
    noneOf: { capital: 'None of ', lower: 'none of ' },
    canBeMet: (moment) => ` can be met${moment}`,

    thisNoun: { rule: 'this rule', group: 'this group' },
    anotherNoun: { rule: 'another rule', group: 'another group' },
    anotherNounDative: { rule: 'another rule', group: 'another group' },
    theNoun: { rule: 'the rule', group: 'the group' },
    otherRules: 'other rules',
    otherRulesDative: 'other rules',

    cannotBeMetTogetherWith: (items, moment) => `Can’t be met together with ${items}${moment}.`,
    groupCannotBeMet: (moment) => `This group can’t be met${moment}.`,
    ruleNoCitizenCanMeet: (moment) => `No citizen can meet this rule${moment}.`,
    sameAsNote: (other) => `Same as ${other}. You can delete one of them.`,
    youCanDeleteThe: { rule: 'You can delete the rule.', group: 'You can delete the group.' },
    everyCitizenMeetsThis: {
      rule: 'Every citizen meets this rule.',
      group: 'Every citizen meets this group.',
    },
    everyCitizenMeets: (met) => ['Every citizen meets ', ...met, '.'],
    anyoneWhoMeets: (given, met) => ['Anyone who meets ', ...given, ' also meets ', ...met, '.'],

    changeOrDeleteOneOf: (items, moment) =>
      `Change or delete one of ${items}; they contradict each other${moment}.`,
    changeOrDeleteCannotBeMet: (item, moment) =>
      `Change or delete ${item}; it can’t be met${moment}.`,
    changeOneOfOr: (items, item, moment) =>
      `Change one of ${items} so that it can be met, or delete ${item}; none of them can be ` +
      `met${moment}.`,
    changeOrDeleteNoCitizen: (item, moment) =>
      `Change or delete ${item}; no citizen can meet it${moment}.`,
    youCanDeleteCovered: (item, covering, one) =>
      `You can delete ${item}; ${covering} already ${one ? 'covers' : 'cover'} it.`,
    alwaysMetResolution: (item) =>
      `${item}’s condition is always met; delete it or make it stricter.`,
    alwaysMetResolutionUnnamed: {
      rule: 'The rule’s condition is always met; delete it or make it stricter.',
      group: 'The group’s condition is always met; delete it or make it stricter.',
    },
    loosenOrDelete: (moment) =>
      `Loosen or delete one of the rules that no citizen can meet together${moment}.`,
    addRuleOrStricter:
      'Add a rule or make one stricter; as it is, the variant accepts every citizen.',

    noneCanMeetRules: (branchName) => `No citizen can meet the rules of ${branchName}.`,
    noneCanMeetRulesToday: (branchName) =>
      `Right now, no citizen can meet the rules of ${branchName}.`,
    allMeetRules: (branchName) => `Every citizen meets the rules of ${branchName}.`,
    soNoneCanMeetRules: (branchName) => `So no citizen can meet the rules of ${branchName}.`,
    incomplete: (branchName) =>
      `The rules of ${branchName} couldn’t be checked completely. ` +
      'Only findings that are certain are shown.',
    incompleteAfterCounts: ' · couldn’t be checked completely',

    countNouns: {
      rule: { one: 'rule', other: 'rules' },
      group: { one: 'group', other: 'groups' },
    },
    countContradict: { one: 'contradicts another', other: 'contradict each other' },
    countCannotBeMet: { one: 'can’t be met', other: 'can’t be met' },
    countDuplicate: { one: 'is a duplicate', other: 'are duplicates' },
    countCovered: { one: 'already covered', other: 'already covered' },
    countAlwaysMet: { one: 'every citizen meets', other: 'every citizen meets' },

    conditionLine: (item, moment) => ['No citizen can meet ', item, `${moment}.`],
    alwaysMetLine: (item) => ['Every citizen meets ', item, ', so it doesn’t check anything.'],
    sameLine: (item, other) => [item, ' is the same as ', other, '.'],
    soNoneCanMeetAppended: (rightNow, branchName) =>
      `, so ${rightNow ? 'right now ' : ''}no citizen can meet the rules of ${branchName}.`,

    tabLabel: (branchName) => `${branchName} has findings`,
    oneLineLabels: { conflict: '1 conflict', duplicate: '1 duplicate', finding: '1 finding' },

    dialogNoneCanMeet: 'no citizen can meet these rules.',
    dialogNoneCanMeetToday: 'right now no citizen can meet these rules.',
    dialogAllMeet: 'every citizen meets these rules.',

    conflictsWith: (item, items, moment) => `${item} conflicts with ${items}${moment}.`,
    noneCanMeetItem: (item) => `No citizen can meet ${item}.`,
    noneCanMeetItemToday: (item) => `Right now, no citizen can meet ${item}.`,
    noLongerConflictsWith: (item, items) => `${item} no longer conflicts with ${items}.`,
    noLongerConflicting: (item) => `${item} is no longer conflicting.`,
    isTheSameAs: (item, other) => `${item} is the same as ${other}.`,
    makesNoDifference: (item, items) => `${item} makes no difference beside ${items}.`,
    noLongerRedundant: (item) => `${item} is no longer redundant.`,
    everyCitizenMeetsItem: (item) => `Every citizen meets ${item}.`,
    noLongerAlwaysMet: (item) => `${item} is no longer always met.`,
    inBranch: (branchName, sentence) => `In ${branchName}: ${sentence}`,
  },
  {
    kinds: {
      conflicting: 'Widersprüchlich:',
      redundant: 'Redundant:',
      always_met: 'Immer erfüllt:',
    },
    conjunctions: { and: ' und ', or: ' oder ' },
    countsAnd: ', und ',
    atTheMoment: ' im Moment',
    contradict: ' widersprechen einander',

    inPlace: (place) => [' in ', place],
    thisGroupPlace: 'dieser Gruppe',
    cannotBeMet: (moment) => ` kann${moment} nicht erfüllt werden`,
    neither: { capital: 'Weder ', lower: 'weder ' },
    nor: ' noch ',
    noneOf: { capital: 'Keine von ', lower: 'keine von ' },
    canBeMet: (moment) => ` kann${moment} erfüllt werden`,

    thisNoun: { rule: 'diese Regel', group: 'diese Gruppe' },
    anotherNoun: { rule: 'eine andere Regel', group: 'eine andere Gruppe' },
    anotherNounDative: { rule: 'einer anderen Regel', group: 'einer anderen Gruppe' },
    theNoun: { rule: 'die Regel', group: 'die Gruppe' },
    otherRules: 'andere Regeln',
    otherRulesDative: 'anderen Regeln',

    cannotBeMetTogetherWith: (items, moment) =>
      `Kann${moment} nicht zusammen mit ${items} erfüllt werden.`,
    groupCannotBeMet: (moment) => `Diese Gruppe kann${moment} nicht erfüllt werden.`,
    ruleNoCitizenCanMeet: (moment) => `Niemand kann diese Regel${moment} erfüllen.`,
    sameAsNote: (other) => `Identisch mit ${other}. Sie können eine der beiden löschen.`,
    youCanDeleteThe: {
      rule: 'Sie können die Regel löschen.',
      group: 'Sie können die Gruppe löschen.',
    },
    everyCitizenMeetsThis: {
      rule: 'Alle erfüllen diese Regel.',
      group: 'Alle erfüllen diese Gruppe.',
    },
    everyCitizenMeets: (met) => ['Alle erfüllen ', ...met, '.'],
    anyoneWhoMeets: (given, met) => ['Wer ', ...given, ' erfüllt, erfüllt auch ', ...met, '.'],

    changeOrDeleteOneOf: (items, moment) =>
      `Ändern oder löschen Sie eine von ${items}; sie widersprechen einander${moment}.`,
    changeOrDeleteCannotBeMet: (item, moment) =>
      `Ändern oder löschen Sie ${item}; sie kann${moment} nicht erfüllt werden.`,
    changeOneOfOr: (items, item, moment) =>
      `Ändern Sie eine von ${items} so, dass sie erfüllt werden kann, oder löschen Sie ${item}; ` +
      `keine davon kann${moment} erfüllt werden.`,
    changeOrDeleteNoCitizen: (item, moment) =>
      `Ändern oder löschen Sie ${item}; niemand kann sie${moment} erfüllen.`,
    youCanDeleteCovered: (item, covering, one) =>
      `Sie können ${item} löschen; ${covering} ${one ? 'deckt' : 'decken'} sie bereits ab.`,
    alwaysMetResolution: (item) =>
      `Die Bedingung von ${item} ist immer erfüllt; löschen Sie sie oder machen Sie sie strenger.`,
    alwaysMetResolutionUnnamed: {
      rule: 'Die Bedingung der Regel ist immer erfüllt; löschen Sie sie oder machen Sie sie strenger.',
      group:
        'Die Bedingung der Gruppe ist immer erfüllt; löschen Sie sie oder machen Sie sie strenger.',
    },
    loosenOrDelete: (moment) =>
      `Lockern oder löschen Sie eine der Regeln, die${moment} niemand zusammen erfüllen kann.`,
    addRuleOrStricter:
      'Fügen Sie eine Regel hinzu oder machen Sie eine strenger; in der jetzigen Form akzeptiert ' +
      'die Variante alle.',

    noneCanMeetRules: (branchName) => `Niemand kann die Regeln von ${branchName} erfüllen.`,
    noneCanMeetRulesToday: (branchName) =>
      `Derzeit kann niemand die Regeln von ${branchName} erfüllen.`,
    allMeetRules: (branchName) => `Alle erfüllen die Regeln von ${branchName}.`,
    soNoneCanMeetRules: (branchName) => `Daher kann niemand die Regeln von ${branchName} erfüllen.`,
    incomplete: (branchName) =>
      `Die Regeln von ${branchName} konnten nicht vollständig geprüft werden. ` +
      'Nur sichere Befunde werden angezeigt.',
    incompleteAfterCounts: ' · nicht vollständig geprüft',

    countNouns: {
      rule: { one: 'Regel', other: 'Regeln' },
      group: { one: 'Gruppe', other: 'Gruppen' },
    },
    countContradict: { one: 'widerspricht einer anderen', other: 'widersprechen einander' },
    countCannotBeMet: { one: 'kann nicht erfüllt werden', other: 'können nicht erfüllt werden' },
    countDuplicate: { one: 'ist ein Duplikat', other: 'sind Duplikate' },
    countCovered: { one: 'ist bereits abgedeckt', other: 'sind bereits abgedeckt' },
    countAlwaysMet: { one: 'ist immer erfüllt', other: 'sind immer erfüllt' },

    conditionLine: (item, moment) => ['Niemand kann ', item, `${moment} erfüllen.`],
    alwaysMetLine: (item) => ['Alle erfüllen ', item, ', daher prüft sie nichts.'],
    sameLine: (item, other) => [item, ' ist identisch mit ', other, '.'],
    soNoneCanMeetAppended: (rightNow, branchName) =>
      `, daher kann ${rightNow ? 'derzeit ' : ''}niemand die Regeln von ${branchName} erfüllen.`,

    tabLabel: (branchName) => `${branchName} hat Befunde`,
    oneLineLabels: { conflict: '1 Widerspruch', duplicate: '1 Duplikat', finding: '1 Befund' },

    dialogNoneCanMeet: 'Niemand kann diese Regeln erfüllen.',
    dialogNoneCanMeetToday: 'Derzeit kann niemand diese Regeln erfüllen.',
    dialogAllMeet: 'Alle erfüllen diese Regeln.',

    conflictsWith: (item, items, moment) => `${item} widerspricht ${items}${moment}.`,
    noneCanMeetItem: (item) => `Niemand kann ${item} erfüllen.`,
    noneCanMeetItemToday: (item) => `Derzeit kann niemand ${item} erfüllen.`,
    noLongerConflictsWith: (item, items) => `${item} widerspricht ${items} nicht mehr.`,
    noLongerConflicting: (item) => `${item} ist nicht mehr widersprüchlich.`,
    isTheSameAs: (item, other) => `${item} ist identisch mit ${other}.`,
    makesNoDifference: (item, items) => `${item} macht neben ${items} keinen Unterschied.`,
    noLongerRedundant: (item) => `${item} ist nicht mehr redundant.`,
    everyCitizenMeetsItem: (item) => `Alle erfüllen ${item}.`,
    noLongerAlwaysMet: (item) => `${item} ist nicht mehr immer erfüllt.`,
    inBranch: (branchName, sentence) => `In ${branchName}: ${sentence}`,
  }
);
