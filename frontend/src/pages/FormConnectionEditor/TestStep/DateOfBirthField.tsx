import { TEST_STEP_COPY } from './constants';
import type { DateOfBirthFieldProps } from './types';
import ValueField from './ValueField';

/**
 * A date of birth with "Age today" beside it (S8.5; FR-007, F10; Figma "Row" 7058:60655: two
 * fields of equal width, 16px apart, "Field · Date of birth" 7058:60656 and "Field · Age today"
 * 7058:60657), which wrap under each other where the card is too narrow for two (below 296px
 * inside). Either changes the other: a valid date gives the age it gives today, a valid age
 * gives a date of birth with that age today (`dateOfBirthForAge()`). Figma draws "Age today" as a
 * field without fill and with a 1px border, as if it were read-only; F10 and FR-007 make it an
 * input like the date, so it looks like one
 */
export default function DateOfBirthField({
  id,
  label,
  dateText,
  dateError,
  ageText,
  ageError,
  onDateChange,
  onAgeChange,
}: DateOfBirthFieldProps) {
  return (
    <div className="flex flex-wrap gap-16">
      <div className="narrow:min-w-0 narrow:basis-full min-w-140 flex-1">
        <ValueField
          id={id}
          label={label}
          text={dateText}
          kind="date"
          error={dateError}
          onChange={onDateChange}
        />
      </div>
      <div className="narrow:min-w-0 narrow:basis-full min-w-140 flex-1">
        <ValueField
          id={`${id}-age`}
          label={TEST_STEP_COPY.ageToday}
          text={ageText}
          kind="number"
          error={ageError}
          onChange={onAgeChange}
        />
      </div>
    </div>
  );
}
