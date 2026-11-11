import { useId } from 'react';

import { useCopy } from '../../hooks/useLanguage';
import ActiveFromRadio from './ActiveFromRadio';
import {
  ACTIVE_FROM_CLASSES,
  ACTIVE_FROM_COPY,
  DATE_ERROR_CLASSES,
  DATE_FIELD_CLASSES,
} from './constants';
import type { ActiveFrom, ActiveFromChoiceProps } from './types';

/**
 * C2, "Active from" (Figma "Dialog content/Publish · summary", its "Go live" row: U75
 * 6376:25536 "Now", 6383:66119 "On a date"; U76 6635:36265 the error; F3, W1, W16), for the
 * publish dialog (S14), "Change start date" (S15) and "Activate this connection again?" (S17).
 *
 * A fieldset whose legend is "Active from", with the radios "Now" and "On a date" on one row;
 * with "On a date" the date field under them, its placeholder "DD.MM.YYYY" and its name for
 * screen readers "Start date (DD.MM.YYYY)" (copy.md §2); with `error` the field's red line and
 * "Enter a date after today." under it, linked to the field and announced with `errorRole`
 * "alert"; then the caller's hint for the choice, if any. Native radios: Tab reaches the
 * group, the arrow keys choose.
 *
 * It holds no state: the choice, the text and the error are the caller's (`startDateOf()` turns
 * the text into the day or the error), so that a dialog's reducer keeps them through a failure.
 */
export default function ActiveFromChoice({
  choice,
  text,
  error,
  errorRole,
  hint,
  nowLabel,
  disabled = false,
  fieldRef,
  onChoiceChange,
  onTextChange,
}: ActiveFromChoiceProps) {
  const copy = useCopy(ACTIVE_FROM_COPY);
  const id = useId();
  const fieldId = `${id}-date`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const onDate = choice === 'date';
  const showHint = hint !== undefined && hint !== null && hint !== '';

  function select(value: ActiveFrom) {
    return () => onChoiceChange(value);
  }

  return (
    // The hint describes the group, which a screen reader announces on entering it
    <fieldset
      aria-describedby={showHint ? hintId : undefined}
      className={ACTIVE_FROM_CLASSES.group}
    >
      <legend className={ACTIVE_FROM_CLASSES.legend}>{copy.legend}</legend>
      <div className={ACTIVE_FROM_CLASSES.choice}>
        <div className={ACTIVE_FROM_CLASSES.radios}>
          <ActiveFromRadio
            name={id}
            value="now"
            label={nowLabel ?? copy.now}
            checked={!onDate}
            disabled={disabled}
            onSelect={select('now')}
          />
          <ActiveFromRadio
            name={id}
            value="date"
            label={copy.onDate}
            checked={onDate}
            disabled={disabled}
            onSelect={select('date')}
          />
        </div>
        {onDate && (
          <input
            ref={fieldRef}
            id={fieldId}
            type="text"
            value={text}
            placeholder={copy.placeholder}
            aria-label={copy.fieldLabel}
            aria-invalid={error || undefined}
            aria-describedby={error ? errorId : undefined}
            autoComplete="off"
            disabled={disabled}
            onChange={(event) => onTextChange(event.target.value)}
            className={`${DATE_FIELD_CLASSES.base} ${
              error ? DATE_FIELD_CLASSES.invalid : DATE_FIELD_CLASSES.valid
            }`}
          />
        )}
        {onDate && error && (
          <p id={errorId} role={errorRole} className={DATE_ERROR_CLASSES.message}>
            <span aria-hidden="true" className={DATE_ERROR_CLASSES.icon} />
            <span>{copy.dateError}</span>
          </p>
        )}
        {showHint && (
          <p id={hintId} className={ACTIVE_FROM_CLASSES.hint}>
            {hint}
          </p>
        )}
      </div>
    </fieldset>
  );
}
