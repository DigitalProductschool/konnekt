import Checkbox from '../../../../components/Checkbox';
import ValuesPicker from '../../../../components/ValuesPicker';
import type { ValuesPickerCopy } from '../../../../components/ValuesPicker/types';
import { valueChoices } from '../../../../components/ValuesPicker/utils';
import ChoicePicker from './ChoicePicker';
import { MENU_WIDTHS, RULE_EDITOR_COPY } from './constants';
import type { ConditionFieldsProps } from './types';
import { parseCount, parseNumber, yearsSuffix } from './utils';
import ValueInput from './ValueInput';

const VALUES_COPY: ValuesPickerCopy = {
  menu: RULE_EDITOR_COPY.valuesMenu,
  placeholder: RULE_EDITOR_COPY.chooseOptions,
  searchClasses: RULE_EDITOR_COPY.searchClasses,
  searchOptions: RULE_EDITOR_COPY.searchOptions,
  footer: RULE_EDITOR_COPY.selectAtLeastOne,
  noMatch: RULE_EDITOR_COPY.noMatch,
};

const UNIT_SECTIONS = [
  {
    key: 'units',
    choices: [
      { key: 'years', label: RULE_EDITOR_COPY.years },
      { key: 'months', label: RULE_EDITOR_COPY.months },
    ],
  },
];

const SUFFIX_CLASSES =
  'text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) whitespace-nowrap';

/**
 * The values a check takes, after its picker in the check row (S3): a number (F6), a text with
 * its letter-case checkbox (F7), the values of a set (F8, F32), a date, or a number of years or
 * months with its fixed words or unit (F1–F3).
 */
export default function ConditionFields({
  idBase,
  definition,
  condition,
  dateOfBirth,
  optionSet,
  classes,
  errorId,
  problemField,
  state,
  dispatch,
  onChange,
}: ConditionFieldsProps) {
  const describedBy = (field: string) => (problemField === field ? errorId : undefined);
  const typed = (field: 'value' | 'years' | 'amount', number: number | null | undefined) =>
    state.typed[field] ?? (number === null || number === undefined ? '' : String(number));

  switch (definition.input) {
    case 'number':
      return (
        <ValueInput
          id={`${idBase}-value`}
          label={RULE_EDITOR_COPY.numberLabel}
          value={typed('value', typeof condition.value === 'number' ? condition.value : null)}
          inputMode="decimal"
          invalid={problemField === 'value'}
          describedBy={describedBy('value')}
          widthClass="min-w-64 field-sizing-content"
          onChange={(text) => {
            dispatch({ type: 'type', field: 'value', text });
            onChange({ ...condition, value: parseNumber(text) });
          }}
          onBlur={() => dispatch({ type: 'touch', field: 'value' })}
        />
      );
    case 'text':
      return (
        <>
          <ValueInput
            id={`${idBase}-value`}
            label={RULE_EDITOR_COPY.textLabel}
            value={typeof condition.value === 'string' ? condition.value : ''}
            invalid={problemField === 'value'}
            describedBy={describedBy('value')}
            widthClass="min-w-140 max-w-full field-sizing-content"
            onChange={(text) => onChange({ ...condition, value: text })}
            onBlur={() => dispatch({ type: 'touch', field: 'value' })}
          />
          <Checkbox
            id={`${idBase}-match-case`}
            label={RULE_EDITOR_COPY.matchCase}
            checked={condition.match_case ?? false}
            onChange={(checked) => onChange({ ...condition, match_case: checked })}
          />
        </>
      );
    case 'values':
      return (
        <ValuesPicker
          idBase={idBase}
          choices={valueChoices(optionSet)}
          classes={classes}
          values={condition.values ?? []}
          invalid={problemField === 'values'}
          describedBy={describedBy('values')}
          copy={VALUES_COPY}
          open={state.openMenu === 'values'}
          search={state.search}
          onOpenChange={(open) =>
            dispatch(open ? { type: 'openMenu', menu: 'values' } : { type: 'closeMenu' })
          }
          onSearch={(text) => dispatch({ type: 'search', text })}
          onChange={(values) => onChange({ ...condition, values })}
        />
      );
    case 'date':
      return (
        <ValueInput
          id={`${idBase}-value`}
          label={RULE_EDITOR_COPY.dateLabel}
          type="date"
          value={condition.date ?? ''}
          invalid={problemField === 'date'}
          describedBy={describedBy('date')}
          widthClass="w-auto"
          onChange={(text) => onChange({ ...condition, date: text || null })}
          onBlur={() => dispatch({ type: 'touch', field: 'date' })}
        />
      );
    case 'years':
      return (
        <>
          <ValueInput
            id={`${idBase}-value`}
            label={RULE_EDITOR_COPY.yearsLabel}
            value={typed('years', condition.years)}
            inputMode="numeric"
            invalid={problemField === 'years'}
            describedBy={describedBy('years')}
            widthClass="w-64"
            onChange={(text) => {
              const digits = text.replace(/\D/g, '');
              dispatch({ type: 'type', field: 'years', text: digits });
              dispatch({ type: 'touch', field: 'years' });
              onChange({ ...condition, years: parseCount(digits) });
            }}
            onBlur={() => dispatch({ type: 'touch', field: 'years' })}
          />
          <span className={SUFFIX_CLASSES}>
            {yearsSuffix(definition, dateOfBirth, condition.years ?? null)}
          </span>
        </>
      );
    case 'amount':
      return (
        <>
          <ValueInput
            id={`${idBase}-value`}
            label={RULE_EDITOR_COPY.amountLabel}
            value={typed('amount', condition.amount)}
            inputMode="numeric"
            invalid={problemField === 'amount'}
            describedBy={describedBy('amount')}
            widthClass="w-64"
            onChange={(text) => {
              const digits = text.replace(/\D/g, '');
              dispatch({ type: 'type', field: 'amount', text: digits });
              dispatch({ type: 'touch', field: 'amount' });
              onChange({ ...condition, amount: parseCount(digits) });
            }}
            onBlur={() => dispatch({ type: 'touch', field: 'amount' })}
          />
          <ChoicePicker
            idBase={idBase}
            menu="unit"
            label={RULE_EDITOR_COPY.unitsMenu}
            placeholder={RULE_EDITOR_COPY.years}
            chosen={
              UNIT_SECTIONS[0].choices.find((choice) => choice.key === condition.unit) ?? null
            }
            sections={UNIT_SECTIONS}
            width={MENU_WIDTHS.unit}
            state={state}
            dispatch={dispatch}
            onChoose={(key) => {
              onChange({ ...condition, unit: key === 'months' ? 'months' : 'years' });
              dispatch({ type: 'closeMenu' });
              document.getElementById(`${idBase}-unit`)?.focus();
            }}
          />
          <span className={SUFFIX_CLASSES}>{RULE_EDITOR_COPY.fromNow}</span>
        </>
      );
  }
}
