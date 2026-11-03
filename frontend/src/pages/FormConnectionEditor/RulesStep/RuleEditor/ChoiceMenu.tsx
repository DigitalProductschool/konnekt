import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import MenuSearchField from '../../../../components/MenuSearchField';
import { matchesSearch } from '../../../../components/ValuesPicker/utils';
import { RULE_EDITOR_COPY } from './constants';
import MenuSectionGroup from './MenuSectionGroup';
import type { ChoiceMenuProps } from './types';
import { focusOption } from './utils';

/**
 * A rule editor menu (Figma "Rules/Menu", "Elevation/Menu"), below its picker: an optional
 * search field, the choices in sections, and an optional footer. It follows the listbox pattern:
 * the arrow keys, Home and End move between the choices, Enter or Space chooses, and Escape
 * closes it. Tab reaches the footer's button, and the menu closes once the focus leaves it. It
 * opens with the focus on its search field or its chosen option. "No options match" is outside
 * the list, and announced. Below
 * 768px (200% zoom, small screens) it hangs from the rule editor's content edge instead of its
 * picker, and is no wider than the editor's content, so it never runs off the screen (WCAG 1.4.10).
 */
export default function ChoiceMenu({
  id,
  label,
  sections,
  selectedKey,
  widthClass,
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
      className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute top-full left-0 z-20 mt-4 flex max-w-[calc(100vw-32px)] flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 max-md:top-auto max-md:left-24 max-md:max-w-[calc(100%-48px)] ${widthClass}`}
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
        className={`flex flex-col gap-2 ${searchPlaceholder ? 'max-h-280 overflow-y-auto' : ''}`}
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
