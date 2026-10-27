import { useEffect, useRef } from 'react';

import { isUndoShortcut, keepsOwnUndo } from '../utils/undoShortcut';

/**
 * Calls `onUndo` on Ctrl+Z or Cmd+Z while `enabled`, unless the focus is in a text field, which
 * keeps the browser's own undo, or a modal dialog is open.
 */
export function useUndoShortcut(enabled: boolean, onUndo: () => void): void {
  const undoRef = useRef(onUndo);

  useEffect(() => {
    undoRef.current = onUndo;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        !isUndoShortcut(event) ||
        keepsOwnUndo(document.activeElement as HTMLElement | null) ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }
      event.preventDefault();
      undoRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
