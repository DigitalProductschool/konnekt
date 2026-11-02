import FieldFrame from './FieldFrame';
import type { ValueFieldProps } from './types';
import { errorIdOf } from './utils';

/**
 * A persona's text, whole number or date as a KERN text input (S8.5; FR-006; Figma "Field · Date
 * of birth" 7058:60656, 48px high, 2px bottom border, 4px radius; invalid 7058:60812, W11). A date
 * is typed as `dd.mm.yyyy` and a number as digits, both with `inputmode="numeric"` (R16). An
 * invalid entry shows its error under the field (`aria-invalid`, `aria-describedby`); the field
 * keeps what was typed, and the persona its last valid value (FR-008). Clearing the field makes
 * the value empty
 */
export default function ValueField({ id, label, text, kind, error, onChange }: ValueFieldProps) {
  return (
    <FieldFrame id={id} label={label} error={error}>
      <input
        id={id}
        type="text"
        inputMode={kind === 'number' || kind === 'date' ? 'numeric' : undefined}
        autoComplete="off"
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorIdOf(id) : undefined}
        className={`kern-form-input__input ${error ? 'kern-form-input__input--error' : ''}`}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldFrame>
  );
}
