import { RULE_EDITOR_COPY } from './constants';
import type { MenuFooterProps } from './types';

/**
 * A menu's footer (U30 6350:41316, U31 6350:41628): the documents menu's note, after a divider,
 * or the data menu's "Need other data? Add it in Documents", which opens the documents step
 * (the page asks "Save changes to Rule 01?" first).
 */
export default function MenuFooter({ text, divided = false, onAddData }: MenuFooterProps) {
  return (
    <>
      {divided && (
        <div
          aria-hidden="true"
          className="h-px w-full shrink-0 bg-(--kern-color-decorative-border-default)"
        />
      )}
      <div className="text-kern-static-small flex shrink-0 items-start gap-8 pt-8 pb-4 pl-8 leading-(--kern-typography-line-height-medium-static)">
        <p className="text-kern-layout-text-muted min-w-0 flex-1">{text}</p>
        {onAddData && (
          <button
            type="button"
            onClick={onAddData}
            className="text-kern-action-default rounded-kern-small focus-visible:outline-kern-action-focus-default shrink-0 cursor-pointer font-semibold whitespace-nowrap hover:underline focus-visible:outline-4 focus-visible:outline-offset-2"
          >
            {RULE_EDITOR_COPY.addInDocuments}
          </button>
        )}
      </div>
    </>
  );
}
