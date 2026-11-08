import { creatingAllText } from '@connection-portal/rules/personas/messages';
import type { PersonaSlot } from '@connection-portal/rules/personas/types';
import type { KeyboardEvent } from 'react';

import { ELEMENT_IDS } from '../constants';
import { tabAfterKey } from '../RulesStep/utils';
import { SKELETON_PILL_WIDTHS, TEST_STEP_COPY } from './constants';
import GenerateAllButton from './GenerateAllButton';
import LoadingStatus from './LoadingStatus';
import PersonaChip from './PersonaChip';
import SkeletonPill from './SkeletonPill';
import type { ApplicantsRowProps } from './types';
import { runStatusTextOf } from './utils';

/**
 * The citizens row (S8.3, S8.8; FR-004, FR-012, FR-015; W9; Figma 7057:58754): the chips, then
 * at the row's right end the loading status (T035) and "Generate all again".
 *
 * The chips are a tab list, "Sample citizens", inside the variant's tab panel (design-notes
 * §3.2; research R16): each chip is a tab, exactly one selected, the first by default, and the
 * persona panel that `TestStep` renders is the tab panel they control. The keys follow WAI-ARIA's
 * tab pattern, as the variant tabs: one tab stop on the selected chip; Left and Right move to the
 * previous and next chip, wrapping, Home and End to the first and last, and the selection follows
 * the focus. "Generate all again" comes after the tab list in the tab order.
 *
 * Loading (S8.8; F14, W9; Figma U11): while all three are generated (frame 18: first open,
 * "Generate all again", "Try again"; `personas` is null), three skeleton pills in place of the
 * chips, and no tab list and no "Generate all again", only the status "Creating 3 sample
 * citizens…". While some are generated anew (frame 19), their chips stay, with a loading ring,
 * the status names them ("Creating new data for Mia…"), and "Generate all again" stays usable
 * after it. A fill run, after the team member returns from the rules step with new fields (FR-020),
 * looks the same for each persona being filled, with the status "Adding new data for Mia…"
 * (design-notes §8; `runStatusTextOf()`). A persona that isn't ready has no outcome icon, so its
 * chip's accessible name is its name alone. The status is always in the row, so that a run's text
 * is announced when it starts
 */
export default function ApplicantsRow({
  personas,
  selected,
  branch,
  results,
  run,
  onSelect,
  onGenerateAll,
}: ApplicantsRowProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, slot: number) {
    if (personas === null) {
      return;
    }
    const next = tabAfterKey(event.key, slot, personas.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    onSelect(next as PersonaSlot);
    document.getElementById(ELEMENT_IDS.personaChip(personas[next].id))?.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-8 px-16 pt-16">
      {personas === null ? (
        <div aria-hidden="true" className="flex flex-wrap items-center gap-8">
          {SKELETON_PILL_WIDTHS.map((width) => (
            <SkeletonPill key={width} width={width} />
          ))}
        </div>
      ) : (
        <div
          role="tablist"
          aria-label={TEST_STEP_COPY.applicants}
          className="flex flex-wrap items-center gap-8"
        >
          {personas.map((persona, slot) => (
            <PersonaChip
              key={persona.id}
              persona={persona}
              selected={slot === selected}
              meets={
                persona.status === 'ready'
                  ? (results?.[persona.id]?.[branch.key]?.met ?? null)
                  : null
              }
              branchName={branch.name}
              onSelect={() => onSelect(slot as PersonaSlot)}
              onKeyDown={(event) => handleKeyDown(event, slot)}
            />
          ))}
        </div>
      )}
      {/* Figma's spacer (7057:58764) */}
      <div className="flex-1" />
      <LoadingStatus text={personas === null ? creatingAllText : runStatusTextOf(run, personas)} />
      {personas !== null && <GenerateAllButton onGenerateAll={onGenerateAll} />}
    </div>
  );
}
