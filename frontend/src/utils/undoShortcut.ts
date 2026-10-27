// Ctrl+Z, or Cmd+Z on a Mac, undoes the Rules step's last change while its Undo stands, also
// after the toast that offered it has gone (B4: every toast goes after 6 seconds). Text fields
// keep the browser's own undo of what was typed

/** The keys of a keydown event the shortcut looks at. */
export interface ShortcutKeys {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
}

/** The parts of the focused element that tell whether it takes typed text. */
export interface FocusedElement {
  tagName: string;
  type?: string;
  isContentEditable?: boolean;
}

// Inputs that don't take typed text, and so have no undo of their own
const INPUTS_WITHOUT_TEXT = ['button', 'checkbox', 'color', 'file', 'radio', 'reset', 'submit'];

/** Ctrl+Z or Cmd+Z alone; Shift+Ctrl+Z redoes elsewhere, and a held key doesn't repeat it. */
export function isUndoShortcut({ key, ctrlKey, metaKey, shiftKey, altKey, repeat }: ShortcutKeys) {
  return key.toLowerCase() === 'z' && ctrlKey !== metaKey && !shiftKey && !altKey && !repeat;
}

/** Whether the focus is in a field that undoes typing itself, where the shortcut stays its own. */
export function keepsOwnUndo(element: FocusedElement | null): boolean {
  if (!element) {
    return false;
  }
  switch (element.tagName) {
    case 'TEXTAREA':
    case 'SELECT':
      return true;
    case 'INPUT':
      return !INPUTS_WITHOUT_TEXT.includes(element.type ?? 'text');
    default:
      return element.isContentEditable === true;
  }
}
