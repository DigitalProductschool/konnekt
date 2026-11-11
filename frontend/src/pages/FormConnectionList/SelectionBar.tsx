import { useCopy } from '../../hooks/useLanguage';
import { SELECTION_BAR_CLASSES, SELECTION_COPY } from './constants';
import type { SelectionBarProps } from './types';

/**
 * The overview's selection bar (spec 010, S4 "Selection bar"; FR-039, FR-040; Figma U15
 * 6699:45206, "Rules/Selection bar"): while at least one row is selected it stands where the
 * toolbar was, with "<n> selected", "Cancel" (clears the selection; the toolbar comes back with
 * its search text) and "Delete" (the row's own delete dialog with one row, the bulk dialog with
 * more). The count is a polite status, announced as it changes (W12). Its element stays in the
 * page, empty and unseen, while nothing is selected, so that the first count is announced too:
 * a status region that appears with its text is not reliably read. Below 320 CSS px the buttons
 * wrap under the count (W16)
 */
export default function SelectionBar({ count, onCancel, onDelete }: SelectionBarProps) {
  const copy = useCopy(SELECTION_COPY);
  const selecting = count > 0;
  return (
    <div className={selecting ? SELECTION_BAR_CLASSES.bar : 'contents'}>
      <p role="status" className={selecting ? SELECTION_BAR_CLASSES.count : 'sr-only'}>
        {selecting ? copy.selected(count) : ''}
      </p>
      {selecting && (
        <>
          <button type="button" onClick={onCancel} className={SELECTION_BAR_CLASSES.cancel}>
            <span className="kern-label">{copy.cancel}</span>
          </button>
          <button type="button" onClick={onDelete} className={SELECTION_BAR_CLASSES.delete}>
            <span className="kern-label">{copy.delete}</span>
          </button>
        </>
      )}
    </div>
  );
}
