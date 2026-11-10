import { useLanguage } from '../../../hooks/useLanguage';
import { DOCUMENTS_COPY, DOCUMENTS_STEP_IDS, PANEL_HEIGHT_CLASSES } from './constants';
import DocumentListItem from './DocumentListItem';
import SearchCard from './SearchCard';
import type { DocumentsListProps } from './types';
import { needsDataText } from './utils';

/**
 * Figma "Added documents" (U20 7290:60377, U21 7290:61198): the left card, 264px from 1024 px.
 * At the top, which never moves, "Added documents (n)" and "Add document" with its search card;
 * once a document is added, a divider and the documents in the catalog's order (F23), 4px apart
 * (U22 7294:61686), whose list scrolls inside the card from 992 px (`lg:`). The card is 560px
 * high, or fills the window at 800px tall and more (U01 #16, `PANEL_HEIGHT_CLASSES`). The card
 * doesn't clip: the search card reaches over the document on the right. Once "Set rules →" has
 * flagged documents without data, "1 document needs data" heads the list in red (U25 7298:63253,
 * label/default, 4px above the items) while any of them still has none, and describes their items.
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
}: DocumentsListProps) {
  const { language } = useLanguage();
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
          <div className="-m-6 flex min-h-0 flex-1 flex-col gap-4 p-6 lg:overflow-y-auto">
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
                <DocumentListItem
                  key={documentType.key}
                  documentType={documentType}
                  selected={index === shownIndex}
                  needsData={needingData.includes(documentType.key)}
                  describedBy={DOCUMENTS_STEP_IDS.needsData}
                  onSelect={() => onSelect(index)}
                  onRemove={() => onRemove(documentType)}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
