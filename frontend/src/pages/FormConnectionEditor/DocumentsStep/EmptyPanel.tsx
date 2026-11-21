import folderEmptyDocuments from '../../../assets/illustrations/folder-empty-documents@2x.webp';
import { useCopy } from '../../../hooks/useLanguage';
import { DOCUMENTS_COPY, PANEL_HEIGHT_CLASSES } from './constants';

/**
 * Figma "Ghost · Document data" (U20 7290:60384; its picture from "New visuals" 7741:62060, bug
 * new-visuals B4): the right panel while no document is added, a dashed card with the empty
 * folder at 162 × 161, 8px above "No documents yet" and where the data will show; as high as the
 * list card (U01 #16). The picture is decorative and keeps its size on every width.
 */
export default function EmptyPanel() {
  const copy = useCopy(DOCUMENTS_COPY);
  return (
    <div
      className={`rounded-kern-large flex min-w-0 flex-1 flex-col items-center justify-center gap-8 border border-dashed border-(--kern-color-decorative-border-default) px-24 py-40 text-center ${PANEL_HEIGHT_CLASSES}`}
    >
      {/* The picture never scales (KERN's unlayered rule gives every image `height: auto` and
          `max-width: 100%`, hence the `!`); in a panel narrower than it, its box clips it,
          centred */}
      <div className="flex max-w-full shrink-0 justify-center overflow-hidden">
        <img
          src={folderEmptyDocuments}
          alt=""
          aria-hidden="true"
          width={162}
          height={161}
          className="h-161! w-162 max-w-none! shrink-0"
        />
      </div>
      <p className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold">
        {copy.emptyTitle}
      </p>
      <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
        {copy.emptyText}
      </p>
    </div>
  );
}
