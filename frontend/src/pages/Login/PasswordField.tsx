import TextField from '../../components/TextField';
import { useCopy } from '../../hooks/useLanguage';
import { LOGIN_COPY } from './constants';
import type { PasswordFieldProps } from './types';

/**
 * Figma "Input/Password · eye inside" (U10 6616:40784): the password input with the show/hide
 * toggle inside the field at its right end, a 32px icon button with the 24px eye in the action
 * colour (FR-051 (29)). The eye is struck through while the password is hidden, as the design
 * draws it; the button's name stays "Show password" and `aria-pressed` tells whether it shows.
 */
export default function PasswordField({
  id,
  label,
  value,
  visible,
  invalid,
  describedBy,
  onChange,
  onToggleVisible,
}: PasswordFieldProps) {
  const copy = useCopy(LOGIN_COPY);
  const toggle = (
    <button
      type="button"
      aria-pressed={visible}
      onClick={onToggleVisible}
      className="rounded-kern-small focus-visible:outline-kern-action-focus-default flex size-32 cursor-pointer items-center justify-center focus-visible:outline-4"
    >
      {/* KERN's icon rule sets its colour, so the design's action blue needs the `!` */}
      <span
        aria-hidden="true"
        className={`kern-icon bg-kern-action-default! ${visible ? 'kern-icon--visibility' : 'kern-icon--visibility-off'}`}
      />
      <span className="sr-only">{copy.showPassword}</span>
    </button>
  );

  return (
    <TextField
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      required
      autoComplete="current-password"
      value={value}
      onChange={onChange}
      invalid={invalid}
      aria-describedby={describedBy}
      trailing={toggle}
    />
  );
}
