import FormErrorMessage from '../FormErrorMessage';
import type { TextFieldProps } from './types';

/**
 * A KERN text input whose label can carry an extra element, such as an (i) tooltip.
 * KernInput can't do that, and its error message has a fixed id that isn't linked to the
 * input; here the message is linked with aria-describedby and marks the input invalid.
 */
export default function TextField({
  id,
  label,
  labelAddon,
  error,
  ref,
  ...inputProps
}: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={`kern-form-input ${error ? 'kern-form-input--error' : ''}`}>
      <div className="mb-8 flex items-center gap-6">
        <label
          htmlFor={id}
          className="text-kern-static-medium text-kern-layout-text-default font-semibold"
        >
          {label}
        </label>
        {labelAddon}
      </div>
      <input
        ref={ref}
        id={id}
        className={`kern-form-input__input ${error ? 'kern-form-input__input--error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <div className="mt-8">
          <FormErrorMessage id={errorId} message={error} />
        </div>
      )}
    </div>
  );
}
