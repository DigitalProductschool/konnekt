import { KernInput } from '@kern-ux-annex/kern-react-kit';

import { LOGIN_COPY } from './constants';
import type { PasswordFieldProps } from './types';

/** The password input with a toggle that shows the password as plain text. */
export default function PasswordField({
  id,
  label,
  value,
  visible,
  onChange,
  onToggleVisible,
}: PasswordFieldProps) {
  return (
    <div className="relative">
      <KernInput
        id={id}
        type={visible ? 'text' : 'password'}
        label={label}
        required
        autoComplete="current-password"
        value={value}
        onChange={onChange}
        // Keeps the text clear of the toggle; KERN's own padding needs the override
        className="pr-56!"
      />
      <span className="absolute right-4 bottom-0 flex">
        <button
          type="button"
          aria-pressed={visible}
          onClick={onToggleVisible}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span
            aria-hidden="true"
            className={`kern-icon kern-icon--small ${visible ? 'kern-icon--visibility-off' : 'kern-icon--visibility'}`}
          />
          <span className="kern-label kern-sr-only">{LOGIN_COPY.showPassword}</span>
        </button>
      </span>
    </div>
  );
}
