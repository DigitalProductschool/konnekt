import { glyphOf } from '../../components/RuleRow/utils';
import { DETAIL_COPY } from './constants';
import SummaryField from './SummaryField';
import type { SummaryDocumentProps } from './types';

/**
 * A requested document in the Summary (U82 6396:48200 "Doc · Personal ID"): its head, the 20px
 * glyph (Figma "Icon/Glyph" in tone ink, as before a rule's statement), 8px, the name in
 * `label/small` muted and its count "7 data items" in `body/small` muted; 8px under it, one chip
 * per requested field, 8px apart and wrapping. A draft's document without fields reads "No data
 * chosen yet" in place of its count (S6).
 */
export default function SummaryDocument({ document, draft = false }: SummaryDocumentProps) {
  const noData = draft && document.fields.length === 0;
  return (
    <li className="flex flex-col gap-8">
      <div className="text-kern-static-small text-kern-layout-text-muted flex flex-wrap items-center gap-x-8 leading-(--kern-typography-line-height-medium-static)">
        <img src={glyphOf(document.document_type)} alt="" className="size-20 shrink-0" />
        <h4 className="font-semibold break-words">{document.label}</h4>
        <p>{noData ? DETAIL_COPY.noDataYet : DETAIL_COPY.items(document.fields.length)}</p>
      </div>
      {!noData && (
        <ul className="flex flex-wrap gap-8">
          {document.fields.map((field) => (
            <SummaryField key={field.key} label={field.label} />
          ))}
        </ul>
      )}
    </li>
  );
}
