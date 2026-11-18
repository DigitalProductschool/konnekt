import type { KeyboardEvent } from 'react';

import { useCopy } from '../../../../hooks/useLanguage';
import { focusMessageOnPress } from '../../../../utils/messageField';
import { RULE_EDITOR_COPY } from './constants';
import type { MessageFieldProps } from './types';

const MESSAGE_MAX_LENGTH = 500;

/**
 * The message citizens read when the rule isn't met (FR-004, F9): Figma "Rules/Message
 * placeholder" while it is empty (U30 6350:41266: "Message for citizens:" and "Suggested once you
 * choose a check. You can edit it.", FR-039, C2), "Rules/Error message" (editable, U30 6348:40757)
 * once it has a message, which follows the condition until it is written (C3). Flagged red while
 * it is missing after "Save rule" (FR-039). It grows
 * with the message; Enter adds no line break. kern.css gives every textarea a padding and a
 * 96px height, which the field doesn't have. Where the label leaves the field less than 160px,
 * as at 320px wide, the field wraps under the label instead of shrinking to nothing. A press on
 * the pencil or anywhere else in the field focuses the message, with the caret at its end.
 */
export default function MessageField({ id, message, errorId, onChange }: MessageFieldProps) {
  const copy = useCopy(RULE_EDITOR_COPY);
  const empty = message === '';
  const flagged = errorId !== undefined;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  return (
    <div
      onMouseDown={focusMessageOnPress}
      className={`rounded-kern-small has-[:focus-visible]:outline-kern-action-focus-default flex w-full flex-wrap items-center gap-8 py-8 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
        empty
          ? `border border-dashed px-16 ${flagged ? 'border-kern-feedback-danger' : 'border-(--kern-color-decorative-border-default)'}`
          : 'bg-kern-layout-background-hued pr-8 pl-16'
      }`}
    >
      <label
        htmlFor={id}
        className={`text-kern-static-small leading-(--kern-typography-line-height-medium-static) font-semibold ${empty ? 'text-kern-layout-text-muted' : 'text-kern-action-default'}`}
      >
        {copy.messageLabel}
      </label>
      <textarea
        id={id}
        rows={1}
        value={message}
        maxLength={MESSAGE_MAX_LENGTH}
        aria-invalid={flagged || undefined}
        aria-describedby={errorId}
        placeholder={copy.messagePlaceholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="text-kern-static-small text-kern-layout-text-default placeholder:text-kern-layout-text-muted field-sizing-content min-h-0! min-w-0 flex-1 basis-160 resize-none bg-transparent p-0! leading-(--kern-typography-line-height-medium-static) outline-none"
      />
      {!empty && (
        <span
          aria-hidden="true"
          className="kern-icon kern-icon--edit kern-icon--small bg-kern-action-default! shrink-0 cursor-pointer"
        />
      )}
    </div>
  );
}
