import type { Language } from '@konnekt/rules/language';

import { COPY_TEXTS, INITIAL_COPY_STATE } from './constants';
import type { CopyableUrlVariant, CopyAction, CopyState, CopyTexts } from './types';

/**
 * A variant's button labels and announcements in a language ("Copy link", "Copied" / "Link
 * kopieren", "Kopiert"), with the texts a caller replaces, such as the token's "Token copied"
 */
export function copyTextsOf(
  variant: CopyableUrlVariant,
  language: Language,
  replaced: Partial<CopyTexts> = {}
): CopyTexts {
  return { ...COPY_TEXTS[language][variant], ...replaced };
}

/** Select an element's text, so that it can be copied by hand. */
export function selectText(element: HTMLElement): void {
  if (element instanceof HTMLInputElement) {
    element.select();
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Copy text to the clipboard; fails outside HTTPS and localhost, where there is none. */
export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('The clipboard is not available');
  }
  await navigator.clipboard.writeText(text);
}

/**
 * The copy's state: each attempt counts, so that copying again while the button reads "Copied"
 * restarts its 2 s; "reset" goes back to idle, which also empties the status region
 */
export function copyReducer(state: CopyState, action: CopyAction): CopyState {
  switch (action.type) {
    case 'copied':
      return { status: 'copied', attempt: state.attempt + 1 };
    case 'failed':
      return { status: 'failed', attempt: state.attempt + 1 };
    case 'reset':
      return { ...INITIAL_COPY_STATE, attempt: state.attempt };
  }
}

/** Whether a one-line text is cut with "…": its content is wider than its box */
export function isCut(box: { scrollWidth: number; clientWidth: number }): boolean {
  return box.scrollWidth > box.clientWidth;
}
