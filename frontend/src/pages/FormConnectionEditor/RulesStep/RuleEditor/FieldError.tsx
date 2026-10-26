import errorIcon from '../../../../assets/icons/emergency-home.svg';
import type { FieldErrorProps } from './types';

/**
 * Figma "Rules/Field error" (6194:42227): a value's problem, under the check row (U25), or what
 * keeps the rule from being saved. Given `alert`, it is announced as it appears.
 */
export default function FieldError({ id, message, alert = false }: FieldErrorProps) {
  return (
    <p
      id={id}
      role={alert ? 'alert' : undefined}
      className="text-kern-static-small text-kern-feedback-danger flex items-center gap-4 leading-(--kern-typography-line-height-medium-static)"
    >
      <img src={errorIcon} alt="" className="size-20 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
