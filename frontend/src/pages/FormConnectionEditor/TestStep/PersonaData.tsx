import { shownFieldsOf } from '../../../utils/rules/personas/values';
import DocumentValues from './DocumentValues';
import type { PersonaDataProps } from './types';
import { documentGroupsOf } from './utils';

/**
 * The data card's values (S8.4; FR-005, F9–F11; Figma "Rows" 7057:58772, 7057:59186, 7057:59599):
 * the fields `shownFieldsOf()` keeps (only data that evaluated rules check, a class's dates only
 * while the class is held), grouped under their documents' headings, 16px apart
 */
export default function PersonaData({
  persona,
  fields,
  context,
  today,
  failingFields,
}: PersonaDataProps) {
  return (
    <div className="flex flex-col gap-16">
      {documentGroupsOf(shownFieldsOf(persona, fields)).map((group) => (
        <DocumentValues
          key={group.documentType}
          group={group}
          persona={persona}
          context={context}
          today={today}
          failingFields={failingFields}
        />
      ))}
    </div>
  );
}
