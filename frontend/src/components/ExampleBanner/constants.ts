import { defineTexts } from '@connection-portal/rules/language';

/**
 * The example's banners (FR-058, C4; U18 1h 6798:122695, 1i 7344:96396, 1i-c 7344:96451): the
 * frames' English word for word; the variant's German from contracts/copy.md §6, the others
 * written from spec 009's glossary ("Beispiel", "Regel", "Alter", the footer's "Test rules" →
 * "Regeln testen" named in German quotes). `connection` shows on the connection, documents and
 * test steps (W15), `standard` on the rules step for Standard, `variant` on the rules step for
 * the example's variant ("Ambulance" / "Krankentransport"), which it names by its stored name
 * (copy.md §6, design-notes §4.2 "T066"), so that an example created in German and read in English
 * names "Krankentransport" as its tab does; "Standard", "Rule 01" and "Rule 02" stay stored names
 * (spec 009, FR-007)
 */
export const EXAMPLE_BANNER_COPY = defineTexts(
  {
    connection: 'This is an example. Change anything to see how it works.',
    standard:
      'Try changing the age to 18 or adding a rule. Then use Test rules to check the result.',
    variant: (name: string) =>
      `${name} is more lenient than Standard. Rules 01 and 02 are changed here.`,
  },
  {
    connection:
      'Dies ist ein Beispiel. Ändern Sie, was Sie möchten, um zu sehen, wie es funktioniert.',
    standard:
      'Versuchen Sie, das Alter auf 18 zu ändern oder eine Regel hinzuzufügen. Prüfen Sie das Ergebnis dann mit „Regeln testen“.',
    variant: (name: string) =>
      `${name} ist weniger streng als Standard. Rule 01 und Rule 02 sind hier geändert.`,
  }
);

/**
 * The info look of "Rules/Findings banner" (6750:40865, kind info, state single), as the rules
 * step's findings banner draws it (`RulesStep/constants.ts`, `BANNER_LOOKS.info`): the
 * `feedback-info-background` #e0f2fe fill with its 1px `feedback-info` border (the overlay's AA
 * value #0273ae for the frame's #0284c7, spec 008 §1.5), radius 8, padding 8 8 8 16, the 20px
 * `icon-info-small` (KERN's info icon in `feedback-info`), 8px, then the sentence in body/small
 * (14/24, regular) and `layout-text-default`, which wraps beside the icon in narrow windows
 */
export const EXAMPLE_BANNER_CLASSES = {
  box: 'bg-kern-feedback-info-background border-kern-feedback-info rounded-kern-default flex items-center gap-8 border py-8 pr-8 pl-16',
  icon: 'kern-icon kern-icon--info bg-kern-feedback-info! kern-icon--small shrink-0',
  text: 'text-kern-layout-text-default text-kern-static-small min-w-px flex-1 leading-(--kern-typography-line-height-medium-static) wrap-anywhere',
};
