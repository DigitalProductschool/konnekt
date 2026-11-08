import type { AriaRole, InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from 'react';

/** What every kind of field has: the label row, the hint and the error */
interface TextFieldBaseProps {
  id: string;
  label: string;
  /** Shown next to the label, such as an InfoTooltip */
  labelAddon?: ReactNode;
  /** Adds "(optional)" to the label, as part of the field's accessible name */
  optional?: boolean;
  /**
   * The design's red "*" after the label of a required field (U19, the variant dialog). Only
   * for the eye: `required` on the field tells assistive technology. The sign-in fields are
   * required but draw no marker (U10), so it is a choice of its own.
   */
  requiredMark?: boolean;
  /** A hint between the label and the field, linked to the field */
  hint?: ReactNode;
  /** The error message, shown under the field and linked to it; marks the field invalid */
  error?: ReactNode;
  /** "alert" to announce the error as it appears, also while the field keeps the focus */
  errorRole?: AriaRole;
  /**
   * Marks the field invalid without a message of its own, where the message is elsewhere,
   * such as the sign-in's alert above both fields (F16)
   */
  invalid?: boolean;
}

/** A one-line text or password input (KERN `kern-form-input__input`) */
export interface TextInputFieldProps
  extends
    TextFieldBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'children'> {
  multiline?: false;
  /**
   * A control inside the field at its right end, such as the password field's show/hide
   * toggle (FR-051 (29)); the text keeps clear of it
   */
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/** The multi-line text field (Figma "Form/Textarea", 120 px tall; spell check on, FR-032) */
export interface TextAreaFieldProps
  extends
    TextFieldBaseProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className' | 'children'> {
  multiline: true;
  ref?: Ref<HTMLTextAreaElement>;
}

export type TextFieldProps = TextInputFieldProps | TextAreaFieldProps;

/** The ids and ARIA attributes that link a field to its hint and error */
export interface FieldDescription {
  hintId?: string;
  errorId?: string;
  describedBy?: string;
  invalid: boolean;
}
