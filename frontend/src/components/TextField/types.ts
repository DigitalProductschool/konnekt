import type { AriaRole, InputHTMLAttributes, ReactNode, Ref } from 'react';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'className'
> {
  id: string;
  label: string;
  /** Shown next to the label, such as an InfoTooltip */
  labelAddon?: ReactNode;
  /** Marks the field as optional after its label, as KERN does */
  optional?: boolean;
  /** The error message, shown under the field and linked to it */
  error?: ReactNode;
  /** "alert" to announce the error as it appears, also while the field keeps the focus */
  errorRole?: AriaRole;
  ref?: Ref<HTMLInputElement>;
}
