import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import type { EditorFooterProps } from './types';

/**
 * The actions of Figma "App/Footer". Step 1 continues to the documents, the documents go on
 * to the rules ("Add rules →"), and the rules end with "Publish" ("Save" when editing).
 * Nothing is saved until then, so the design's "Save and exit" is left out (F28). While no
 * branch has any rule, publishing is "without rules", and the documents step offers it too
 * (FR-001; F10, F17). The buttons stay enabled: a click with missing input says what is
 * missing (F11).
 */
export default function EditorFooter({
  step,
  editing,
  publishing,
  withoutRules,
  onBack,
  onAddRules,
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
  const publishLabel = withoutRules
    ? editing
      ? EDITOR_COPY.saveWithoutRules
      : EDITOR_COPY.publishWithoutRules
    : editing
      ? EDITOR_COPY.save
      : EDITOR_COPY.publish;
  return (
    <>
      <button type="button" onClick={onBack} className="kern-btn kern-btn--tertiary">
        <span aria-hidden="true" className="kern-icon kern-icon--arrow-back" />
        <span className="kern-label">{EDITOR_COPY.back}</span>
      </button>
      <div className="flex-1" />
      {step === 'documents' ? (
        // U09 6235:18684: the two actions are 8px apart, closer than the bar's 16px
        <div className="flex items-center gap-8">
          {withoutRules && (
            <button
              type="button"
              onClick={publishing ? undefined : onPublish}
              aria-disabled={publishing}
              className="kern-btn kern-btn--secondary"
            >
              <span className="kern-label">{publishLabel}</span>
            </button>
          )}
          <button type="button" onClick={onAddRules} className="kern-btn kern-btn--primary">
            <span className="kern-label">{EDITOR_COPY.addRules}</span>
            <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={publishing ? undefined : onPublish}
          aria-disabled={publishing}
          className="kern-btn kern-btn--primary"
        >
          {/* U11 6348:40892: no arrow, since this is the last step */}
          <span className="kern-label">{publishLabel}</span>
        </button>
      )}
    </>
  );
}
