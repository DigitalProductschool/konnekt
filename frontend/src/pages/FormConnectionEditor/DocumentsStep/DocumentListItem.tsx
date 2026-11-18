import ActionMenu from '../../../components/ActionMenu';
import { useCopy } from '../../../hooks/useLanguage';
import { DOCUMENTS_COPY, DOCUMENTS_STEP_IDS, ROW_ACTIONS_CLASSES } from './constants';
import type { DocumentListItemProps } from './types';
import { documentGlyphOf, documentMenuOf } from './utils';

/**
 * Figma "Documents/List item" (U22 7290:62349, 7290:62348; U23 7298:61782, 7298:61783; U25
 * 7298:62832): an added document in the list, 40px, with its glyph and its name. The item shows
 * the document on the right; the shown one has the `layout/background-hued` fill, the action-blue
 * glyph, its name in semibold and `aria-current`, the others no fill, the ink glyph and the
 * regular name.
 *
 * At the row's end, on every row, a single document's too, a ⋯ button named "Actions for
 * <document>" (bug v5-ui-fixes B4, 2026-11-18, which moved the row's trash into it; W13, no
 * frame: spec 008's `ActionMenu`, as the rules step's and the account page's rows use it). It
 * holds "Move up" and "Move down" (S8 "Without dragging", FR-047), the first row without "Move
 * up", the last without "Move down", then, after the divider, the red "Remove document", which
 * asks first (F72; `documentMenuOf()`). Shown on every row, so that a pointer finds it without
 * hovering (WCAG 2.5.7). Below 320 CSS px (`narrow:`) it wraps under the name, at the row's end,
 * so that the name keeps its line.
 *
 * The row can be dragged to its place (S8 "Dragging", FR-046; `useRowDrag` in `DocumentsList`):
 * a press anywhere on it but on the ⋯ and its menu (`data-no-drag`). A touch scrolls the list
 * vertically unless it is held (`touch-action: pan-y`), and nothing on the row is selected as
 * text. While it is dragged, the row leaves the list (U27 #9).
 *
 * A document that "Set rules →" flagged and that still has no data shows the error look (U25 A14,
 * the description's "Error"): the light-red tile, the danger glyph, its name red and semibold,
 * and KERN's error icon before the ⋯. Not colour alone: the icon, and "1 document needs data"
 * describing the item for screen readers.
 */
export default function DocumentListItem({
  documentType,
  selected,
  needsData,
  describedBy,
  index,
  count,
  onSelect,
  onRemove,
  onMove,
  dragged,
  onPointerDown,
}: DocumentListItemProps) {
  const copy = useCopy(DOCUMENTS_COPY);
  const actions = documentMenuOf(index, count, copy, { onMove, onRemove });
  const fill = needsData
    ? 'bg-kern-feedback-danger-background'
    : selected
      ? 'bg-kern-layout-background-hued'
      : '';
  const tone = needsData ? 'danger' : selected ? 'action' : 'ink';
  const name = needsData
    ? 'font-semibold text-kern-feedback-danger'
    : `text-kern-layout-text-default ${selected ? 'font-semibold' : ''}`;
  return (
    <li
      id={DOCUMENTS_STEP_IDS.listRow(documentType.key)}
      data-drag-row="true"
      onPointerDown={onPointerDown}
      className={`rounded-kern-default narrow:flex-wrap narrow:justify-end touch-pan-y items-center gap-8 py-4 pr-8 select-none ${dragged ? 'hidden' : 'flex'} ${fill}`}
    >
      <button
        id={DOCUMENTS_STEP_IDS.listItem(documentType.key)}
        type="button"
        aria-current={selected ? 'true' : undefined}
        aria-controls={DOCUMENTS_STEP_IDS.detail}
        aria-describedby={needsData ? describedBy : undefined}
        onClick={onSelect}
        className="rounded-kern-default focus-visible:outline-kern-action-focus-default narrow:basis-full flex min-h-32 min-w-0 flex-1 cursor-pointer items-center gap-8 pl-8 text-left focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        <img src={documentGlyphOf(documentType.key, tone)} alt="" className="size-24 shrink-0" />
        <span
          className={`text-kern-static-small min-w-0 flex-1 truncate leading-(--kern-typography-line-height-medium-static) ${name}`}
        >
          {documentType.label}
        </span>
      </button>
      <div data-no-drag="true" className={ROW_ACTIONS_CLASSES}>
        {needsData && (
          // Figma "icon-emergency_home-small" (24), decorative: the description names the problem
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--danger bg-kern-feedback-danger! size-24 shrink-0 self-center"
          />
        )}
        <ActionMenu label={copy.documentActionsLabel(documentType.label)} actions={actions} />
      </div>
    </li>
  );
}
