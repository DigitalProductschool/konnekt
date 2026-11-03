import { useEffect, useRef } from 'react';

import type { PersonaSlot } from '../../../utils/rules/personas/types';
import { ELEMENT_IDS } from '../constants';
import ApplicantsRow from './ApplicantsRow';
import { LOADING_STATUS_ID } from './constants';
import GenerationFailed from './GenerationFailed';
import PersonaPanel from './PersonaPanel';
import PersonaPlaceholder from './PersonaPlaceholder';
import PersonasAnnouncer from './PersonasAnnouncer';
import RegenerateDialog from './RegenerateDialog';
import ResultSection from './ResultSection';
import TestDayLine from './TestDayLine';
import type { TestStepProps } from './types';
import { createsAll, selectedBranchOf } from './utils';
import VariantTabs from './VariantTabs';

/**
 * The test step (S8; FR-004, FR-016; Figma U01 7057:58709), under the page title "Test rules" and
 * its intro: the test-day line (W1), the variant tabs, then the selected variant's area (Figma
 * "Variant area" 7057:58753: hued, 1px border, 8px radius) with the applicants row and the panel
 * holding the selected persona's data and results, side by side and 16px apart. The data card
 * stretches to the results' height, and they to its (U08 7058:61705: both 714px; U11: both
 * skeleton cards 317px). Three states (S8.8, S8.9; FR-004, FR-012, FR-013; W7, W9):
 * - frame 18, while all three personas are generated (first open, "Generate all again", "Try
 *   again") or the results' module loads: no test-day line, skeleton pills and the status
 *   "Creating 3 sample applicants…" in the row, skeleton cards, nothing to edit. A later create or
 *   edit flow mounts a new editor page, whose personas start anew with this state (W7);
 * - failure (`state.failed`, or a catalog that couldn't load; S8.9): no test-day line, and the
 *   failure in place of the row and the panel;
 * - results: the test-day line, the chips, and the selected persona's cards; while some personas
 *   are generated anew or filled with data for the rules' new fields (frame 19; "Adding new data for
 *   Mia…" after returning from the rules step, FR-020), their chips show a loading ring, the
 *   status names them, and the selected one's cards are skeletons, without "Edit data" or
 *   "Generate again", while the others stay usable.
 *
 * Before generating anew, a persona with changes gets a question (`RegenerateDialog`, S8.7), and
 * the changes' effects on the outcomes are announced by `PersonasAnnouncer` (S8.10).
 *
 * The focus is never lost (quickstart V9): when a state change removes the focused element (the
 * button that started a run, which gives way to a skeleton, or "Try again"), it moves to what
 * stands in for it: frame 18's status, the failure's "Try again", or the selected persona's chip;
 * and when frame 18 ends with the focus on its status, to the selected chip.
 *
 * From 1024 × 640 px (`split:`), the step fills the visible height and only the panel scrolls; the
 * header, progress, tabs, applicants row and action bar stay put (K3). The step lives only in the
 * signed-in wizard, with no route of its own (W13).
 */
