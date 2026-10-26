import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import expandIcon from '../../../../assets/icons/picker-expand.svg';
import expandOpenIcon from '../../../../assets/icons/picker-expand-open.svg';
import { MENU_WIDTHS, RULE_EDITOR_COPY, SEARCH_THRESHOLD } from './constants';
import MenuSearchField from './MenuSearchField';
import type { ValuesPickerProps } from './types';
import { chosenValueLabels, matchesSearch } from './utils';
import ValueOptionItem from './ValueOptionItem';

/**
 * Figma "Rules/Multi-select field" and "Rules/Multi-select menu" (U24 6191:42191, 6191:42209):
 * the values of an enum condition, any number of them (F8), shown as chips. The menu lists the
 * value set with checkboxes; long sets get "Search options", the licence classes "Search
 * classes" and rows with code and description (F32). The chips show the codes only. Escape
 * closes the menu; leaving it with the keyboard or the pointer closes it too. The button is a
 * disclosure (expanded or not), since the menu holds checkboxes, not a list box. Below 768px, the
 * chips wrap instead of being cut off, and the menu hangs from the rule editor's content edge, as
 * ChoiceMenu's does.
 */
export default function ValuesPicker({
  idBase,
  choices,
  classes,
  values,
  invalid,
  describedBy,
  state,
  dispatch,
  onChange,
}: ValuesPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const open = state.openMenu === 'values';
  const triggerId = `${idBase}-values`;
  const menuId = `${idBase}-values-menu`;
  const searchId = `${menuId}-search`;
  const searchable = classes || choices.length > SEARCH_THRESHOLD;
  const shown = searchable
    ? choices.filter(
        (choice) =>
          matchesSearch(choice.label, state.search) ||
          matchesSearch(choice.description ?? '', state.search)
      )
    : choices;
  const chips = chosenValueLabels(values, choices);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (searchable) {
      document.getElementById(searchId)?.focus();
    } else {
      listRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        dispatch({ type: 'closeMenu' });
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
    // Only when the menu opens or closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(value: string | number) {
    onChange(
      values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
    );
  }

  function moveFocus(from: EventTarget, step: 1 | -1) {
    const inputs = Array.from(listRef.current?.querySelectorAll<HTMLInputElement>('input') ?? []);
    const index = inputs.indexOf(from as HTMLInputElement);
    const next = inputs[index + step];
    if (next) {
      next.focus();
    } else if (step === -1 && searchable) {
      document.getElementById(searchId)?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (event.currentTarget.id === searchId) {
        if (event.key === 'ArrowDown') {
          listRef.current?.querySelector<HTMLInputElement>('input')?.focus();
        }
        return;
      }
      moveFocus(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dispatch({ type: 'closeMenu' });
      document.getElementById(triggerId)?.focus();
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (open && !containerRef.current?.contains(event.relatedTarget as Node | null)) {
      dispatch({ type: 'closeMenu' });
    }
  }

  const border = open
    ? 'border-kern-action-default ring-1 ring-inset ring-kern-action-default'
    : invalid
      ? 'border-kern-feedback-danger'
      : 'border-(--kern-color-decorative-border-default)';

  return (
    <div ref={containerRef} className="relative max-md:static" onBlur={handleBlur}>
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-describedby={describedBy}
        onClick={() =>
          dispatch(open ? { type: 'closeMenu' } : { type: 'openMenu', menu: 'values' })
        }
        className={`rounded-kern-default bg-kern-layout-background-default focus-visible:outline-kern-action-focus-default flex h-40 max-w-full cursor-pointer items-center gap-8 border pr-8 pl-16 focus-visible:outline-4 focus-visible:outline-offset-2 max-md:h-auto max-md:min-h-40 max-md:py-7 ${border}`}
      >
        <span className="sr-only">{RULE_EDITOR_COPY.valuesMenu}: </span>
        {chips.length ? (
          <span className="flex min-w-0 items-center gap-4 overflow-hidden max-md:flex-wrap">
            {chips.map((chip) => (
              // Figma "Rules/Value chip" (6082:3447)
              <span
                key={chip.value}
                className="rounded-kern-small bg-kern-layout-background-default text-kern-static-small text-kern-layout-text-default shrink-0 border border-(--kern-color-decorative-border-default) px-8 py-2 leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap"
              >
                {chip.label}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) whitespace-nowrap">
            {RULE_EDITOR_COPY.chooseOptions}
          </span>
        )}
        <img
          src={open ? expandOpenIcon : expandIcon}
          alt=""
          className={`size-20 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          id={menuId}
          className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute top-full left-0 z-20 mt-4 flex max-w-[calc(100vw-32px)] flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 max-md:top-auto max-md:left-24 max-md:max-w-[calc(100%-48px)] ${MENU_WIDTHS.values}`}
        >
          {searchable && (
            <MenuSearchField
              id={searchId}
              placeholder={
                classes ? RULE_EDITOR_COPY.searchClasses : RULE_EDITOR_COPY.searchOptions
              }
              value={state.search}
              controls={`${menuId}-list`}
              onChange={(text) => dispatch({ type: 'search', text })}
              onKeyDown={handleKeyDown}
            />
          )}
          <ul
            ref={listRef}
            id={`${menuId}-list`}
            aria-label={RULE_EDITOR_COPY.valuesMenu}
            className={`flex max-h-280 flex-col overflow-y-auto ${classes ? 'gap-2' : 'p-4'}`}
          >
            {shown.map((choice) => (
              <ValueOptionItem
                key={choice.value}
                id={`${menuId}-${choice.value}`}
                choice={choice}
                classes={classes}
                checked={values.includes(choice.value)}
                onToggle={() => toggle(choice.value)}
                onKeyDown={handleKeyDown}
              />
            ))}
          </ul>
          <div
            aria-hidden="true"
            className="h-px w-full shrink-0 bg-(--kern-color-decorative-border-default)"
          />
          <p
            aria-live="polite"
            className="text-kern-static-small text-kern-layout-text-muted pt-8 pb-4 pl-8 leading-(--kern-typography-line-height-medium-static)"
          >
            {shown.length
              ? RULE_EDITOR_COPY.selectAtLeastOne
              : RULE_EDITOR_COPY.noMatch(state.search.trim())}
          </p>
        </div>
      )}
    </div>
  );
}
