import { ELEMENT_IDS } from '../constants';
import CardScrollArea from './CardScrollArea';
import PersonaData from './PersonaData';
import PersonaHead from './PersonaHead';
import type { PersonaPanelProps } from './types';

/**
 * The selected persona's data card in read mode (S8.4; FR-004, FR-005, FR-007; Figma "Applicant
 * data" U65 7057:58767): white, 1px decorative border, 8px radius, 16px padding, 410px wide beside
 * the results from `lg`; the head, then 8px below it the values as one flat list (`PersonaData`;
 * spec 008 F63, FR-043). Where the wizard pins its step header and the cards sit side by side,
 * the card is as high as the panel and its values scroll under the head that stays put
 * (`CardScrollArea`; FR-043 as clarified on 2026-11-18, V5 frame 15 7599:57588, reversing CLAR
 * #31 (c)); elsewhere it stretches to the results' height. Only a ready persona has it: while the
 * persona is generated, `TestStep` shows `PersonaPlaceholder` in its place, without "Edit data" or
 * "Generate again" (S8.8; FR-013); that goes for a persona being filled after the rules changed too
 * (FR-020).
 * "Edit data" opens the edit-data dialog (`EditDataDialog`, spec 008 FR-042), which `TestStep`
 * renders beside the step; the card never turns into fields.
 *
 * The rows follow the current rules (W6; FR-005): `fields` holds only the fields the rules check
 * now, so a row comes and goes with them. A persona keeps the value of a field that no rule
 * checks at the moment, hidden, and a row that comes back shows it again, as it was
 */
export default function PersonaPanel({
  persona,
  fields,
  context,
  failingFields,
  onEditData,
  onGenerateAgain,
}: PersonaPanelProps) {
  return (
    <div className="rounded-kern-default bg-kern-layout-background-default flex flex-col gap-8 border border-(--kern-color-decorative-border-default) p-16 lg:w-410 lg:shrink-0">
      <PersonaHead persona={persona} onEditData={onEditData} onGenerateAgain={onGenerateAgain} />
      <CardScrollArea labelledBy={ELEMENT_IDS.personaHeading(persona.id)}>
        <PersonaData
          persona={persona}
          fields={fields}
          context={context}
          failingFields={failingFields}
        />
      </CardScrollArea>
    </div>
  );
}
