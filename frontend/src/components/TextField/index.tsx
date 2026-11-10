import { useCopy } from '../../hooks/useLanguage';
import FormErrorMessage from '../FormErrorMessage';
import {
  INPUT_CLASS,
  REQUIRED_MARKER,
  TEXT_FIELD_COPY,
  TEXTAREA_CLASS,
  TRAILING_PADDING_CLASS,
} from './constants';
import type {
  FieldDescription,
  TextAreaFieldProps,
  TextFieldProps,
  TextInputFieldProps,
} from './types';

/**
 * A KERN text field (design-notes §2, option a): `kern-form-input` with the overlay, as the kit
 * draws it (P33 base-input-field, base-textarea) and the screens compose it (U19 6699:45393):
 * the label row (the label, the design's "*" or "(optional)", an extra element such as an (i)
 * tooltip, 4 px apart), 8 px, then the field. A one-line input (text or password, with an
 * optional control at its right end) or, with `multiline`, the 120 px textarea with spell check.
 *
 * The error (the §3 "Field error" pattern, U19 6699:45398): the field in KERN's error state and
 * the message under it, linked with aria-describedby; the danger bar runs beside the field and
 * the message only, not the label, as U19 draws it. KernInput can't do this: its error has a
 * fixed id that isn't linked to the input, and its label takes no extra element.
 */
export default function TextField(props: TextFieldProps) {
  const { id, label, labelAddon, optional, requiredMark, hint, error, errorRole, invalid } = props;
  const copy = useCopy(TEXT_FIELD_COPY);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [hintId, errorId, props['aria-describedby']].filter(Boolean).join(' ') || undefined;
  const description: FieldDescription = {
    hintId,
    errorId,
    describedBy,
    invalid: Boolean(error) || Boolean(invalid),
  };

  return (
    <div className="kern-form-input">
      <div className={`flex items-center gap-4 ${hint ? '' : 'mb-8'}`}>
        <label
          htmlFor={id}
          className="text-kern-static-medium text-kern-layout-text-default font-semibold"
        >
          {label}
          {requiredMark && (
            <span aria-hidden="true" className="text-kern-feedback-danger">
              {REQUIRED_MARKER}
            </span>
          )}
          {optional && ` (${copy.optional})`}
        </label>
        {labelAddon}
      </div>
      {hint && (
        <div id={hintId} className="kern-hint">
          {hint}
        </div>
      )}
      <div className={`flex flex-col self-stretch ${error ? 'kern-form-input--error' : ''}`}>
        {props.multiline ? (
          <TextAreaControl {...props} description={description} />
        ) : (
          <TextInputControl {...props} description={description} />
        )}
        {error && <FormErrorMessage id={errorId} message={error} role={errorRole} />}
      </div>
    </div>
  );
}

/** The one-line input, in a wrapper that places the trailing control inside the field */
function TextInputControl({
  description,
  trailing,
  ref,
  label: _label,
  labelAddon: _labelAddon,
  optional: _optional,
  requiredMark: _requiredMark,
  hint: _hint,
  error: _error,
  errorRole: _errorRole,
  invalid: _invalid,
  multiline: _multiline,
  ...inputProps
}: TextInputFieldProps & { description: FieldDescription }) {
  const input = (
    <input
      ref={ref}
      {...inputProps}
      className={`${INPUT_CLASS} ${description.invalid ? 'kern-form-input__input--error' : ''} ${
        trailing ? TRAILING_PADDING_CLASS : ''
      }`}
      aria-invalid={description.invalid || undefined}
      aria-describedby={description.describedBy}
    />
  );
  if (!trailing) {
    return input;
  }
  return (
    <div className="relative">
      {input}
      <span className="absolute inset-y-0 right-4 flex items-center">{trailing}</span>
    </div>
  );
}

/** Figma "Form/Textarea": spell check on unless a caller turns it off (FR-032) */
function TextAreaControl({
  description,
  ref,
  spellCheck = true,
  label: _label,
  labelAddon: _labelAddon,
  optional: _optional,
  requiredMark: _requiredMark,
  hint: _hint,
  error: _error,
  errorRole: _errorRole,
  invalid: _invalid,
  multiline: _multiline,
  ...textareaProps
}: TextAreaFieldProps & { description: FieldDescription }) {
  return (
    <textarea
      ref={ref}
      spellCheck={spellCheck}
      {...textareaProps}
      className={`${TEXTAREA_CLASS} ${description.invalid ? 'kern-form-input__input--error' : ''}`}
      aria-invalid={description.invalid || undefined}
      aria-describedby={description.describedBy}
    />
  );
}
