/** Select an element's text, so that it can be copied by hand. */
export function selectText(element: HTMLElement): void {
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
