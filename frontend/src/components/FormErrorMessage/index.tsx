import type { FormErrorMessageProps } from './types';

/**
 * KERN's field error (design-notes §2, option a; kit P14 "error-message", U19 6699:45398): the
 * `kern-error` row with KERN's danger icon (24 px, in the danger colour) and the message in
 * body/default (16/24, regular, the text colour), 8 px apart. Inside a `kern-form-input` KERN
 * puts it 8 px under the field.
 */
export default function FormErrorMessage({ message, id, role }: FormErrorMessageProps) {
  return (
    <p id={id} role={role} className="kern-error">
      <span aria-hidden="true" className="kern-icon kern-icon--danger" />
      <span className="kern-body">{message}</span>
    </p>
  );
}
