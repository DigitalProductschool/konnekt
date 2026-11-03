import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import type { EditorFooterProps } from './types';

/**
 * The actions of Figma "App/Footer". Step 1 continues to the documents, the documents go on
 * to the rules ("Add rules →"), the rules to the test step ("Test rules →"), and the test step
 * ends with "Publish" ("Save" when editing; spec 004, S2, S7, S8; F13). Nothing is saved until
 * then, so the design's "Save and exit" is left out (F28, O3). While no branch has any rule and
 * no rule editor is open, the documents and the rules step offer publishing "without rules",
 * which skips the test step, and the rules step has no "Test rules" (FR-001; F10, F17; W2). The
 * buttons stay enabled: a click with missing input says what is missing (F11), and neither the
 * personas nor their generation ever disable them (spec 004, FR-003, FR-013).
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
}: EditorFooterProps) {
  if (step === 'connection') {
    return (
      <>
        <div className="flex-1" />
        <button type="submit" form={ELEMENT_IDS.form} className="kern-btn kern-btn--primary">
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
  return (
    <>
      <button type="button" onClick={onBack} className="kern-btn kern-btn--tertiary">
        <span aria-hidden="true" className="kern-icon kern-icon--arrow-back" />
        <span className="kern-label">{EDITOR_COPY.back}</span>
      </button>
      <div className="flex-1" />
      {step === 'documents' && (
        // U09 6235:18684: the two actions are 8px apart, closer than the bar's 16px
        <div className="flex items-center gap-8">
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
            className="kern-btn kern-btn--primary"
          >
            {/* U11 6348:40892: no arrow, since publishing ends the wizard */}
            <span className="kern-label">{withoutRulesLabel}</span>
          </button>
        ) : (
          <button type="button" onClick={onTestRules} className="kern-btn kern-btn--primary">
            <span className="kern-label">{EDITOR_COPY.testRules}</span>
            <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
          </button>
        ))}
      {step === 'test' && (
        <button
          type="button"
          onClick={publishing ? undefined : onPublish}
          aria-disabled={publishing}
          className="kern-btn kern-btn--primary"
        >
          {/* F13 (U10 7058:62440): "Save", not "Publish changes", and no arrow on the last step */}
          <span className="kern-label">{editing ? EDITOR_COPY.save : EDITOR_COPY.publish}</span>
        </button>
      )}
    </>
  );
}
