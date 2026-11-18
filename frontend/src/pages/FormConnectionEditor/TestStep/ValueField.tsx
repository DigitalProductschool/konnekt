import { type ChangeEvent, useLayoutEffect, useRef } from 'react';

import FieldFrame from './FieldFrame';
import type { ValueFieldProps } from './types';
import { dateEntryOf, errorIdOf } from './utils';

/**
 * A persona's text, whole number or date as a KERN text input (S8.5; FR-006; Figma "Field · Date
 * of birth" 7058:60656, 48px high, 2px bottom border, 4px radius; invalid 7058:60812, W11). A date
 * is typed as `dd.mm.yyyy` and a number as digits, both with `inputmode="numeric"` (R16). An
 * invalid entry shows its error under the field (`aria-invalid`, `aria-describedby`); the field
 * keeps what was typed, and the persona its last valid value (FR-008). Clearing the field makes
 * the value empty.
 *
 * A date puts in its dots as the user types (bug v5-ui-fixes B5, 2026-11-18; `dateEntryOf()`):
 * "08072007", typed or pasted, becomes "08.07.2007", Backspace over a dot takes the digit before
 * it, and an edit in the middle stays as typed until it is complete. When the field's text isn't
 * what the browser holds, React writes it and moves the caret to the end, so the caret is put
 * back after that render
 */
export default function ValueField({ id, label, text, kind, error, onChange }: ValueFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Where the caret goes once the masked text is in the field
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const caret = caretRef.current;
    const input = inputRef.current;
    caretRef.current = null;
    if (caret !== null && input && input === document.activeElement) {
      input.setSelectionRange(caret, caret);
    }
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value;
    if (kind !== 'date') {
      onChange(typed);
      return;
    }
    const native = event.nativeEvent;
    const inputType = native instanceof InputEvent ? native.inputType : undefined;
    const entry = dateEntryOf(
      text,
      typed,
      event.target.selectionStart ?? typed.length,
      inputType === 'deleteContentForward' ? 'forward' : 'backward'
    );
    // The browser's caret holds when the text is what it typed, or the same as before (React
    // puts the old text back without a render)
    caretRef.current = entry.text === typed || entry.text === text ? null : entry.caret;
    onChange(entry.text);
  }

  return (
    <FieldFrame id={id} label={label} error={error}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={kind === 'number' || kind === 'date' ? 'numeric' : undefined}
        autoComplete="off"
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorIdOf(id) : undefined}
        className={`kern-form-input__input ${error ? 'kern-form-input__input--error' : ''}`}
        onChange={handleChange}
      />
    </FieldFrame>
  );
}
