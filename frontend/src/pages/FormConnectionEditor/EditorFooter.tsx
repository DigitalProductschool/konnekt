import { ExplainedButton } from '../../components/InfoTooltip';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import SaveAndExitButton from './SaveAndExitButton';
import type { EditorFooterProps } from './types';

/**
 * The actions of Figma "Shell/Footer" (U19 6699:45349, U17 6408:72735, U98 6731:39850; build
 * note U01 #20): on the left "Back" (not on step 1) and, 8px after it, "Save and exit" (a new
 * connection or a stored draft, S0, S1; FR-001) or "Discard changes" (the edit flow, FR-045,
 * where the editor passes `onDiscard`), both tertiary (cosmetic 17); on the right the step's
 * action, 8px after an outlined one where there are two. Step 1 continues to the documents, the
 * documents go on to the rules ("Add rules →"), the rules to the test step ("Test rules →"),
 * and the test step ends with "Publish" ("Save" when editing; spec 004, S2, S7, S8; F13). While
 * no branch has any rule and no rule editor is open, the documents and the rules step offer
 * publishing "without rules", which skips the test step (FR-001; F10, F17; W2). "Test rules" is
 * unusable while a rule is open or rules are being grouped, and says why on hover and focus
 * (FR-034, W21; T022's pattern); a click with other missing input says what is missing (F11),
 * and neither the personas nor their generation ever disable a button (spec 004, FR-003,
 * FR-013). Where the actions don't fit in one row (320px, 200 % zoom), the bar wraps them
 * (`WizardLayout`): the step's actions carry `ml-auto`, so that they stay on the right in a row
 * of their own, and every button keeps its label (005-ACC.4).
 */
export default function EditorFooter({
  step,
  editing,
  publishing,
  rulesNextAction,
  ruleOpen,
  grouping,
  onBack,
  onAddRules,
  onTestRules,
  onPublish,
  canSaveDraft,
  savingDraft,
  onSaveAndExit,
  onDiscard,
}: EditorFooterProps) {
  const back = step !== 'connection' && (
    <button type="button" onClick={onBack} className="kern-btn kern-btn--tertiary">
      <span aria-hidden="true" className="kern-icon kern-icon--arrow-back" />
      <span className="kern-label">{EDITOR_COPY.back}</span>
    </button>
  );
  const saveAndExit = canSaveDraft && (
    <SaveAndExitButton savingDraft={savingDraft} onSaveAndExit={onSaveAndExit} />
  );
  const discard = onDiscard && (
    // U98 6731:39850: the "undo" glyph
    <button type="button" onClick={onDiscard} className="kern-btn kern-btn--tertiary">
      <span aria-hidden="true" className="kern-icon icon-undo" />
      <span className="kern-label">{EDITOR_COPY.discardChanges}</span>
    </button>
  );
  const leading = (back || saveAndExit || discard) && (
    // Figma: Back and "Save and exit" (or "Discard changes") are 8px apart
    <div className="flex flex-wrap items-center gap-8">
      {back}
      {saveAndExit}
      {discard}
    </div>
  );
  const withoutRules = rulesNextAction === 'publishWithoutRules';
  const withoutRulesLabel = editing
    ? EDITOR_COPY.saveWithoutRules
    : EDITOR_COPY.publishWithoutRules;
  return (
    <>
      {leading}
      {step === 'connection' && (
        <button
          type="submit"
          form={ELEMENT_IDS.form}
          className="kern-btn kern-btn--primary ml-auto"
        >
          <span className="kern-label">{EDITOR_COPY.continue}</span>
          <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
        </button>
      )}
      {step === 'documents' && (
        // U09 6235:18684, U98 6731:39850: the two actions are 8px apart
        <div className="ml-auto flex flex-wrap items-center justify-end gap-8">
          {withoutRules && (
            <button
              type="button"
              onClick={publishing ? undefined : onPublish}
              aria-disabled={publishing}
              className="kern-btn kern-btn--secondary"
            >
              <span className="kern-label">{withoutRulesLabel}</span>
            </button>
          )}
          <button type="button" onClick={onAddRules} className="kern-btn kern-btn--primary">
            <span className="kern-label">{EDITOR_COPY.addRules}</span>
            <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
          </button>
        </div>
      )}
      {step === 'rules' &&
        (withoutRules ? (
          <button
            type="button"
            onClick={publishing ? undefined : onPublish}
            aria-disabled={publishing}
            className="kern-btn kern-btn--primary ml-auto"
          >
            {/* U11 6348:40892: no arrow, since publishing ends the wizard */}
            <span className="kern-label">{withoutRulesLabel}</span>
          </button>
        ) : (
          <ExplainedButton
            explanation={
              ruleOpen
                ? EDITOR_COPY.saveRuleFirst
                : grouping
                  ? EDITOR_COPY.finishGroupingFirst
                  : null
            }
            align="end"
            wrapperClassName="ml-auto"
            onClick={onTestRules}
            className="kern-btn kern-btn--primary"
          >
            <span className="kern-label">{EDITOR_COPY.testRules}</span>
            <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
          </ExplainedButton>
        ))}
      {step === 'test' && (
        <button
          type="button"
          onClick={publishing ? undefined : onPublish}
          aria-disabled={publishing}
          className="kern-btn kern-btn--primary ml-auto"
        >
          {/* F13 (U10 7058:62440): "Save", not "Publish changes", and no arrow on the last step */}
          <span className="kern-label">{editing ? EDITOR_COPY.save : EDITOR_COPY.publish}</span>
        </button>
      )}
    </>
  );
}
