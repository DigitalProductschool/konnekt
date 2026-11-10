import { DEFAULT_LANGUAGE } from '@connection-portal/rules/language';
import {
  editedHiddenTextOf,
  failingValueHiddenTextOf,
} from '@connection-portal/rules/personas/messages';

import { TEST_STEP_COPY } from './constants';
import type { ValueRowProps } from './types';

/**
 * One row of the data card (S8.4; spec 008 F63, C6; Figma rows U65 7057:59071, 7057:59076,
 * 7057:59079, 7057:59084): a 1px decorative line above, 8px above and below, the label
 * (body/small, muted, 120px) and 16px further the value (body/small). A value read by a rule shown
 * as failing (K1; 7057:59073) has Figma's 6px red dot (7057:59074), 6px before it, and semibold
 * text; screen readers hear "Fails a rule:" before it, where the dot is (design-notes §4.2). A term
 * and its description, so a row reads "Date of birth: Fails a rule: 08.07.2007". A changed value
 * (K2; U03 7058:61193) continues its text with " · edited" in the same body/small style and
 * colour, in regular weight; screen readers hear the hidden ", edited" after the value instead
 * (design-notes §4.2). Below `sm` (a phone, or 200 % zoom) the label sits above the value, so
 * that the value isn't squeezed into a few letters a line (FR-010; no frame)
 */
export default function ValueRow({ label, text, failing, changed }: ValueRowProps) {
  return (
    <div className="text-kern-static-small flex flex-col border-t border-(--kern-color-decorative-border-default) py-8 leading-(--kern-typography-line-height-medium-static) sm:flex-row sm:items-center sm:gap-16">
      <dt className="text-kern-layout-text-muted shrink-0 break-words sm:w-120">{label}</dt>
      <dd className="text-kern-layout-text-default flex w-full min-w-0 flex-1 items-center gap-6">
        {failing && (
          <span
            aria-hidden="true"
            className="rounded-kern-circle bg-kern-feedback-danger size-6 shrink-0"
          />
        )}
        <span className={`min-w-0 flex-1 break-words ${failing ? 'font-semibold' : ''}`}>
          {/* TODO(009, T039): the language of the moment, here and for the edited text */}
          {failing && (
            <span className="sr-only">{failingValueHiddenTextOf(DEFAULT_LANGUAGE)} </span>
          )}
          {text}
          {changed && (
            <>
              <span aria-hidden="true" className="font-normal">
                {' '}
                {TEST_STEP_COPY.edited}
              </span>
              <span className="sr-only">{editedHiddenTextOf(DEFAULT_LANGUAGE)}</span>
            </>
          )}
        </span>
      </dd>
    </div>
  );
}
