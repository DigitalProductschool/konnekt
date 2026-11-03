import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import expandIcon from '../../assets/icons/picker-expand.svg';
import expandOpenIcon from '../../assets/icons/picker-expand-open.svg';
import MenuSearchField from '../MenuSearchField';
import { MENU_WIDTH, SEARCH_THRESHOLD } from './constants';
import type { ValuesPickerProps } from './types';
import { chosenValueLabels, matchesSearch } from './utils';
import ValueOptionItem from './ValueOptionItem';

/**
 * Figma "Rules/Multi-select field" and "Rules/Multi-select menu" (U24 6191:42191, 6191:42209):
 * the values of an enum condition, any number of them (F8), shown as chips. Also the persona
 * fields that hold several values (specs/004-rule-test-personas T044; `field`). The menu lists the
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
  field = false,
  copy,
  open,
  search,
  onOpenChange,
  onSearch,
  onChange,
}: ValuesPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerId = `${idBase}-values`;
  const menuId = `${idBase}-values-menu`;
  const searchId = `${menuId}-search`;
  const searchable = classes || choices.length > SEARCH_THRESHOLD;
  const shown = searchable
    ? choices.filter(
        (choice) =>
          matchesSearch(choice.label, search) || matchesSearch(choice.description ?? '', search)
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
    if (field) {
      // In a scrolling card, bring the field to the top, so that as much of its menu as fits shows
      containerRef.current?.scrollIntoView({ block: 'start' });
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
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
      onOpenChange(false);
      document.getElementById(triggerId)?.focus();
    }
  }

  // Tab or Shift+Tab out of the menu. A press on an option's text blurs to nowhere
  // (relatedTarget null) and must not close it; a pointer outside closes it through the listener
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (open && next && !containerRef.current?.contains(next)) {
      onOpenChange(false);
    }
  }

  const border = open
    ? 'border-kern-action-default ring-1 ring-inset ring-kern-action-default'
    : invalid
      ? 'border-kern-feedback-danger'
      : 'border-(--kern-color-decorative-border-default)';
  // A form field (Figma 7058:60661; KERN's input and its error state): the field background and
  // a 2px bottom border, danger red with a problem
  const fieldLook = invalid
    ? 'bg-kern-feedback-danger-background border-b-2 border-kern-feedback-danger'
    : 'bg-kern-layout-background-hued border-b-2 border-(--kern-color-form-input-border)';
  const triggerLook = field
    ? `rounded-kern-small focus-visible:outline-kern-action-focus-default min-h-48 w-full cursor-pointer items-center justify-between gap-8 px-16 py-4 focus-visible:outline-4 focus-visible:outline-offset-0 ${fieldLook}`
    : `rounded-kern-default bg-kern-layout-background-default focus-visible:outline-kern-action-focus-default h-40 max-w-full cursor-pointer items-center gap-8 border pr-8 pl-16 focus-visible:outline-4 focus-visible:outline-offset-2 max-md:h-auto max-md:min-h-40 max-md:py-7 ${border}`;
  const menuLook = field
    ? 'left-0 w-full'
    : `left-0 max-w-[calc(100vw-32px)] max-md:top-auto max-md:left-24 max-md:max-w-[calc(100%-48px)] ${MENU_WIDTH}`;

  return (
    <div
      ref={containerRef}
      className={field ? 'relative w-full' : 'relative max-md:static'}
      onBlur={handleBlur}
    >
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-describedby={describedBy}
        onClick={() => onOpenChange(!open)}
        className={`flex text-left ${triggerLook}`}
      >
        <span className="sr-only">{copy.menu}: </span>
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
            {copy.placeholder}
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
          className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute top-full z-20 mt-4 flex flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 ${menuLook}`}
        >
          {searchable && (
            <MenuSearchField
              id={searchId}
              placeholder={classes ? copy.searchClasses : copy.searchOptions}
              value={search}
              controls={`${menuId}-list`}
              onChange={onSearch}
              onKeyDown={handleKeyDown}
            />
          )}
          <ul
            ref={listRef}
            id={`${menuId}-list`}
            aria-label={copy.menu}
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
          {(copy.footer !== null || shown.length === 0) && (
            <>
              <div
                aria-hidden="true"
                className="h-px w-full shrink-0 bg-(--kern-color-decorative-border-default)"
              />
              <p
                aria-live="polite"
                className="text-kern-static-small text-kern-layout-text-muted pt-8 pb-4 pl-8 leading-(--kern-typography-line-height-medium-static)"
              >
                {shown.length ? copy.footer : copy.noMatch(search.trim())}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
