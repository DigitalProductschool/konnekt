import { Fragment } from 'react';

import { useLanguage } from '../../../hooks/useLanguage';
import { useRowDrag } from '../../../hooks/useRowDrag';
import {
  DOCUMENTS_COPY,
  DOCUMENTS_STEP_IDS,
  PANEL_HEIGHT_CLASSES,
  ROW_DRAG_SELECTORS,
} from './constants';
import DocumentListItem from './DocumentListItem';
import SearchCard from './SearchCard';
import type { DocumentsListProps, DragCopyProps } from './types';
import { documentGlyphOf, needsDataText } from './utils';

/**
 * Figma "Drop line · where it will land" (U27 7301:63416, 7301:63557): a 2px action-blue line
 * with 3px above and below, in the list's flow, where the dragged document will land
 */
function DropLine() {
  return (
    <li aria-hidden="true" className="py-3">
      <div className="bg-kern-action-default rounded-drop-line h-2" />
    </li>
  );
}

/**
 * Figma "Copy · follows the pointer" (U27 7301:63418): the dragged row's glyph and name, ink and
 * regular, on white with a shadow, faded. It starts on the row's place and follows the pointer:
 * `useRowDrag` sets the custom properties (`ROW_DRAG_PROPERTIES`) on the list's area and these
 * classes read them. Fixed, so that no scroll area clips it or grows with it; nothing transitions
 */
function DragCopy({ documentType }: DragCopyProps) {
  return (
    <div
      aria-hidden="true"
      className="rounded-drag-copy bg-kern-layout-background-default shadow-drag-copy pointer-events-none fixed top-(--drag-top) left-(--drag-left) z-40 flex w-(--drag-width) translate-x-(--drag-x) translate-y-(--drag-y) items-start gap-8 px-8 py-4 opacity-85"
    >
      <img src={documentGlyphOf(documentType.key, 'ink')} alt="" className="size-24 shrink-0" />
      <span className="text-kern-static-small text-kern-layout-text-default min-w-0 flex-1 truncate leading-(--kern-typography-line-height-medium-static)">
        {documentType.label}
      </span>
    </div>
  );
}

/**
 * Figma "Added documents" (U20 7290:60377, U21 7290:61198): the left card, 264px from 1024 px.
 * At the top, which never moves, "Added documents (n)" and "Add document" with its search card;
 * once a document is added, a divider and the documents in the team's order (FR-045), 4px apart
 * (U22 7294:61686), whose list scrolls inside the card from 992 px (`lg:`). The card is 560px
 * high, or fills the window at 800px tall and more (U01 #16, `PANEL_HEIGHT_CLASSES`). The card
 * doesn't clip: the search card reaches over the document on the right. Once "Set rules →" has
 * flagged documents without data, "1 document needs data" heads the list in red (U25 7298:63253,
 * label/default, 4px above the items) while any of them still has none, and describes their items.
 *
 * A row is dragged to its place (S8 "Dragging", FR-046; R1 7298:63317, R2 7298:63736, R3
 * 7298:64157): while dragging, the row leaves the list, the drop line marks where it will land
 * and its faded copy follows the pointer. A release inside the list's scroll area moves it as
 * the ⋯ menu does (`onMove`: the focus on its ⋯ and the announcement); a release outside it,
 * Escape or a second pointer leave the order as it was.
 */
export default function DocumentsList({
  documentTypes,
  documents,
  listed,
  shownIndex,
  query,
  needingData,
  onSearch,
  onClearSearch,
  onAdd,
  onSelect,
  onRemove,
  onMove,
}: DocumentsListProps) {
  const { language } = useLanguage();
  const { attachArea, dragged, onRowPointerDown } = useRowDrag({
    rowSelector: ROW_DRAG_SELECTORS.row,
    ignoreSelector: ROW_DRAG_SELECTORS.ignore,
    onMove: (from, to) => {
      const moved = listed[from];
      if (moved) {
        onMove(moved.documentType.key, to);
      }
    },
  });
  const draggedDocument = dragged ? listed[dragged.index]?.documentType : undefined;
  return (
    <section
      aria-labelledby={DOCUMENTS_STEP_IDS.listTitle}
      className={`rounded-kern-large bg-kern-layout-background-default flex w-full shrink-0 flex-col border border-(--kern-color-decorative-border-default) p-16 lg:w-264 ${PANEL_HEIGHT_CLASSES}`}
    >
      <div className="flex flex-col items-start gap-12">
        <h2
          id={DOCUMENTS_STEP_IDS.listTitle}
          className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {DOCUMENTS_COPY[language].addedDocuments(listed.length)}
        </h2>
        <SearchCard
          documentTypes={documentTypes}
          documents={documents}
          query={query}
          filled={listed.length === 0}
          onSearch={onSearch}
          onClearSearch={onClearSearch}
          onAdd={onAdd}
        />
      </div>
      {listed.length > 0 && (
        <>
          <div aria-hidden="true" className="py-16">
            <div className="bg-card-divider h-1" />
          </div>
          <div
            ref={attachArea}
            className="-m-6 flex min-h-0 flex-1 flex-col gap-4 p-6 lg:overflow-y-auto"
          >
            {needingData.length > 0 && (
              <p
                id={DOCUMENTS_STEP_IDS.needsData}
                className="text-kern-static-medium text-kern-feedback-danger leading-(--kern-typography-line-height-medium-static) font-semibold"
              >
                {needsDataText(needingData.length, language)}
              </p>
            )}
            <ul className="flex flex-col gap-4">
              {listed.map(({ documentType }, index) => (
                <Fragment key={documentType.key}>
                  {dragged?.gap === index && <DropLine />}
                  <DocumentListItem
                    documentType={documentType}
                    selected={index === shownIndex}
                    needsData={needingData.includes(documentType.key)}
                    describedBy={DOCUMENTS_STEP_IDS.needsData}
                    index={index}
                    count={listed.length}
                    onSelect={() => onSelect(index)}
                    onRemove={() => onRemove(documentType)}
                    onMove={(toIndex) => onMove(documentType.key, toIndex)}
                    dragged={dragged?.index === index}
                    onPointerDown={(event) => onRowPointerDown(index, event)}
                  />
                </Fragment>
              ))}
              {dragged?.gap === listed.length && <DropLine />}
            </ul>
            {draggedDocument && <DragCopy documentType={draggedDocument} />}
          </div>
        </>
      )}
    </section>
  );
}
