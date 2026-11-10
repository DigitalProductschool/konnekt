import { type KeyboardEvent, useEffect, useId, useRef } from 'react';

import { useCopy } from '../../hooks/useLanguage';
import { MENU_NAVIGATION_KEYS, nextMenuIndex } from '../../utils/menuNavigation';
import { MENU_MAX_HEIGHT_CLASSES } from '../../utils/popupPlacement';
import ConnectorOption from './ConnectorOption';
import { CONNECTOR_COPY, CONNECTOR_MENU_PLACEMENTS, CONNECTOR_OPTIONS } from './constants';
import type { ConnectorMenuProps } from './types';

/**
 * Figma "Rules/Connector menu" (U34 6094:7052; the menus' anatomy, design-notes §3 "Menu"): AND
 * or OR for a whole level, as radio items of a WAI-ARIA menu, and the footer that says which
 * level it applies to ("Applies to every rule in Group 01"), which describes the menu. 300px
 * wide, a 1px `decorative-border` frame, radius 8, padding 8, its parts 2px apart, the menus'
 * shadow, 8px from its pill and above the sticky header (z-40). It opens with the focus on the
 * current operator. Where its max-height step is shorter than it, the options scroll inside
 * while the footer stays put.
 */
export default function ConnectorMenu({
  id,
  triggerId,
  operator,
  levelName,
  placement,
  onChoose,
  onClose,
  onLeave,
}: ConnectorMenuProps) {
  const copy = useCopy(CONNECTOR_COPY);
  const menuRef = useRef<HTMLDivElement>(null);
  const footerId = useId();

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>('[aria-checked=true]')?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitemradio]') ?? []),
    ];
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === 'Tab') {
      onLeave();
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      items[nextMenuIndex(event.key, current, items.length)]?.focus();
    }
  }

  return (
    <div
      className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute z-40 flex flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 ${MENU_MAX_HEIGHT_CLASSES[placement.maxHeight]} ${CONNECTOR_MENU_PLACEMENTS[placement.side][placement.direction][operator]}`}
    >
      <div
        ref={menuRef}
        id={id}
        role="menu"
        aria-labelledby={triggerId}
        aria-describedby={footerId}
        onKeyDown={handleKeyDown}
        className="flex min-h-0 flex-col gap-2 overflow-y-auto"
      >
        {CONNECTOR_OPTIONS.map((option) => (
          <ConnectorOption
            key={option}
            operator={option}
            description={copy.descriptions[option]}
            checked={option === operator}
            onChoose={() => onChoose(option)}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="h-px shrink-0 bg-(--kern-color-decorative-border-default)"
      />
      <p
        id={footerId}
        className="text-kern-static-small text-kern-layout-text-muted w-258 max-w-full shrink-0 px-8 pt-8 pb-4 leading-(--kern-typography-line-height-medium-static)"
      >
        {copy.appliesTo(levelName)}
      </p>
    </div>
  );
}
