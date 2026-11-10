import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import expandActionIcon from '../../assets/icons/expand-more-action-small.svg';
import expandWhiteIcon from '../../assets/icons/expand-more-white-small.svg';
import { useCopy } from '../../hooks/useLanguage';
import { type MenuPlacement, placementFrom, popupWrapperClass } from '../../utils/popupPlacement';
import BranchMark from '../BranchMark';
import ConnectorMenu from './ConnectorMenu';
import {
  CONNECTOR_COPY,
  CONNECTOR_FADED,
  CONNECTOR_MENU_HEIGHT,
  CONNECTOR_MENU_WIDTH,
  CONNECTOR_PILL_STATES,
  CONNECTOR_PILLS,
} from './constants';
import type { ConnectorProps } from './types';

/**
 * Figma "Rules/Connector" (U34 6094:6511, 6094:6400): the level's AND or OR on the line between
 * two of its rules and groups (one connector between items, FR-038), with the row's padding
 * (8 24). AND is a filled pill, OR an outlined one, the line `decorative-brand`. Given
 * `onSwitch`, the pill is a menu button with the design's chevron, which opens the two-option
 * menu that switches the whole level (FR-038); its name says the level, such as "AND, switch
 * Group 01 to AND or OR". Choosing gives the focus back to the pill. Without `onSwitch` it is the
 * read-only pill of the details (no chevron, equal padding; U03 #26). In a based variant, the
 * first top-level connector carries the mark of a switched top level (W12), and a connector next
 * to a removed item fades (FR-051 (39)): its pill, line and mark, so that its open menu stays
 * unfaded and above the next row. The menu is placed with class sets (research R10): to the
 * right of the pill where it fits, otherwise to the left or across the rules card; below the pill
 * where it fits above the footer, otherwise above it.
 */
export default function Connector({
  operator,
  levelName = '',
  onSwitch,
  mark = null,
  faded = false,
}: ConnectorProps) {
  const copy = useCopy(CONNECTOR_COPY);
  // Where the open menu is placed; null while it is closed
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const open = placement !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  const menuId = useId();
  // On the pill, the line and the mark, never on a box around the menu (CONNECTOR_FADED)
  const fade = faded ? CONNECTOR_FADED : '';

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPlacement(null);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  function openMenu() {
    setPlacement(
      placementFrom(containerRef.current, CONNECTOR_MENU_WIDTH, 'start', 0, CONNECTOR_MENU_HEIGHT)
    );
  }

  function close() {
    setPlacement(null);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    }
  }

  return (
    <div className="flex px-24 py-8">
      <div className="flex flex-1 items-center gap-8">
        {onSwitch ? (
          <div ref={containerRef} className={popupWrapperClass(placement?.side ?? null)}>
            <button
              ref={triggerRef}
              id={triggerId}
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              onClick={() => (open ? setPlacement(null) : openMenu())}
              onKeyDown={handleTriggerKeyDown}
              className={`${CONNECTOR_PILLS[operator]} ${CONNECTOR_PILL_STATES[operator]} ${fade} focus-visible:outline-kern-action-focus-default flex cursor-pointer items-center gap-2 py-2 pr-8 pl-16 focus-visible:outline-4 focus-visible:outline-offset-2`}
            >
              {copy.labels[operator]}
              <img
                src={operator === 'and' ? expandWhiteIcon : expandActionIcon}
                alt=""
                className="size-20"
              />
              <span className="sr-only">{copy.switchLevel(levelName)}</span>
            </button>
            {placement && (
              <ConnectorMenu
                id={menuId}
                triggerId={triggerId}
                operator={operator}
                levelName={levelName}
                placement={placement}
                onChoose={(chosen) => {
                  close();
                  if (chosen !== operator) {
                    onSwitch(chosen);
                  }
                }}
                onClose={close}
                onLeave={() => setPlacement(null)}
              />
            )}
          </div>
        ) : (
          <span className={`${CONNECTOR_PILLS[operator]} ${fade} shrink-0 px-16 py-2`}>
            {copy.labels[operator]}
          </span>
        )}
        <span
          aria-hidden="true"
          className={`h-px flex-1 bg-(--kern-color-decorative-brand-default) ${fade}`}
        />
        {mark && (
          <span className={`flex shrink-0 ${fade}`}>
            <BranchMark mark={mark} />
          </span>
        )}
      </div>
    </div>
  );
}
