import { DOCUMENTS_STEP_COPY } from './constants';
import type { SearchResultItemProps } from './types';
import { documentGlyphOf } from './utils';

const ROW = 'flex min-h-40 w-full items-center gap-8 px-8 py-4 rounded-kern-default';
const NAME =
  'text-kern-static-small min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static)';

/**
 * Figma "Documents/Search result" (U20 7290:60715, U21 7290:62279): a document of the search
 * card. An available one is a button that adds it, highlighted (`layout/background-hued`) on
 * hover and keyboard focus; an added one is greyed with the "Added" tag ("Data/Status tag") and
 * can't be picked again (U21 #24).
 */
export default function SearchResultItem({
  documentType,
  added,
  onPick,
  onKeyDown,
}: SearchResultItemProps) {
  if (added) {
    return (
      <li className={ROW}>
        <img src={documentGlyphOf(documentType.key, 'muted')} alt="" className="size-24 shrink-0" />
        <span className={`${NAME} text-kern-layout-text-muted`}>{documentType.label}</span>
        <span className="rounded-kern-small text-kern-static-small text-kern-layout-text-muted shrink-0 bg-(--kern-color-decorative-border-default) px-8 leading-(--kern-typography-line-height-medium-static)">
          {DOCUMENTS_STEP_COPY.addedTag}
        </span>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        onKeyDown={onKeyDown}
        className={`${ROW} hover:bg-kern-layout-background-hued focus-visible:bg-kern-layout-background-hued focus-visible:outline-kern-action-focus-default motion cursor-pointer text-left transition-colors duration-(--duration-colour) focus-visible:outline-4 focus-visible:-outline-offset-4`}
      >
        <img src={documentGlyphOf(documentType.key, 'ink')} alt="" className="size-24 shrink-0" />
        <span className={`${NAME} text-kern-layout-text-default`}>{documentType.label}</span>
      </button>
    </li>
  );
}
