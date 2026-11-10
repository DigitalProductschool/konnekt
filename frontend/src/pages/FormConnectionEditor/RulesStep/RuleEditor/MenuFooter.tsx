import { useCopy } from '../../../../hooks/useLanguage';
import { RULE_EDITOR_COPY } from './constants';
import type { MenuFooterProps } from './types';

/**
 * A menu's footer (U30 6350:41316, U31 6350:41628): the documents menu's note, after a divider,
 * or the data menu's "Need other data? Add it in Documents", which opens the documents step
 * (the page asks "Save changes to Rule 01?" first). Where the button doesn't fit beside the
 * question, as German's "In „Dokumente“ hinzufügen" at 320px, it moves under it and may wrap
 * (spec 009, R9); the English row stays as it was.
 */
export default function MenuFooter({ text, divided = false, onAddData }: MenuFooterProps) {
  const copy = useCopy(RULE_EDITOR_COPY);
  return (
    <>
      {divided && (
        <div
          aria-hidden="true"
          className="h-px w-full shrink-0 bg-(--kern-color-decorative-border-default)"
        />
      )}
      <div className="text-kern-static-small flex shrink-0 flex-wrap items-start gap-8 pt-8 pb-4 pl-8 leading-(--kern-typography-line-height-medium-static)">
        <p className="text-kern-layout-text-muted min-w-0 flex-1">{text}</p>
        {onAddData && (
          <button
            type="button"
            onClick={onAddData}
            className="text-kern-action-default rounded-kern-small focus-visible:outline-kern-action-focus-default cursor-pointer text-left font-semibold hover:underline focus-visible:outline-4 focus-visible:outline-offset-2"
          >
            {copy.addInDocuments}
          </button>
        )}
      </div>
    </>
  );
}
