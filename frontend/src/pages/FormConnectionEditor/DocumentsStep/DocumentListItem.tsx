import ActionMenu from '../../../components/ActionMenu';
import type { MenuAction } from '../../../components/ActionMenu/types';
import { useCopy } from '../../../hooks/useLanguage';
import { DOCUMENTS_COPY, DOCUMENTS_STEP_IDS, MOVE_ICONS, ROW_ACTIONS_CLASSES } from './constants';
import type { DocumentListItemProps } from './types';
import { documentGlyphOf, moveTargetsOf } from './utils';

/**
 * Figma "Documents/List item" (U22 7290:62349, 7290:62348; U23 7298:61782, 7298:61783; U25
 * 7298:62832): an added document in the list, 40px, with its glyph and its name. The item shows
 * the document on the right; the shown one has the `layout/background-hued` fill, the action-blue
 * glyph, its name in semibold and `aria-current`, the others no fill, the ink glyph and the
 * regular name. The trash shows on the shown item, grey, and on any item while the pointer is on
 * it or the keyboard is in it, red on its light-red fill ("Rules/Delete button" state=hover; the
 * component's description: on hover and focus of any row). Its place is kept while hidden, so
 * that the items keep their height and the keyboard reaches it.
 *
 * At the row's end, with two documents or more, a ⋯ button named "Move <document>" holds "Move
 * up" and "Move down" (S8 "Without dragging", FR-047; W13, no frame: spec 008's `ActionMenu`, as
 * the rules step's and the account page's rows use it): the first row has no "Move up", the last
 * no "Move down". Shown on every row, so that a pointer finds it without hovering (WCAG 2.5.7).
 * Below 320 CSS px (`narrow:`) the trash and the ⋯ wrap under the name, at the row's end, so
 * that the name keeps its line.
 *
 * The row can be dragged to its place (S8 "Dragging", FR-046; `useRowDrag` in `DocumentsList`):
 * a press anywhere on it but on the trash, the ⋯ and its menu (`data-no-drag`). A touch scrolls
 * the list vertically unless it is held (`touch-action: pan-y`), and nothing on the row is
 * selected as text. While it is dragged, the row leaves the list (U27 #9).
 *
 * A document that "Set rules →" flagged and that still has no data shows the error look (U25 A14,
 * the description's "Error"): the light-red tile, the danger glyph, its name red and semibold,
 * and KERN's error icon in the trash's place, which the trash, red, takes on hover and focus. Not
 * colour alone: the icon, and "1 document needs data" describing the item for screen readers.
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
  const { hasMoveMenu, up, down } = moveTargetsOf(index, count);
  const moves: MenuAction[] = [];
  if (up !== null) {
    moves.push({ label: copy.moveUp, icon: MOVE_ICONS.up, onSelect: () => onMove(up) });
  }
  if (down !== null) {
    moves.push({ label: copy.moveDown, icon: MOVE_ICONS.down, onSelect: () => onMove(down) });
  }
  const fill = needsData
    ? 'bg-kern-feedback-danger-background'
    : selected
      ? 'bg-kern-layout-background-hued'
      : '';
  const tone = needsData ? 'danger' : selected ? 'action' : 'ink';
  const name = needsData
    ? 'font-semibold text-kern-feedback-danger'
    : `text-kern-layout-text-default ${selected ? 'font-semibold' : ''}`;
  // The grey trash shows on the shown item, except in the error look, which shows the error icon
  const trashShown = selected && !needsData;
  return (
    <li
      id={DOCUMENTS_STEP_IDS.listRow(documentType.key)}
      data-drag-row="true"
      onPointerDown={onPointerDown}
      className={`group rounded-kern-default narrow:flex-wrap narrow:justify-end touch-pan-y items-center gap-8 py-4 pr-8 select-none ${dragged ? 'hidden' : 'flex'} ${fill}`}
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
      {/* The trash and the ⋯ side by side, their 32px boxes touching, so that the name keeps
          room for "Personalausweis" in the 264px card */}
      <div data-no-drag="true" className={ROW_ACTIONS_CLASSES}>
        <div className="relative flex shrink-0">
          {needsData && (
            // Figma "icon-emergency_home-small" (24), at the tile's right padding as drawn
            <span
              aria-hidden="true"
              className="kern-icon kern-icon--danger bg-kern-feedback-danger! motion absolute top-4 right-0 size-24 transition-opacity duration-(--duration-colour) group-hover:opacity-0 group-has-focus-visible:opacity-0"
            />
          )}
          <button
            type="button"
            onClick={onRemove}
            className={`rounded-kern-small group-hover:bg-kern-feedback-danger-background group-has-focus-visible:bg-kern-feedback-danger-background focus-visible:outline-kern-action-focus-default motion relative flex size-32 shrink-0 cursor-pointer items-center justify-center transition-[background-color,opacity] duration-(--duration-colour) group-hover:opacity-100 group-has-focus-visible:opacity-100 focus-visible:outline-4 focus-visible:outline-offset-2 ${trashShown ? '' : 'opacity-0'}`}
          >
            <span
              aria-hidden="true"
              className="kern-icon kern-icon--delete kern-icon--small bg-kern-layout-text-muted! group-hover:bg-kern-feedback-danger! group-has-focus-visible:bg-kern-feedback-danger!"
            />
            <span className="sr-only">{copy.removeDocumentLabel(documentType.label)}</span>
          </button>
        </div>
        {hasMoveMenu && (
          <ActionMenu label={copy.moveDocumentLabel(documentType.label)} actions={moves} />
        )}
      </div>
    </li>
  );
}
