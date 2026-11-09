import { changedKeys, dataRowsOf } from '@connection-portal/rules/personas/values';

import DocumentValues from './DocumentValues';
import type { PersonaDataProps } from './types';
import { dataRowGroupsOf } from './utils';

/**
 * The data card's values (S8.4; FR-005, F9–F11; spec 008 F63, FR-043, C6; Figma "Rows" U65
 * 7057:58772, 7057:59186, U66 7057:59599): one flat list with no visible document column or
 * headings, a row per `dataRowsOf()` row (only data that evaluated rules check; the licence
 * classes with one row per issue date, "B, BE since 02.05.2010", a class's other dates only while
 * the class is held). The rows are grouped per document in catalog order, each group under its
 * document's name as a hidden heading, so that screen readers still hear "Personal ID" and
 * "Driving licence" (004-S8.4.2, CLAR #46)
 */
export default function PersonaData({ persona, fields, context, failingFields }: PersonaDataProps) {
  const changed = changedKeys(persona, fields);
  return (
    <div className="flex flex-col">
      {dataRowGroupsOf(dataRowsOf(persona, fields)).map((group) => (
        <DocumentValues
          key={group.documentType}
          group={group}
          persona={persona}
          context={context}
          failingFields={failingFields}
          changedFields={changed}
        />
      ))}
    </div>
  );
}
