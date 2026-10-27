import { type KeyboardEvent, useEffect, useId, useRef } from 'react';

import { MENU_NAVIGATION_KEYS, nextMenuIndex } from '../../utils/menuNavigation';
import ConnectorOption from './ConnectorOption';
import { CONNECTOR_COPY, CONNECTOR_MENU_PLACEMENTS, CONNECTOR_OPTIONS } from './constants';
import type { ConnectorMenuProps } from './types';

/**
 * Figma "Rules/Connector menu" (U14 6094:7052): AND or OR for a whole level, as radio items of
 * a WAI-ARIA menu, and the footer that says which level it applies to. It opens with the focus
 * on the current operator.
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
      className={`rounded-kern-default bg-kern-layout-background-default shadow-menu z-20 mt-4 flex flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 ${CONNECTOR_MENU_PLACEMENTS[placement]}`}
    >
      <div
        ref={menuRef}
        id={id}
        role="menu"
        aria-labelledby={triggerId}
        aria-describedby={footerId}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-2"
      >
        {CONNECTOR_OPTIONS.map((option) => (
          <ConnectorOption
            key={option.operator}
            operator={option.operator}
            description={option.description}
            checked={option.operator === operator}
            onChoose={() => onChoose(option.operator)}
          />
        ))}
      </div>
      <div aria-hidden="true" className="h-px bg-(--kern-color-decorative-border-default)" />
      <p
        id={footerId}
        className="text-kern-static-small text-kern-layout-text-muted px-8 pt-8 pb-4 leading-(--kern-typography-line-height-medium-static)"
      >
        {CONNECTOR_COPY.appliesTo(levelName)}
      </p>
    </div>
  );
}
