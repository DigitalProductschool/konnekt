import { nameProblem } from '@konnekt/rules/validation';
import { type FocusEvent, type KeyboardEvent, useEffect, useId, useReducer, useRef } from 'react';

import { isLanguageSwitchTarget } from '../../../components/LanguageSwitch/utils';
import { useLanguage } from '../../../hooks/useLanguage';
import { NAME_SIZES, RULES_STEP_COPY } from './constants';
import FieldError from './RuleEditor/FieldError';
import type { ItemNameProps } from './types';
import { renameReducer, standingOf } from './utils';

/**
 * A rule's, group's or sub-group's name in the list (U14 6094:6413): a button that starts
 * renaming, which shows the design's hint (dashed underline and pencil, its colour in 150 ms) on
 * hover and focus, and while renaming the inline field (U49 6196:10653, "Rules/Search field": 240
 * × 40, white, a 1px line, radius 8, 16 at the sides, body/default) with the hint under it. Enter
 * saves and Escape cancels; a missing, used or reserved name is refused there, naming the branch
 * (F12, C5, W12), with a red line and "Rules/Field error" 8 under the field (U49 6196:10710).
 * Leaving the field saves a name that fits. In a variant, a rule or group linked to Standard has
 * no Rename (FR-036; CLAR #53): its name is plain text there. A press on the header's language
 * switch keeps the field, what is typed and its refusal, which follows the language (spec 009,
 * FR-003); the next press elsewhere ends it as leaving the field does.
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
  const renamable = standingOf(branch, item) !== 'inherited';
  const { language } = useLanguage();
  const copy = RULES_STEP_COPY[language];
  // The refusal in the language shown: the same check again, as the value hasn't changed since
  const error =
    field.error === null
      ? null
      : (nameProblem(field.value, item, branch, branches, language) ?? field.error);
  // Ends the rename as leaving the field does, for a press elsewhere after one on the switch
  const leaveRef = useRef(leave);

  useEffect(() => {
    leaveRef.current = leave;
  });

  useEffect(() => {
    if (!renaming) {
      return;
    }
    function leaveOnOutsidePointer(event: PointerEvent) {
      const input = inputRef.current;
      if (
        input &&
        document.activeElement !== input &&
        !input.contains(event.target as Node) &&
        !isLanguageSwitchTarget(event.target)
      ) {
        leaveRef.current();
      }
    }
    document.addEventListener('pointerdown', leaveOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', leaveOnOutsidePointer);
  }, [renaming]);

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
    const problem = nameProblem(field.value, item, branch, branches, language);
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

  function leave() {
    if (!save()) {
      dispatch({ type: 'cancelRename' });
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    if (!isLanguageSwitchTarget(event.relatedTarget)) {
      leave();
    }
  }

  if (!renamable) {
    return (
      <span className={`${textSize} text-kern-action-default self-start font-semibold break-words`}>
        {item.name}
      </span>
    );
  }
  if (!renaming) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => dispatch({ type: 'startRename', branchKey: branch.key, itemId: item.id })}
        className={`group ${textSize} text-kern-action-default focus-visible:outline-kern-action-focus-default rounded-kern-small flex cursor-pointer items-center gap-8 self-start text-left font-semibold focus-visible:outline-4 focus-visible:outline-offset-2`}
      >
        <span className="group-hover:border-kern-action-default group-focus-visible:border-kern-action-default motion -mb-px border-b border-transparent break-words transition-colors duration-(--duration-colour) group-hover:border-dashed group-focus-visible:border-dashed">
          <span className="sr-only">{copy.rename} </span>
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
    <div className="flex flex-col items-start gap-8">
      <input
        ref={inputRef}
        value={field.value}
        aria-label={copy.renameLabel(item.name)}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        onChange={(event) => dispatchField({ type: 'change', value: event.target.value })}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`rounded-kern-default bg-kern-layout-background-default text-kern-static-medium text-kern-layout-text-default focus-visible:outline-kern-action-focus-default motion h-40 w-240 max-w-full border px-16 leading-(--kern-typography-line-height-medium-static) transition-colors duration-(--duration-colour) focus-visible:outline-2 focus-visible:outline-offset-0 ${error ? 'border-kern-feedback-danger' : 'hover:border-kern-form-input-border border-(--kern-color-decorative-border-default)'}`}
      />
      {/* Live from the start, so that an error replacing the hint is announced */}
      <div id={messageId} aria-live="assertive">
        {error ? (
          <FieldError id={`${messageId}-error`} message={error} />
        ) : (
          <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
            {copy.renameHint}
          </p>
        )}
      </div>
    </div>
  );
}
