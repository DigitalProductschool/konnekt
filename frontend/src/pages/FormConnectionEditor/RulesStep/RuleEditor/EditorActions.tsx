import { ExplainedButton } from '../../../../components/InfoTooltip';
import { RULE_EDITOR_COPY } from './constants';
import type { EditorActionsProps } from './types';

/**
 * Figma "Rules/Editor actions" (6093:3854; U30 6348:40758, 6350:41190; U49 6196:10255): "Discard
 * rule" (KERN's tertiary small button, FR-051 (36)) and "Save rule" (primary small), 16px apart
 * at the right end. Until the rule is complete "Save rule" is the disabled button with
 * explanation (design-notes §3, W21): faded, focusable, it doesn't save, and the tooltip says
 * what is missing on hover, keyboard focus and a tap. Pressing it still points out what is
 * missing in the editor, as before (002-S3.10, U25): `onSave` runs from the capture phase, which
 * the button's own ignored activation doesn't stop, and the editor then flags the missing part.
 */
export default function EditorActions({ explanation, onCancel, onSave }: EditorActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-16">
      <button
        type="button"
        onClick={onCancel}
        className="kern-btn kern-btn--tertiary kern-btn--small"
      >
        <span className="kern-label">{RULE_EDITOR_COPY.discardRule}</span>
      </button>
      <ExplainedButton
        explanation={explanation}
        align="end"
        onClick={onSave}
        onClickCapture={explanation ? onSave : undefined}
        className="kern-btn kern-btn--primary kern-btn--small"
      >
        <span className="kern-label">{RULE_EDITOR_COPY.saveRule}</span>
      </ExplainedButton>
    </div>
  );
}
