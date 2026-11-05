import {
  editedHiddenText,
  failingValueHiddenText,
} from '@connection-portal/rules/personas/messages';

import { TEST_STEP_COPY } from './constants';
import type { ValueRowProps } from './types';

/**
 * One value of the data card (S8.4; Figma rows 7057:59071, 7057:59076; U08 7058:61711): a 1px
 * decorative line above, 8px above and below, the label (body/small, muted, 120px) and 16px
 * further the value (body/small). A value read by a rule shown as failing (K1; 7057:59073) has
 * Figma's 6px red dot (7057:59074), 6px before it, and bold text; screen readers hear "Fails a
 * rule:" before it, where the dot is (design-notes §4.2). A term and its description, so a row
 * reads "Date of birth (Age): Fails a rule: 08.07.2007 (age 19)". A changed value (K2; U03
 * 7058:61193) continues its text with " · edited" in the same body/small style and colour, in
 * regular weight; screen readers hear the hidden ", edited" after the value instead (design-notes
 * §4.2)
 */
export default function ValueRow({ field, text, failing, changed }: ValueRowProps) {
  return (
    <div className="text-kern-static-small flex items-center gap-16 border-t border-(--kern-color-decorative-border-default) py-8 leading-(--kern-typography-line-height-medium-static)">
      <dt className="text-kern-layout-text-muted w-120 shrink-0 break-words">{field.label}</dt>
      <dd className="text-kern-layout-text-default flex min-w-0 flex-1 items-center gap-6">
        {failing && (
          <span
            aria-hidden="true"
            className="rounded-kern-circle bg-kern-feedback-danger size-6 shrink-0"
          />
        )}
        <span className={`min-w-0 flex-1 break-words ${failing ? 'font-semibold' : ''}`}>
          {failing && <span className="sr-only">{failingValueHiddenText} </span>}
          {text}
          {changed && (
            <>
              <span aria-hidden="true" className="font-normal">
                {' '}
                {TEST_STEP_COPY.edited}
              </span>
              <span className="sr-only">{editedHiddenText}</span>
            </>
          )}
        </span>
      </dd>
    </div>
  );
}
