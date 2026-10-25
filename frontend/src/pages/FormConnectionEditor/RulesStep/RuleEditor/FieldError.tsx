import errorIcon from '../../../../assets/icons/emergency-home.svg';
import type { FieldErrorProps } from './types';

/** Figma "Rules/Field error" (6194:42227): a value's problem, under the check row (U25). */
export default function FieldError({ id, message }: FieldErrorProps) {
  return (
    <p
      id={id}
      className="text-kern-static-small text-kern-feedback-danger flex items-center gap-4 leading-(--kern-typography-line-height-medium-static)"
    >
      <img src={errorIcon} alt="" className="size-20 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
