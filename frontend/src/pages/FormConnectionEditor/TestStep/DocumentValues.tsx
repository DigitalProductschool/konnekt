import { useLanguage } from '../../../hooks/useLanguage';
import type { DocumentValuesProps } from './types';
import { dataRowLabelOf, dataRowTextOf } from './utils';
import ValueRow from './ValueRow';

/**
 * One document's rows in the data card (S8.4; F9; spec 008 F63, FR-043): its name, "Personal ID"
 * or "Driving licence", as the group's heading for assistive technology only (the frames draw no
 * document headings or column, U65 7057:58772), then a row per `dataRowsOf()` row. The groups
 * follow each other without a gap, so the card reads as one list
 */
export default function DocumentValues({
  group,
  persona,
  context,
  failingFields,
  changedFields,
}: DocumentValuesProps) {
  const { language } = useLanguage();
  return (
    <>
      <h3 className="sr-only">{group.documentLabel}</h3>
      <dl className="flex flex-col">
        {group.rows.map((row) => (
          <ValueRow
            key={`${row.field.key}@${row.since ?? ''}`}
            label={dataRowLabelOf(row, language)}
            text={dataRowTextOf(row, persona.values, context.optionSets, language)}
            failing={row.keys.some((key) => failingFields.includes(key))}
            changed={row.keys.some((key) => changedFields.includes(key))}
          />
        ))}
      </dl>
    </>
  );
}
