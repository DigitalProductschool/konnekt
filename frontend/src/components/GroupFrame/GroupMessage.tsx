import type { KeyboardEvent } from 'react';

import { useCopy } from '../../hooks/useLanguage';
import { focusMessageOnPress } from '../../utils/messageField';
import { INACTIVE_OPACITY } from '../BranchMark/constants';
import { GROUP_FRAME_COPY, GROUP_MESSAGE_MAX_LENGTH } from './constants';
import type { GroupMessageProps } from './types';

/**
 * The group's own message card right under its header (U35 6324:39410; W6, FR-037): on
 * `feedback-info-background` with a 1px `decorative-border` and radius 8, padding 8 16, "Rules/
 * Error message" editable=true (the label "Message for citizens:" in `label/small`
 * `feedback-info`, the message in `body/small`, the 20px pencil in `feedback-info`; padding 8 8 8
 * 16, radius 4) over "Rules/Hint" (the 20px info icon in `feedback-info` and the muted hint), 8px
 * apart. Given a field, the message is edited in place: it grows with the text, Enter adds no
 * line break, and kern.css's textarea padding and height don't apply. Where the label leaves the
 * field less than 160px, as at 320px wide, the field wraps under the label instead of shrinking
 * to nothing. A press on the pencil or anywhere else in the field focuses the message, with the
 * caret at its end. In a removed group, or inside one, the card fades (U47 6185:41171).
 */
export default function GroupMessage({ message, field, faded = false }: GroupMessageProps) {
  const copy = useCopy(GROUP_FRAME_COPY);
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  const labelClasses =
    'text-kern-static-small text-kern-feedback-info leading-(--kern-typography-line-height-medium-static) font-semibold';
  return (
    <div
      className={`rounded-kern-default bg-kern-feedback-info-background flex flex-col gap-8 border border-(--kern-color-decorative-border-default) px-16 py-8 ${faded ? INACTIVE_OPACITY : ''}`}
    >
      <div
        onMouseDown={field ? focusMessageOnPress : undefined}
        className="rounded-kern-small has-[:focus-visible]:outline-kern-action-focus-default flex flex-wrap items-center gap-8 py-8 pr-8 pl-16 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
      >
        {field ? (
          <>
            <label htmlFor={field.id} className={labelClasses}>
              {copy.messageLabel}
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
              className="kern-icon kern-icon--edit kern-icon--small bg-kern-feedback-info! shrink-0 cursor-pointer"
            />
          </>
        ) : (
          <p className="text-kern-static-small min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static)">
            <span className={`${labelClasses} mr-8`}>{copy.messageLabel}</span>
            <span className="text-kern-layout-text-default break-words">{message}</span>
          </p>
        )}
      </div>
      <p className="text-kern-static-small text-kern-layout-text-muted flex items-center gap-8 leading-(--kern-typography-line-height-medium-static)">
        <span
          aria-hidden="true"
          className="kern-icon kern-icon--info kern-icon--small bg-kern-feedback-info! shrink-0"
        />
        {copy.messageHint}
      </p>
    </div>
  );
}
