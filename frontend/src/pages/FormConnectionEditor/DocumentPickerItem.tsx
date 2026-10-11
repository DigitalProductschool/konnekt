import IconTile from '../../components/IconTile';
import { documentGlyph } from '../../utils/documentGlyphs';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import type { DocumentPickerItemProps } from './types';

const LABEL_CLASSES =
  'text-kern-static-small px-8 py-4 leading-(--kern-typography-line-height-medium-static) font-semibold';

/**
 * Figma "Nav/Doc row": a wallet document with "Add", or once added "Added", which turns
 * into a red "Remove" on hover and keyboard focus (frame 06a).
 */
export default function DocumentPickerItem({
  documentType,
  added,
  describedBy,
  onAdd,
  onRemove,
}: DocumentPickerItemProps) {
  return (
    <li className="rounded-kern-large flex min-h-56 items-center gap-8 py-4 pr-4 pl-8">
      <IconTile
        glyph={documentGlyph(documentType.key, added ? 'blue' : 'muted')}
        size={40}
        tone={added ? 'blue' : 'outline'}
      />
      <span
        className={`text-kern-static-small min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static) font-semibold ${added ? 'text-kern-action-default' : 'text-kern-layout-text-default'}`}
      >
        {documentType.label}
      </span>
      {added ? (
        <button
          id={ELEMENT_IDS.pickerButton(documentType.key)}
          type="button"
          onClick={onRemove}
          aria-describedby={describedBy}
          className="group rounded-kern-default focus-visible:outline-kern-action-focus-default flex min-h-48 shrink-0 cursor-pointer items-center focus-visible:outline-4 focus-visible:outline-offset-2"
        >
          <span className="rounded-kern-default bg-kern-action-default text-kern-action-on-default group-hover:bg-kern-feedback-danger-background group-hover:text-kern-feedback-danger group-hover:ring-kern-feedback-danger group-focus-visible:bg-kern-feedback-danger-background group-focus-visible:text-kern-feedback-danger group-focus-visible:ring-kern-feedback-danger relative flex h-40 items-center px-8 group-hover:ring-1 group-hover:ring-inset group-focus-visible:ring-1 group-focus-visible:ring-inset">
            <span
              aria-hidden="true"
              className="kern-icon kern-icon--check kern-icon--small bg-kern-action-on-default! group-hover:hidden! group-focus-visible:hidden!"
            />
            <span
              aria-hidden="true"
              className={`${LABEL_CLASSES} group-hover:hidden group-focus-visible:hidden`}
            >
              {EDITOR_COPY.added}
            </span>
            <span
              aria-hidden="true"
              className={`${LABEL_CLASSES} hidden group-hover:inline group-focus-visible:inline`}
            >
              {EDITOR_COPY.remove}
            </span>
            {/* KERN's hover tint, as in the design */}
            <span
              aria-hidden="true"
              className="rounded-kern-default bg-kern-action-state-indicator-default absolute -inset-1 hidden opacity-[0.08] group-hover:block"
            />
          </span>
          <span className="kern-sr-only">{EDITOR_COPY.removeLabel(documentType.label)}</span>
        </button>
      ) : (
        <button
          id={ELEMENT_IDS.pickerButton(documentType.key)}
          type="button"
          onClick={onAdd}
          aria-describedby={describedBy}
          className="kern-btn kern-btn--secondary kern-btn--small shrink-0"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--add" />
          <span className="kern-label">
            {EDITOR_COPY.add}
            {/* Not kern-sr-only: inside a kern-btn it makes the button icon-sized */}
            <span className="sr-only"> {documentType.label}</span>
          </span>
        </button>
      )}
    </li>
  );
}
