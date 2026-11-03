import { TEST_STEP_COPY } from './constants';
import FieldFrame from './FieldFrame';
import type { ChoiceFieldProps } from './types';
import { entryTextOf } from './utils';

/**
 * One value of a set as a KERN select of the set's labels (S8.5; FR-006, F12; Figma 7058:60663
 * "Nationality", hidden there). The first option, "Not shared", clears the value. A value outside
 * the set (a generated one the set doesn't list) is kept as an option of its own after the others,
 * so that the field shows what the persona has
 */
export default function ChoiceField({ id, label, choices, value, onChange }: ChoiceFieldProps) {
  const current = entryTextOf('enum', value);
  const outside = current !== '' && !choices.some((choice) => String(choice.value) === current);
  return (
    <FieldFrame id={id} label={label} error={null}>
      <div className="kern-form-input__select-wrapper">
        <select
          id={id}
          value={current}
          className="kern-form-input__select"
          onChange={(event) => {
            const chosen = choices.find((choice) => String(choice.value) === event.target.value);
            onChange(chosen ? chosen.value : event.target.value === '' ? null : event.target.value);
          }}
        >
          <option value="">{TEST_STEP_COPY.notShared}</option>
          {choices.map((choice) => (
            <option key={choice.value} value={String(choice.value)}>
              {choice.label}
            </option>
          ))}
          {outside && <option value={current}>{current}</option>}
        </select>
      </div>
    </FieldFrame>
  );
}
