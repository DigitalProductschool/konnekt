import { chipNameOf } from '@connection-portal/rules/personas/messages';

import { ELEMENT_IDS } from '../constants';
import { CHIP_ICONS } from './constants';
import LoadingRing from './LoadingRing';
import type { PersonaChipProps } from './types';

/**
 * Figma "Applicant · Mia Schulz" (7057:58755): a white pill, the label/default type. The focus
 * ring shows for keyboard focus only. kern.css, unlayered, does the reverse for `[tabindex]`: a
 * ring on any `:focus`, and `outline: 0` on `:focus:focus-visible`. Hence the `!` on both sides
 */
const CHIP_CLASSES =
  'bg-kern-layout-background-default text-kern-static-medium text-kern-layout-text-default focus-visible:outline-kern-action-focus-default! flex shrink-0 cursor-pointer items-center gap-8 rounded-full py-8 pr-14 pl-12 leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap focus-visible:outline-4! focus-visible:outline-offset-2! [&:focus:not(:focus-visible)]:outline-none!';

/**
 * Selected: a 2px outline in `action-default` (7057:58755). Otherwise the 1px decorative border
 * (7057:58758). As in Figma, the border adds to the size: 44px and 42px high
 */
const SELECTED_CLASSES = 'border-kern-action-default border-2';
const UNSELECTED_CLASSES = 'border border-(--kern-color-decorative-border-default)';

/**
 * One persona's chip (S8.3; FR-004, FR-015; Figma 7057:58755, 7057:58758, 7057:58761): a tab of
 * the "Sample applicants" tab list, with the persona's name and an icon whose shape states its
 * outcome for the shown variant, a check circle when it meets it, the warning diamond when not.
 * The chip shows no outcome text: its accessible name carries it ("Mia Schulz: doesn’t meet the
 * rules of Standard", `chipNameOf()`). Without a result, no icon and the name alone (design-notes
 * §3.1); while the persona is generated anew or filled with data for new fields (`'generating'`,
 * `'filling'`: a fill run looks like frame 19, FR-020), the loading ring in the icon's place
 * (7062:51295), and the name stays. The chip controls the persona panel
 */
export default function PersonaChip({
  persona,
  selected,
  meets,
  branchName,
  onSelect,
  onKeyDown,
}: PersonaChipProps) {
  return (
    <button
      id={ELEMENT_IDS.personaChip(persona.id)}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={ELEMENT_IDS.personaPanel(persona.id)}
      aria-label={meets === null ? undefined : chipNameOf(persona, branchName, meets)}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`${CHIP_CLASSES} ${selected ? SELECTED_CLASSES : UNSELECTED_CLASSES}`}
    >
      {persona.status !== 'ready' && <LoadingRing />}
      {meets !== null && (
        <span
          aria-hidden="true"
          className={`kern-icon kern-icon--small ${meets ? CHIP_ICONS.meets : CHIP_ICONS.fails}`}
        />
      )}
      <span>{persona.name}</span>
    </button>
  );
}
