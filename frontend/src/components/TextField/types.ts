import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'className'
> {
  id: string;
  label: string;
  /** Shown next to the label, such as an InfoToggletip */
  labelAddon?: ReactNode;
  /** The error message, shown under the field and linked to it */
  error?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}
