import { type KeyboardEvent, useEffect, useId, useReducer, useRef } from 'react';

import { nameProblem } from '../../../utils/rules/validation';
import { NAME_SIZES, RULES_COPY } from './constants';
import type { ItemNameProps } from './types';
import { renameReducer } from './utils';

/**
 * A rule's, group's or sub-group's name in the list (U15; U14 6094:6413): a button that starts
 * renaming, which shows the design's hint (dashed underline and pencil) on hover and focus, and
 * the inline field "Rules/Inline rename field" while renaming. Enter saves and Escape cancels; a
 * missing, used or reserved name is refused there, naming the branch (F12). Leaving the field
 * saves a name that fits.
 */
export default function ItemName({
  item,
  branch,
  branches,
  size,
  renaming,
  dispatch,
}: ItemNameProps) {
  const [field, dispatchField] = useReducer(renameReducer, { value: item.name, error: null });
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasRenaming = useRef(renaming);
  const messageId = useId();
  const textSize = NAME_SIZES[size];

  useEffect(() => {
    if (renaming) {
      dispatchField({ type: 'reset', value: item.name });
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (wasRenaming.current) {
      buttonRef.current?.focus();
    }
    wasRenaming.current = renaming;
  }, [renaming, item.name]);

  function save(): boolean {
    if (field.value.trim() === item.name) {
      dispatch({ type: 'cancelRename' });
      return true;
    }
    const problem = nameProblem(field.value, item, branch, branches);
    if (problem) {
      dispatchField({ type: 'refuse', error: problem });
      return false;
    }
    dispatch({ type: 'rename', name: field.value });
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: 'cancelRename' });
    }
  }

  function handleBlur() {
    if (!save()) {
      dispatch({ type: 'cancelRename' });
    }
  }

  if (!renaming) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => dispatch({ type: 'startRename', branchKey: branch.key, itemId: item.id })}
        className={`group ${textSize} text-kern-action-default focus-visible:outline-kern-action-focus-default rounded-kern-small flex cursor-pointer items-center gap-8 self-start text-left font-semibold focus-visible:outline-4 focus-visible:outline-offset-2`}
      >
        <span className="group-hover:border-kern-action-default group-focus-visible:border-kern-action-default -mb-px border-b border-transparent break-words group-hover:border-dashed group-focus-visible:border-dashed">
          <span className="sr-only">{RULES_COPY.rename} </span>
          {item.name}
        </span>
        <span
          aria-hidden="true"
          className="kern-icon kern-icon--edit kern-icon--small bg-kern-layout-text-default! invisible shrink-0 group-hover:visible group-focus-visible:visible"
        />
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-8">
      <input
        ref={inputRef}
        value={field.value}
        aria-label={RULES_COPY.renameLabel(item.name)}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={messageId}
        onChange={(event) => dispatchField({ type: 'change', value: event.target.value })}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`${textSize} text-kern-action-default [field-sizing:content] min-w-48 border-b-2 bg-transparent px-4 font-semibold outline-none ${field.error ? 'border-kern-feedback-danger border-solid' : 'border-kern-action-default border-dotted'}`}
      />
      <span
        id={messageId}
        // Live from the start, so that an error replacing the hint is announced
        aria-live="assertive"
        className={`text-kern-static-small leading-(--kern-typography-line-height-medium-static) ${field.error ? 'text-kern-feedback-danger' : 'text-kern-layout-text-muted'}`}
      >
        {field.error ?? RULES_COPY.renameHint}
      </span>
    </span>
  );
}