export default function TestStep({
  personas,
  branches,
  checks,
  context,
  contextFailed,
  editing,
  onRetry,
}: TestStepProps) {
  const {
    state,
    fields,
    results,
    today,
    dispatch,
    generateOne,
    generateAll,
    confirmed,
    cancelled,
    viewOf,
  } = personas;
  const branch = selectedBranchOf(branches, state.branchKey);
  const failed = state.failed || contextFailed;
  const loaded =
    !failed && state.personas !== null && results !== null && viewOf !== null && context !== null
      ? { personas: state.personas, results, viewOf, context }
      : null;
  // Frame 18: all three are generated, or what the results need is still loading
  const creatingAll = !failed && (loaded === null || createsAll(state.run));
  const shown = creatingAll ? null : loaded;
  const persona = shown?.personas[state.selected] ?? null;
  // A persona being generated anew, or filled with data for new fields, shows its placeholder
  // (frame 19; FR-020)
  const ready = persona?.status === 'ready' ? persona : null;
  const result = shown && ready ? shown.results[ready.id]?.[branch.key] : undefined;
  const view = shown && ready && result ? shown.viewOf(result, branch, ready) : null;

  const panelRef = useRef<HTMLElement>(null);
  // The element in the step that last had the focus
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  // What stands in for an element a state change removed: in frame 18 its status, in the failure
  // state "Try again" (null: the failure's button), otherwise the selected chip
  const focusTargetId = failed
    ? null
    : creatingAll
      ? LOADING_STATUS_ID
      : persona && ELEMENT_IDS.personaChip(persona.id);
  // Changes with every change of state: failure, frame 18, or which personas are generated anew or
  // filled (every persona that isn't ready)
  const phase = failed
    ? 'failed'
    : creatingAll
      ? 'creatingAll'
      : (shown?.personas ?? [])
          .filter((entry) => entry.status !== 'ready')
          .map((entry) => entry.id)
          .join(' ');

  useEffect(() => {
    const active = document.activeElement;
    const last = lastFocusedRef.current;
    // After "Generate new data", the dialog has just closed (its effect runs first), and the focus
    // may still be on its button, which is hidden now, or already on the page
    const idle =
      active === null || active === document.body || active.closest('dialog:not([open])') !== null;
    const lost = idle && last !== null && !last.isConnected;
    const parked = active?.id === LOADING_STATUS_ID && focusTargetId !== LOADING_STATUS_ID;
    if (!lost && !parked) {
      return;
    }
    const target =
      focusTargetId === null
        ? panelRef.current?.querySelector<HTMLElement>('button')
        : document.getElementById(focusTargetId);
    target?.focus();
  }, [phase, focusTargetId]);

  return (
    <>
      <div
        className="split:h-[100cqh] flex flex-col gap-16"
        onFocus={(event) => {
          lastFocusedRef.current = event.target;
        }}
      >
        {shown && <TestDayLine today={today} />}
        <VariantTabs
          branches={branches}
          selected={branch.key}
          checks={checks}
          onSelect={(branchKey) => dispatch({ type: 'selectBranch', branchKey })}
        />
        <section
          ref={panelRef}
          id={ELEMENT_IDS.testPanel(branch.key)}
          role="tabpanel"
          aria-labelledby={ELEMENT_IDS.testTab(branch.key)}
          className="rounded-kern-large bg-kern-layout-background-hued split:min-h-0 split:flex-1 flex flex-col overflow-clip border border-(--kern-color-decorative-border-default)"
        >
          {failed ? (
            <GenerationFailed editing={editing} onRetry={onRetry} />
          ) : (
            <>
              <ApplicantsRow
                personas={shown?.personas ?? null}
                selected={state.selected}
                branch={branch}
                results={shown?.results ?? null}
                run={state.run}
                onSelect={(slot: PersonaSlot) => dispatch({ type: 'select', slot })}
                onGenerateAll={generateAll}
              />
              {/* The only part that scrolls (K3) */}
              <div
                id={persona ? ELEMENT_IDS.personaPanel(persona.id) : undefined}
                role={persona ? 'tabpanel' : undefined}
                aria-labelledby={persona ? ELEMENT_IDS.personaChip(persona.id) : undefined}
                aria-busy={persona && !ready ? true : undefined}
                className="split:min-h-0 split:flex-1 split:overflow-y-auto overflow-x-clip p-16"
              >
                {/*
                 * Figma "Data and result" (7058:61705, 7062:51017) in the scrolling "Applicant
                 * panel": its own box, as high as its taller card, so that the other card stretches
                 * to it and neither takes the scrolling panel's height
                 */}
                <div className="flex flex-col gap-16 lg:flex-row">
                  {shown && ready ? (
                    <>
                      <PersonaPanel
                        persona={ready}
                        fields={fields}
                        context={shown.context}
                        today={today}
                        failingFields={view?.failingFields ?? []}
                        editing={state.editing === state.selected}
                        onEditData={() => personas.startEditing(state.selected)}
                        onDone={personas.stopEditing}
                        onSetValue={(key, value) => personas.setValue(state.selected, key, value)}
                        onRename={(name) => personas.rename(state.selected, name)}
                        onGenerateAgain={() => generateOne(state.selected)}
                      />
                      <ResultSection
                        view={view}
                        branch={branch}
                        check={checks[branch.key] ?? null}
                      />
                    </>
                  ) : (
                    <PersonaPlaceholder />
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      {/* Beside the step's wrapper, so that the dialog's focus isn't taken for the step's own */}
      <RegenerateDialog
        confirm={state.confirm}
        personas={state.personas}
        onConfirm={confirmed}
        onCancel={cancelled}
      />
      <PersonasAnnouncer announcement={state.announcement} announcementId={state.announcementId} />
    </>
  );
}
