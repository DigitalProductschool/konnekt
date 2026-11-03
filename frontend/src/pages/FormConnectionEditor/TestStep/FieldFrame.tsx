import type { FieldFrameProps } from './types';
import { errorIdOf } from './utils';

/**
 * KERN 2.8's form field (`kern-form-input`) around a persona's control (S8.5; Figma "Field · Name"
 * 7058:60652, invalid state 7058:60812): the label above (label/default, 8px above the control), the
 * control, and the error under it, 8px below: KERN's `kern-error` with its 24px danger icon and
 * body text. With an error KERN adds the 4px danger bar before the field and 16px of padding
 * (`kern-form-input--error`). The error is tied to the control by its id, which the control's
 * `aria-describedby` names
 */
export default function FieldFrame({ id, label, error, plainLabel, children }: FieldFrameProps) {
  return (
    <div className={`kern-form-input ${error ? 'kern-form-input--error' : ''}`}>
      {plainLabel ? (
        <span className="kern-label">{label}</span>
      ) : (
        <label htmlFor={id} className="kern-label">
          {label}
        </label>
      )}
      {children}
      {error && (
        <div id={errorIdOf(id)} className="kern-error">
          <span aria-hidden="true" className="kern-icon kern-icon--danger" />
          <span className="kern-body">{error}</span>
        </div>
      )}
    </div>
  );
}
