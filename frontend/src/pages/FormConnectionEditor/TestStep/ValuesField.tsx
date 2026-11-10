import { useReducer } from 'react';

import ValuesPicker from '../../../components/ValuesPicker';
import { useCopy } from '../../../hooks/useLanguage';
import { VALUES_PICKER_COPY } from './constants';
import FieldFrame from './FieldFrame';
import type { ValuesFieldProps } from './types';
import { orderedValues, pickerReducer } from './utils';

/**
 * Several values of a set, picked from a list and never typed (S8.5; FR-006, F12; Figma 7058:60661
 * "Licence classes", 7058:60663 "Nationality"): the rule editor's values picker (R16, moved to
 * `components/ValuesPicker`) as a form field, the licence classes by code with their descriptions,
 * the nationalities by label. Nothing has to stay chosen: the menu has no "Select at least one
 * option." footer, and "Not shared" stands for none. The values come back in the set's order
 */
export default function ValuesField({
  id,
  label,
  choices,
  classes,
  value,
  onChange,
}: ValuesFieldProps) {
  const pickerCopy = useCopy(VALUES_PICKER_COPY);
  const [picker, dispatch] = useReducer(pickerReducer, { open: false, search: '' });
  const values = Array.isArray(value) ? value : [];
  return (
    <FieldFrame id={id} label={label} error={null} plainLabel>
      <ValuesPicker
        idBase={id}
        choices={choices}
        classes={classes}
        values={[...values]}
        invalid={false}
        field
        copy={{ ...pickerCopy, menu: label }}
        open={picker.open}
        search={picker.search}
        onOpenChange={(open) => dispatch({ type: open ? 'open' : 'close' })}
        onSearch={(text) => dispatch({ type: 'search', text })}
        onChange={(chosen) => onChange(orderedValues(chosen, choices))}
      />
    </FieldFrame>
  );
}
