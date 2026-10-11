import type { AriaRole, ReactNode } from 'react';

export interface FormErrorMessageProps {
  /** Text, or inline content such as an ErrorNoticeText */
  message: ReactNode;
  id?: string;
  /** "alert" to announce a message that appears without a page change */
  role?: AriaRole;
}
