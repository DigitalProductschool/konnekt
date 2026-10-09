import errorIcon from '../../assets/icons/emergency-home.svg';
import type { FormErrorMessageProps } from './types';

/** Figma "Form/Error message": the danger icon and a bold message. */
export default function FormErrorMessage({ message, id, role }: FormErrorMessageProps) {
  return (
    <p
      id={id}
      role={role}
      className="text-kern-static-small text-kern-feedback-danger flex items-start gap-8 leading-(--kern-typography-line-height-medium-static) font-semibold"
    >
      <img src={errorIcon} alt="" className="mt-2 size-20 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
