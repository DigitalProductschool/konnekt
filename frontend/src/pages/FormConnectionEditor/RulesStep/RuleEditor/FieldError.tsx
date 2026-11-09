import type { FieldErrorProps } from './types';

/**
 * Figma "Rules/Field error" (6194:42227; U49 6196:10249, 6196:10533): a value's problem, or what
 * keeps the rule from being saved, under the check row (U25): KERN's danger icon, small (20px,
 * `icon-emergency_home-small`), and body/small in the danger colour, 4px apart. Given `alert`,
 * it is announced as it appears.
 */
export default function FieldError({ id, message, alert = false }: FieldErrorProps) {
  return (
    <p
      id={id}
      role={alert ? 'alert' : undefined}
      className="text-kern-static-small text-kern-feedback-danger flex items-center gap-4 leading-(--kern-typography-line-height-medium-static)"
    >
      <span
        aria-hidden="true"
        className="kern-icon kern-icon--danger kern-icon--small bg-kern-feedback-danger! shrink-0"
      />
      <span>{message}</span>
    </p>
  );
}
