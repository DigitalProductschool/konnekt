import FormErrorMessage from '../FormErrorMessage';
import { OPTIONAL_MARKER } from './constants';
import type { TextFieldProps } from './types';

/**
 * A KERN text input whose label can carry an extra element, such as an (i) tooltip.
 * KernInput can't do that, and its error message has a fixed id that isn't linked to the
 * input; here the message is linked with aria-describedby and marks the input invalid.
 * The optional marker sits inside the label, so it is part of the input's accessible name.
 * KERN colours it through `.kern-form-input .kern-label__optional`; the label lacks
 * `kern-label`, so its `.kern-label:has(.kern-label__optional)` layout (flex, 8px gap) is
 * reproduced with Tailwind classes.
 */
export default function TextField({
  id,
  label,
  labelAddon,
  optional,
  error,
  errorRole,
  ref,
  ...inputProps
}: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={`kern-form-input ${error ? 'kern-form-input--error' : ''}`}>
      <div className="mb-8 flex items-center gap-6">
        <label
          htmlFor={id}
          className={`text-kern-static-medium text-kern-layout-text-default font-semibold ${
            optional ? 'flex flex-wrap items-center gap-x-8' : ''
          }`}
        >
          {label}
          {optional && (
            <>
              {' '}
              <span className="kern-label__optional">{OPTIONAL_MARKER}</span>
            </>
          )}
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
          <FormErrorMessage id={errorId} message={error} role={errorRole} />
        </div>
      )}
    </div>
  );
}
