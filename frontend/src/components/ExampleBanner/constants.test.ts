// The example banner's sentences (C4, FR-058; contracts/copy.md §6): the frames' English and
// copy.md's German word for word, the variant's sentence naming the variant by its stored name

import { describe, expect, it } from 'vitest';

import { EXAMPLE_BANNER_COPY } from './constants';

describe('EXAMPLE_BANNER_COPY', () => {
  it('words step 1, the documents and the test step as U18 1h 6798:122695 draws it', () => {
    expect(EXAMPLE_BANNER_COPY.en.connection).toBe(
      'This is an example. Change anything to see how it works.'
    );
    expect(EXAMPLE_BANNER_COPY.de.connection).toBe(
      'Dies ist ein Beispiel. Ändern Sie, was Sie möchten, um zu sehen, wie es funktioniert.'
    );
  });

  it('words Standard on the rules step as U18 1i 7344:96396 draws it', () => {
    expect(EXAMPLE_BANNER_COPY.en.standard).toBe(
      'Try changing the age to 18 or adding a rule. Then use Test rules to check the result.'
    );
    expect(EXAMPLE_BANNER_COPY.de.standard).toBe(
      'Versuchen Sie, das Alter auf 18 zu ändern oder eine Regel hinzuzufügen. Prüfen Sie das Ergebnis dann mit „Regeln testen“.'
    );
  });

  it('words the variant as U18 1i-c 7344:96451 and copy.md §6 do when the languages match', () => {
    expect(EXAMPLE_BANNER_COPY.en.variant('Ambulance')).toBe(
      'Ambulance is more lenient than Standard. Rules 01 and 02 are changed here.'
    );
    expect(EXAMPLE_BANNER_COPY.de.variant('Krankentransport')).toBe(
      'Krankentransport ist weniger streng als Standard. Rule 01 und Rule 02 sind hier geändert.'
    );
  });

  it('names the variant by its stored name in either language', () => {
    expect(EXAMPLE_BANNER_COPY.en.variant('Krankentransport')).toBe(
      'Krankentransport is more lenient than Standard. Rules 01 and 02 are changed here.'
    );
    expect(EXAMPLE_BANNER_COPY.de.variant('Ambulance')).toBe(
      'Ambulance ist weniger streng als Standard. Rule 01 und Rule 02 sind hier geändert.'
    );
  });
});
