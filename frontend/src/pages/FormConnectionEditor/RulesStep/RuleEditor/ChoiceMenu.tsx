import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import MenuSearchField from '../../../../components/MenuSearchField';
import { matchesSearch } from '../../../../components/ValuesPicker/utils';
import { MENU_MAX_HEIGHT_CLASSES } from '../../../../utils/popupPlacement';
import { CHOICE_MENU_PLACEMENTS, MENU_WIDTH_CLASSES, RULE_EDITOR_COPY } from './constants';
import MenuSectionGroup from './MenuSectionGroup';
import type { ChoiceMenuProps } from './types';
import { focusOption } from './utils';

/**
 * A rule editor menu (Figma "Rules/Menu · Documents" U30 6350:41316, the data menu U31
 * 6350:41548, "Rules/Menu · Date checks" 6985:50041; "Elevation/Menu"): an optional search field
 * that stays put, the choices in sections, and an optional footer. It follows the listbox
 * pattern: the arrow keys, Home and End move between the choices, Enter or Space chooses, and
 * Escape closes it. Tab reaches the footer's button, and the menu closes once the focus leaves
 * it. It opens with the focus on its search field or its chosen option. "No options match" is
 * outside the list, and announced. It is placed from its picker's wrapper with class sets
 * (design-notes §3 "Menu"): 8px below or above the picker, at its left edge, else its right
 * edge, else across the rule editor's content (WCAG 1.4.10); its list scrolls inside the
 * max-height step that fits between the step header and the footer. It stays above the sticky
 * header and footer (z-40), and nothing around it clips it (V6).
 */
export default function ChoiceMenu({
  id,
  label,
  sections,
  selectedKey,
  width,
  placement,
  searchPlaceholder,
  search,
  footer,
  onSearch,
  onChoose,
  onClose,
  onDismiss,
}: ChoiceMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const searchId = `${id}-search`;
  const listId = `${id}-list`;
  const shown = searchPlaceholder
    ? sections
        .map((section) => ({
          ...section,
          choices: section.choices.filter((choice) => matchesSearch(choice.label, search)),
        }))
        .filter((section) => section.choices.length > 0)
    : sections;

  useEffect(() => {
    if (searchPlaceholder) {
      document.getElementById(searchId)?.focus();
      return;
    }
    focusOption(listRef.current, selectedKey ? `${id}-${selectedKey}` : null, 'first');
    // Only when the menu opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, choiceKey: string | null) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Home':
      case 'End': {
        event.preventDefault();
        const moved = focusOption(listRef.current, event.currentTarget.id, event.key);
        if (!moved && event.key === 'ArrowUp' && searchPlaceholder) {
          document.getElementById(searchId)?.focus();
        }
        return;
      }
      case 'Enter':
      case ' ':
        if (choiceKey !== null) {
          event.preventDefault();
          onChoose(choiceKey);
        }
        return;
      case 'Escape':
        event.preventDefault();
        onClose();
        return;
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(listRef.current, null, 'first');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  // Tab or Shift+Tab out of the menu. A choice moves the focus on itself, and a pointer outside
  // closes the menu through its picker
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next && !event.currentTarget.contains(next)) {
      onDismiss();
    }
  }

  return (
    <div
      id={id}
      onBlur={handleBlur}
      className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute z-40 flex flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 ${MENU_MAX_HEIGHT_CLASSES[placement.maxHeight]} ${CHOICE_MENU_PLACEMENTS[placement.side][placement.direction]} ${placement.side === 'full' ? '' : MENU_WIDTH_CLASSES[width]}`}
    >
      {searchPlaceholder && (
        <MenuSearchField
          id={searchId}
          placeholder={searchPlaceholder}
          value={search}
          controls={listId}
          onChange={onSearch}
          onKeyDown={handleSearchKeyDown}
        />
      )}
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        className="flex min-h-0 flex-col gap-2 overflow-y-auto"
      >
        {shown.map((section, index) => (
          <MenuSectionGroup
            key={section.key}
            idBase={id}
            section={section}
            divided={index > 0}
            selectedKey={selectedKey}
            onChoose={onChoose}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>
      <p
        role="status"
        className={
          shown.length === 0
            ? 'text-kern-static-small text-kern-layout-text-muted pt-8 pb-4 pl-8 leading-(--kern-typography-line-height-medium-static)'
            : 'sr-only'
        }
      >
        {shown.length === 0 ? RULE_EDITOR_COPY.noMatch(search.trim()) : ''}
      </p>
      {footer}
    </div>
  );
}
