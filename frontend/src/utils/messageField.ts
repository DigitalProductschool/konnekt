// The message fields of the rule editor and of a group draw a pencil beside their textarea. The
// pencil is not a control of its own (aria-hidden, no tab stop): a press on it, or anywhere else
// in the field's box, puts the focus into the textarea, ready to type

import type { MouseEvent } from 'react';

/**
 * Mousedown handler for the box around a message's textarea: a primary press outside the
 * textarea (the pencil, the label, the padding) focuses it with the caret at the end of the text.
 * A press on the textarea itself keeps the browser's own caret placement
 */
export function focusMessageOnPress(event: MouseEvent<HTMLElement>) {
  const textarea = event.currentTarget.querySelector('textarea');
  if (event.button !== 0 || !textarea || textarea.contains(event.target as Node)) {
    return;
  }
  event.preventDefault();
  textarea.focus();
  const end = textarea.value.length;
  textarea.setSelectionRange(end, end);
}
