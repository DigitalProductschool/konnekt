import type { AriaRole } from 'react';

export interface FormErrorMessageProps {
  message: string;
  id?: string;
  /** "alert" to announce a message that appears without a page change */
  role?: AriaRole;
}
