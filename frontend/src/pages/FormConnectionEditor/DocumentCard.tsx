import FormErrorMessage from '../../components/FormErrorMessage';
import IconTile from '../../components/IconTile';
import { documentGlyph } from '../../utils/documentGlyphs';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import FieldChecklist from './FieldChecklist';
import type { DocumentCardProps } from './types';

/** Figma "Doc/Data card": an added document and the fields to request from it. */
export default function DocumentCard({
  documentType,
  selected,
  error,
  onSetField,
  onSetAllFields,
}: DocumentCardProps) {
  const errorId = error ? ELEMENT_IDS.fieldsError(documentType.key) : undefined;
  return (
    <section
      aria-labelledby={ELEMENT_IDS.title(documentType.key)}
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default border"
    >
      <div className="flex items-center gap-14 pt-16 pr-16 pb-8 pl-24">
        <IconTile glyph={documentGlyph(documentType.key, 'blue')} size={40} tone="blue" />
        <div className="flex min-w-0 flex-col gap-2">
          <h2
            id={ELEMENT_IDS.title(documentType.key)}
            className="text-kern-static-medium text-kern-layout-text-default font-semibold"
          >
            {documentType.label}
          </h2>
          <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
            {EDITOR_COPY.shared(selected.length, documentType.fields.length)}
          </p>
        </div>
      </div>
      {error && errorId && (
        <div className="px-24 pb-8">
          <FormErrorMessage id={errorId} message={error} />
        </div>
      )}
      <FieldChecklist
        documentType={documentType}
        selected={selected}
        errorId={errorId}
        onSetField={onSetField}
        onSetAllFields={onSetAllFields}
      />
    </section>
  );
}
