import { RULE_EDITOR_COPY } from './constants';
import type { EditorActionsProps } from './types';

/**
 * Figma "Rules/Editor actions" (6093:3854): "Cancel" and "Save rule". "Save rule" looks
 * disabled until the rule is complete; pressing it then shows what is missing (U25).
 */
export default function EditorActions({ complete, onCancel, onSave }: EditorActionsProps) {
  return (
    <div className="flex items-center justify-end gap-16">
      <button
        type="button"
        onClick={onCancel}
        className="kern-btn kern-btn--tertiary kern-btn--small"
      >
        <span className="kern-label">{RULE_EDITOR_COPY.cancel}</span>
      </button>
      <button
        type="button"
        onClick={onSave}
        aria-disabled={!complete}
        className="kern-btn kern-btn--primary kern-btn--small"
      >
        <span className="kern-label">{RULE_EDITOR_COPY.saveRule}</span>
      </button>
    </div>
  );
}
