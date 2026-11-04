import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import SaveAndExitButton from './SaveAndExitButton';
import type { EditorFooterProps } from './types';

/**
 * The actions of Figma "App/Footer". Step 1 continues to the documents, the documents go on
 * to the rules ("Add rules →"), the rules to the test step ("Test rules →"), and the test step
 * ends with "Publish" ("Save" when editing; spec 004, S2, S7, S8; F13). A new connection and a
 * stored draft also offer "Save and exit" on every step, which stores the flow as a draft and
 * goes back to the overview (spec 005, S0, S1; FR-001; F28). It stands where Figma has it, after
 * Back and 8px from it, and first on step 1, which has no Back. The edit flow of a published
 * connection has no "Save and exit" and renders as before (FR-026). While no branch has any rule
 * and no rule editor is open, the documents and the rules step offer publishing "without rules",
 * which skips the test step, and the rules step has no "Test rules" (FR-001; F10, F17; W2). The
 * buttons stay enabled: a click with missing input says what is missing (F11), and neither the
 * personas nor their generation ever disable them (spec 004, FR-003, FR-013). Where the actions
 * don't fit in one row (320px, 200% zoom), the bar wraps them (`WizardLayout`): the step's actions
 * carry `ml-auto`, so that they stay on the right in a row of their own.
 */
export default function EditorFooter({
  step,
  editing,
  publishing,
  rulesNextAction,
  onBack,
  onAddRules,
  onTestRules,
  onPublish,
  canSaveDraft,
  savingDraft,
  onSaveAndExit,
}: EditorFooterProps) {
  const saveAndExit = canSaveDraft && (
    <SaveAndExitButton savingDraft={savingDraft} onSaveAndExit={onSaveAndExit} />
  );
  if (step === 'connection') {
    return (
      <>
        {saveAndExit}
        <div className="flex-1" />
        <button
          type="submit"
          form={ELEMENT_IDS.form}
          className="kern-btn kern-btn--primary ml-auto"
        >
          <span className="kern-label">{EDITOR_COPY.continue}</span>
          <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
        </button>
      </>
    );
  }
  const withoutRules = rulesNextAction === 'publishWithoutRules';
  const withoutRulesLabel = editing
    ? EDITOR_COPY.saveWithoutRules
    : EDITOR_COPY.publishWithoutRules;
  const back = (
    <button type="button" onClick={onBack} className="kern-btn kern-btn--tertiary">
      <span aria-hidden="true" className="kern-icon kern-icon--arrow-back" />
      <span className="kern-label">{EDITOR_COPY.back}</span>
    </button>
  );
  return (
    <>
      {saveAndExit ? (
        // F28 (U09 6235:18684, U13 6357:42646): Back and "Save and exit" are 8px apart
        <div className="flex flex-wrap items-center gap-8">
          {back}
          {saveAndExit}
        </div>
      ) : (
        back
      )}
      <div className="flex-1" />
      {step === 'documents' && (
        // U09 6235:18684: the two actions are 8px apart, closer than the bar's 16px
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
          <button
            type="button"
            onClick={onTestRules}
            className="kern-btn kern-btn--primary ml-auto"
          >
            <span className="kern-label">{EDITOR_COPY.testRules}</span>
            <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
          </button>
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
