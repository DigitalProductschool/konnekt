import type { KeyboardEvent } from 'react';

import { GROUP_FRAME_COPY, GROUP_MESSAGE_MAX_LENGTH } from './constants';
import type { GroupMessageProps } from './types';

/**
 * The group's own error message under its header (U14 6324:39410; W6): "Rules/Error message"
 * in the info colours, and its hint. Given a field, the message is edited in place: it grows
 * with the text, Enter adds no line break, and kern.css's textarea padding and height don't
 * apply. Where the label leaves the field less than 160px, as at 320px wide, the field wraps
 * under the label instead of shrinking to nothing.
 */
export default function GroupMessage({ message, field }: GroupMessageProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  const labelClasses =
    'text-kern-static-small text-kern-feedback-info leading-(--kern-typography-line-height-medium-static) font-semibold';
  return (
    // Figma draws the card with a fixed 8px radius, which is KERN 2.8's large one
    <div className="rounded-kern-large bg-kern-feedback-info-background flex flex-col gap-8 border border-(--kern-color-decorative-border-default) px-16 py-8">
      <div className="rounded-kern-small has-[:focus-visible]:outline-kern-action-focus-default flex flex-wrap items-center gap-8 py-8 pr-8 pl-16 has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2">
        {field ? (
          <>
            <label htmlFor={field.id} className={labelClasses}>
              {GROUP_FRAME_COPY.messageLabel}
            </label>
            <textarea
              id={field.id}
              rows={1}
              value={message}
              maxLength={GROUP_MESSAGE_MAX_LENGTH}
              onChange={(event) => field.onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              className="text-kern-static-small text-kern-layout-text-default field-sizing-content min-h-0! min-w-0 flex-1 basis-160 resize-none bg-transparent p-0! leading-(--kern-typography-line-height-medium-static) outline-none"
            />
            <span
              aria-hidden="true"
              className="kern-icon kern-icon--edit kern-icon--small bg-kern-feedback-info! shrink-0"
            />
          </>
        ) : (
          <p className="text-kern-static-small min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static)">
            <span className={`${labelClasses} mr-8`}>{GROUP_FRAME_COPY.messageLabel}</span>
            <span className="text-kern-layout-text-default break-words">{message}</span>
          </p>
        )}
      </div>
      <p className="text-kern-static-small text-kern-layout-text-muted flex items-center gap-8 leading-(--kern-typography-line-height-medium-static)">
        <span
          aria-hidden="true"
          className="kern-icon kern-icon--info kern-icon--small bg-kern-layout-text-muted! shrink-0"
        />
        {GROUP_FRAME_COPY.messageHint}
      </p>
    </div>
  );
}
