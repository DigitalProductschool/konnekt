import { useCopy } from '../../../../hooks/useLanguage';
import { RULE_EDITOR_COPY } from './constants';
import type { NameRowProps } from './types';

/**
 * Figma "Rules/Name row" (6093:3548): the rule's name, "Rule 01" by default (FR-005), with the
 * pencil that starts renaming it, where the page offers that.
 */
export default function NameRow({ id, name, onRename }: NameRowProps) {
  const copy = useCopy(RULE_EDITOR_COPY);
  return (
    <div className="flex items-center gap-4">
      <p
        id={id}
        className="text-kern-static-small text-kern-action-default leading-(--kern-typography-line-height-medium-static) font-semibold"
      >
        {name}
      </p>
      {onRename && (
        <button
          type="button"
          onClick={onRename}
          className="rounded-kern-small focus-visible:outline-kern-action-focus-default flex cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2"
        >
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--edit kern-icon--small bg-kern-layout-text-muted!"
          />
          <span className="sr-only">{copy.rename(name)}</span>
        </button>
      )}
    </div>
  );
}
