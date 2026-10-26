import type { KeyboardEvent } from 'react';

import { focusMessageOnPress } from '../../../../utils/messageField';
import { RULE_EDITOR_COPY } from './constants';
import type { MessageFieldProps } from './types';

const MESSAGE_MAX_LENGTH = 500;

/**
 * The error message applicants read (FR-004, F9): Figma "Rules/Message placeholder" while it is
 * empty (6348:40234), "Rules/Error message" (editable, 6092:3498) once it has a message. It grows
 * with the message; Enter adds no line break. kern.css gives every textarea a padding and a
 * 96px height, which the field doesn't have. Where the label leaves the field less than 160px,
 * as at 320px wide, the field wraps under the label instead of shrinking to nothing. A press on
 * the pencil or anywhere else in the field focuses the message, with the caret at its end.
 */
export default function MessageField({ id, message, errorId, onChange }: MessageFieldProps) {
  const empty = message === '';

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  return (
    <div
      onMouseDown={focusMessageOnPress}
      className={`rounded-kern-small has-[:focus-visible]:outline-kern-action-focus-default flex w-full flex-wrap items-center gap-8 py-8 has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 ${
        empty
          ? 'border border-dashed border-(--kern-color-decorative-border-default) px-16'
          : 'bg-kern-layout-background-hued pr-8 pl-16'
      }`}
    >
      <label
        htmlFor={id}
        className={`text-kern-static-small leading-(--kern-typography-line-height-medium-static) font-semibold ${empty ? 'text-kern-layout-text-muted' : 'text-kern-action-default'}`}
      >
        {RULE_EDITOR_COPY.messageLabel}
      </label>
      <textarea
        id={id}
        rows={1}
        value={message}
        maxLength={MESSAGE_MAX_LENGTH}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        placeholder={RULE_EDITOR_COPY.messagePlaceholder}
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
