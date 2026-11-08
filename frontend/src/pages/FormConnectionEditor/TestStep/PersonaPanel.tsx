import PersonaData from './PersonaData';
import PersonaEditor from './PersonaEditor';
import PersonaHead from './PersonaHead';
import type { PersonaPanelProps } from './types';

/**
 * The selected persona's data card in read mode (S8.4; FR-004, FR-005, FR-007; Figma "Citizen
 * data" 7057:58767): white, 1px decorative border, 8px radius, 16px padding, 410px wide beside the
 * results from `lg`; the head, then 8px below it the values under their documents' headings. It
 * doesn't scroll itself: it shares the scrolling panel of `TestStep` with the results (K3; U08
 * 7058:61704, 7058:61705), and stretches to the results' height there, as both cards are 714px
 * high in U08. Only a ready persona has it: while the persona is generated, `TestStep` shows
 * `PersonaPlaceholder` in its place, without "Edit data" or "Generate again" (S8.8; FR-013); that
 * goes for a persona being filled after the rules changed too (FR-020).
 *
 * The rows follow the current rules (W6; FR-005): `fields` holds only the fields the rules check
 * now, so a row comes and goes with them. A persona keeps the value of a field that no rule
 * checks at the moment, hidden, and a row that comes back shows it again, as it was
 */
export default function PersonaPanel({
  persona,
  fields,
  context,
  today,
  failingFields,
  editing,
  onEditData,
  onDone,
  onSetValue,
  onRename,
  onGenerateAgain,
}: PersonaPanelProps) {
  return (
    <div className="rounded-kern-large bg-kern-layout-background-default flex flex-col gap-8 border border-(--kern-color-decorative-border-default) p-16 lg:w-410 lg:shrink-0">
      <PersonaHead
        persona={persona}
        editing={editing}
        onEditData={onEditData}
        onDone={onDone}
        onGenerateAgain={onGenerateAgain}
      />
      {editing ? (
        <PersonaEditor
          key={persona.id}
          persona={persona}
          fields={fields}
          context={context}
          today={today}
          onSetValue={onSetValue}
          onRename={onRename}
        />
      ) : (
        <PersonaData
          persona={persona}
          fields={fields}
          context={context}
          today={today}
          failingFields={failingFields}
        />
      )}
    </div>
  );
}
