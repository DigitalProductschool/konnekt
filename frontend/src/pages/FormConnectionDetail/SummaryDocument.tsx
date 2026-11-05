import IconTile from '../../components/IconTile';
import { documentGlyph } from '../../utils/documentGlyphs';
import { DETAIL_COPY } from './constants';
import SummaryField from './SummaryField';
import type { SummaryDocumentProps } from './types';

/**
 * A requested document and its fields, with the header of "Doc/Data card". A draft's document
 * without fields reads "No data chosen yet" in place of its count (S6).
 */
export default function SummaryDocument({ document, draft = false }: SummaryDocumentProps) {
  const noData = draft && document.fields.length === 0;
  return (
    <li className="border-kern-neutral-100 flex flex-col gap-12 px-24 py-16 not-last:border-b">
      <div className="flex items-center gap-14">
        <IconTile glyph={documentGlyph(document.document_type, 'blue')} size={40} tone="blue" />
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-kern-static-medium text-kern-layout-text-default font-semibold">
            {document.label}
          </h3>
          <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
            {noData ? DETAIL_COPY.noDataYet : DETAIL_COPY.items(document.fields.length)}
          </p>
        </div>
      </div>
      {!noData && (
        <ul className="flex flex-wrap gap-x-16 gap-y-8">
          {document.fields.map((field) => (
            <SummaryField key={field.key} label={field.label} />
          ))}
        </ul>
      )}
    </li>
  );
}
