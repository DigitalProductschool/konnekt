import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import type { EditorFooterProps } from './types';

/**
 * The actions of Figma "App/Footer". Step 1 continues to the documents; nothing is saved
 * until "Publish", so the design's "Save and exit" is left out. The buttons stay enabled:
 * a click with missing input says what is missing.
 */
export default function EditorFooter({ step, publishing, onBack, onPublish }: EditorFooterProps) {
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
  return (
    <>
      <button type="button" onClick={onBack} className="kern-btn kern-btn--tertiary">
        <span aria-hidden="true" className="kern-icon kern-icon--arrow-back" />
        <span className="kern-label">{EDITOR_COPY.back}</span>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={publishing ? undefined : onPublish}
        aria-disabled={publishing}
        className="kern-btn kern-btn--primary"
      >
        <span className="kern-label">{EDITOR_COPY.publish}</span>
        <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
      </button>
    </>
  );
}
