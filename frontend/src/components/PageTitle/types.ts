import type { Ref } from 'react';

export interface PageTitleProps {
  title: string;
  /** One line of explanation under the title */
  hint?: string;
  /** The heading, so that a page can move the focus to it after its content changed */
  ref?: Ref<HTMLHeadingElement>;
}
