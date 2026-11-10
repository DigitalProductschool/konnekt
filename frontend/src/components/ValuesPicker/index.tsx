import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import expandIcon from '../../assets/icons/picker-expand.svg';
import expandOpenIcon from '../../assets/icons/picker-expand-open.svg';
import { useCopy } from '../../hooks/useLanguage';
import {
  MENU_MAX_HEIGHT_CLASSES,
  type MenuPlacement,
  placementFrom,
  popupWrapperClass,
} from '../../utils/popupPlacement';
import { isLanguageSwitchTarget } from '../LanguageSwitch/utils';
import MenuSearchField from '../MenuSearchField';
import {
  SEARCH_THRESHOLD,
  VALUES_FIELD_MENU_PLACEMENTS,
  VALUES_FULL_WRAPPERS,
  VALUES_MENU_DRAWN_HEIGHT,
  VALUES_MENU_PLACEMENTS,
  VALUES_MENU_WIDTH,
  VALUES_PICKER_TEXTS,
} from './constants';
import type { ValuesPickerProps } from './types';
import { chosenValueLabels, matchesSearch, valuesMenuHeight } from './utils';
import ValueOptionItem from './ValueOptionItem';

// The placement for the first render of an open menu, before it is measured (below, at the
// field's left)
const DEFAULT_PLACEMENT: MenuPlacement = { side: 'start', direction: 'down', maxHeight: 480 };

// A form field's menu opens below it in the card that scrolls it (the test step's data card,
// which the menu may extend), its list scrolling inside the 400px step (the baseline's 280px list)
const FIELD_PLACEMENT: MenuPlacement = { side: 'start', direction: 'down', maxHeight: 400 };

/**
 * Figma "Rules/Multi-select field" and the values menu (U48 6191:42191, 6191:42209; U32
 * 6357:43382): the values of an enum condition, any number of them (F8), shown as chips. Also the
 * persona fields that hold several values (specs/004-rule-test-personas T044; `field`). The menu
 * lists the value set with checkboxes; long sets get "Search options", the licence classes
 * "Search classes" and rows with code and description (W19). The chips show the codes only.
 * "Done" closes the menu and keeps the choice (FR-039), as Escape does, and both give the focus
 * back to the field; leaving the menu with the keyboard or pressing outside it closes it too. The button is a
 * disclosure (expanded or not), since the menu holds checkboxes, not a list box. The menu is
 * placed from its field with class sets (utils/popupPlacement.ts, research R10): below it where
 * its drawn height fits above the footer, else above it, at the field's left edge, else its
 * right, else across the rule editor; its list scrolls inside the max-height step that fits,
 * while the search field, the footer and "Done" stay put (design-notes §3 "Menu"). A form
 * field's menu spans the field below it, in the card that scrolls it. Nothing in
 * the frame clips, so the search field's 4px keyboard ring shows in the 8px padding. Below 768px
 * the chips wrap instead of being cut off.
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
  const texts = useCopy(VALUES_PICKER_TEXTS);
  // Where the menu opens, measured when the field opens it
  const [measured, setMeasured] = useState<MenuPlacement | null>(null);
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
  const footer = shown.length ? copy.footer : copy.noMatch(search.trim());
  const placement = open ? (measured ?? DEFAULT_PLACEMENT) : null;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (field) {
      // In a scrolling card, bring the field to the top, so that as much of its menu as fits shows
      containerRef.current?.scrollIntoView({ block: 'start' });
    }
    if (searchable) {
      document.getElementById(searchId)?.focus({ preventScroll: true });
    } else {
      listRef.current
        ?.querySelector<HTMLInputElement>('input:not(:disabled)')
        ?.focus({ preventScroll: true });
    }
    // A press on the header's language switch is none (spec 009): switching keeps the menu,
    // its search and the values untouched
    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !isLanguageSwitchTarget(event.target)
      ) {
        onOpenChange(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
    // Only when the menu opens or closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function measure() {
    const height = valuesMenuHeight(choices.length, classes, searchable, copy.footer !== null);
    setMeasured(
      field
        ? FIELD_PLACEMENT
        : placementFrom(
            containerRef.current,
            VALUES_MENU_WIDTH,
            'start',
            0,
            Math.min(height, VALUES_MENU_DRAWN_HEIGHT)
          )
    );
  }

  // The editor also opens the menu itself, once a check is chosen: measured then too, before
  // it shows, or it would open beside the field where 300px don't fit (320px at 200 %, T096)
  useLayoutEffect(() => {
    if (open) {
      measure();
    }
    // Only when the menu opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openMenu() {
    measure();
    onOpenChange(true);
  }

  function close() {
    onOpenChange(false);
    document.getElementById(triggerId)?.focus();
  }

  function toggle(value: string | number) {
    onChange(
      values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
    );
  }

  function moveFocus(from: EventTarget, step: 1 | -1) {
    const inputs = Array.from(
      listRef.current?.querySelectorAll<HTMLInputElement>('input:not(:disabled)') ?? []
    );
    const index = inputs.indexOf(from as HTMLInputElement);
    const next = inputs[index + step];
    if (next) {
      next.focus();
    } else if (step === -1 && searchable) {
      document.getElementById(searchId)?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    if (event.currentTarget.id === searchId) {
      if (event.key === 'ArrowDown') {
        listRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
      }
      return;
    }
    moveFocus(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1);
  }

  // Escape anywhere in the menu, "Done" included
  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  // Tab or Shift+Tab out of the menu. A press on an option's text blurs to nowhere
  // (relatedTarget null) and must not close it; a pointer outside closes it through the listener
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (open && next && !containerRef.current?.contains(next) && !isLanguageSwitchTarget(next)) {
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
  const wrapperLook = field
    ? 'relative w-full'
    : placement?.side === 'full'
      ? VALUES_FULL_WRAPPERS[placement.direction]
      : popupWrapperClass(placement?.side ?? null);
  const menuLook = placement
    ? `${MENU_MAX_HEIGHT_CLASSES[placement.maxHeight]} ${
        field
          ? VALUES_FIELD_MENU_PLACEMENTS[placement.direction]
          : VALUES_MENU_PLACEMENTS[placement.side][placement.direction]
      }`
    : '';

  return (
    <div ref={containerRef} className={wrapperLook} onBlur={handleBlur}>
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? onOpenChange(false) : openMenu())}
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
          onKeyDown={handleMenuKeyDown}
          className={`rounded-kern-default bg-kern-layout-background-default shadow-menu narrow:overflow-y-auto absolute z-40 flex flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 ${menuLook}`}
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
            className={`narrow:shrink-0 flex min-h-0 flex-col overflow-y-auto ${classes ? 'gap-2' : 'p-4'} ${shown.length ? '' : 'hidden'}`}
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
          {footer !== null && (
            <>
              <div
                aria-hidden="true"
                className="h-px w-full shrink-0 bg-(--kern-color-decorative-border-default)"
              />
              <p
                aria-live="polite"
                className="text-kern-static-small text-kern-layout-text-muted shrink-0 pt-8 pb-4 pl-8 leading-(--kern-typography-line-height-medium-static)"
              >
                {footer}
              </p>
            </>
          )}
          {/* Figma "Actions" (U32 6357:43428): "Done" at the right end */}
          <div className="flex shrink-0 justify-end">
            <button type="button" className="kern-btn kern-btn--secondary" onClick={close}>
              <span className="kern-label">{texts.done}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
