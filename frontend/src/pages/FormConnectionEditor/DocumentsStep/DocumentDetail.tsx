import Checkbox from '../../../components/Checkbox';
import { ELEMENT_IDS } from '../constants';
import { offeredFieldsOf } from '../utils';
import { DOCUMENTS_STEP_COPY, DOCUMENTS_STEP_IDS, PANEL_HEIGHT_CLASSES } from './constants';
import FieldRow from './FieldRow';
import type { DocumentDetailProps, PagerButtonProps } from './types';
import { dataCountOf, dataCountText, documentGlyphOf } from './utils';

/**
 * Figma "Document · Personal ID" (U21 7290:61205): the shown document's card on the right. Its
 * header names it with its count ("6 of 25 data items chosen" / "No data items chosen yet",
 * FR-051 (37)) and "All data items" (002-S1.2, mixed while only some are chosen); then its data
 * items in the catalog's order, in up to three columns, without group rows (F24), which scroll
 * inside the card from 992 px (`lg:`; 560px high, or filling the window at 800px tall and more:
 * U01 #16); then the pager "Document n of m" with its arrows, unusable at either end. Only the
 * data the catalog offers shows and counts (005-S8). A document "Set rules →" flagged that still
 * has no data shows "Choose at least one data item, or remove this document." in red in place of
 * its count (U25 #24, 7298:62838), which describes "All data items" (001-S7.5).
 */
export default function DocumentDetail({
  shown,
  pager,
  needsData,
  onSelect,
  onSetField,
  onSetAllFields,
}: DocumentDetailProps) {
  const { document, documentType } = shown;
  const key = documentType.key;
  const titleId = ELEMENT_IDS.title(key);
  const errorId = needsData ? ELEMENT_IDS.fieldsError(key) : undefined;
  const selected = offeredFieldsOf(document.fields, documentType);
  const allKeys = documentType.fields.map((field) => field.key);
  const allSelected = selected.length === allKeys.length;

  return (
    <section
      id={DOCUMENTS_STEP_IDS.detail}
      aria-labelledby={titleId}
      className={`rounded-kern-large bg-kern-layout-background-default flex min-w-0 flex-1 flex-col overflow-hidden border border-(--kern-color-decorative-border-default) ${PANEL_HEIGHT_CLASSES}`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-16 border-b border-(--kern-color-decorative-border-default) px-24 py-16">
        <img src={documentGlyphOf(key, 'ink')} alt="" className="size-24 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col leading-(--kern-typography-line-height-medium-static)">
          <h2
            id={titleId}
            className="text-kern-static-medium text-kern-layout-text-default font-semibold"
          >
            {documentType.label}
          </h2>
          {needsData ? (
            <p id={errorId} className="text-kern-static-small text-kern-feedback-danger">
              {DOCUMENTS_STEP_COPY.needsDataLine}
            </p>
          ) : (
            <p className="text-kern-static-small text-kern-layout-text-muted">
              {dataCountText(dataCountOf(document, documentType))}
            </p>
          )}
        </div>
        <Checkbox
          id={ELEMENT_IDS.allData(key)}
          label={DOCUMENTS_STEP_COPY.allDataItems}
          checked={allSelected}
          indeterminate={selected.length > 0 && !allSelected}
          describedBy={errorId}
          onChange={(checked) => onSetAllFields(checked ? allKeys : [])}
        />
      </div>
      {/* Keyed, so that another document's items start at the top; the pager keeps the focus */}
      <div
        key={key}
        role="group"
        aria-labelledby={titleId}
        className="min-h-0 flex-1 px-24 py-16 lg:overflow-y-auto"
      >
        <ul className="gap-24 sm:columns-2 lg:columns-3">
          {documentType.fields.map((field) => (
            <FieldRow
              key={field.key}
              id={ELEMENT_IDS.field(key, field.key)}
              label={field.label}
              checked={selected.includes(field.key)}
              onChange={(checked) => onSetField(field.key, checked)}
            />
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-4 border-t border-(--kern-color-decorative-border-level-1) px-16">
        <PagerButton
          label={DOCUMENTS_STEP_COPY.previousDocument}
          icon="kern-icon--chevron-left"
          target={pager.previousIndex}
          onSelect={onSelect}
        />
        <p className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap">
          {pager.text}
        </p>
        <PagerButton
          label={DOCUMENTS_STEP_COPY.nextDocument}
          icon="kern-icon--chevron-right"
          target={pager.nextIndex}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}

/**
 * The pager's previous or next document (Figma "button-tertiary-small", U21 7290:61258): a 40px
 * icon button in a 48px slot, `aria-disabled` at the end of the list so that it keeps the focus.
 */
function PagerButton({ label, icon, target, onSelect }: PagerButtonProps) {
  return (
    <button
      type="button"
      aria-disabled={target === null}
      onClick={target === null ? undefined : () => onSelect(target)}
      className="kern-btn kern-btn--tertiary kern-btn--small"
    >
      <span aria-hidden="true" className={`kern-icon ${icon}`} />
      <span className="kern-sr-only">{label}</span>
    </button>
  );
}
