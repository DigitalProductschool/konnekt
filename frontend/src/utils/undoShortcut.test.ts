import { describe, expect, it } from 'vitest';

import { isUndoShortcut, keepsOwnUndo } from './undoShortcut';

const KEYS = {
  key: 'z',
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  repeat: false,
};

describe('isUndoShortcut (B4)', () => {
  it('takes Ctrl+Z and Cmd+Z, also with Caps Lock', () => {
    expect(isUndoShortcut({ ...KEYS, ctrlKey: true })).toBe(true);
    expect(isUndoShortcut({ ...KEYS, metaKey: true })).toBe(true);
    expect(isUndoShortcut({ ...KEYS, key: 'Z', ctrlKey: true })).toBe(true);
  });

  it('ignores Z alone, redo, other modifiers, other keys and a held key', () => {
    expect(isUndoShortcut(KEYS)).toBe(false);
    expect(isUndoShortcut({ ...KEYS, ctrlKey: true, shiftKey: true })).toBe(false);
    expect(isUndoShortcut({ ...KEYS, ctrlKey: true, altKey: true })).toBe(false);
    expect(isUndoShortcut({ ...KEYS, ctrlKey: true, metaKey: true })).toBe(false);
    expect(isUndoShortcut({ ...KEYS, key: 'y', ctrlKey: true })).toBe(false);
    expect(isUndoShortcut({ ...KEYS, ctrlKey: true, repeat: true })).toBe(false);
  });
});

describe('keepsOwnUndo (B4)', () => {
  it('leaves the shortcut to text fields', () => {
    expect(keepsOwnUndo({ tagName: 'TEXTAREA' })).toBe(true);
    expect(keepsOwnUndo({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(keepsOwnUndo({ tagName: 'INPUT', type: 'search' })).toBe(true);
    expect(keepsOwnUndo({ tagName: 'INPUT' })).toBe(true);
    expect(keepsOwnUndo({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('undoes the rules from buttons, checkboxes, the page and nowhere', () => {
    expect(keepsOwnUndo({ tagName: 'BUTTON' })).toBe(false);
    expect(keepsOwnUndo({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(keepsOwnUndo({ tagName: 'BODY', isContentEditable: false })).toBe(false);
    expect(keepsOwnUndo(null)).toBe(false);
  });
});
