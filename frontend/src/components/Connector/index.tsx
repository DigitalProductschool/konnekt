import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import expandActionIcon from '../../assets/icons/expand-more-action-small.svg';
import expandWhiteIcon from '../../assets/icons/expand-more-white-small.svg';
import { placementFrom, type PopupPlacement, popupWrapperClass } from '../../utils/popupPlacement';
import BranchMark from '../BranchMark';
import { INACTIVE_OPACITY } from '../BranchMark/constants';
import ConnectorMenu from './ConnectorMenu';
import { CONNECTOR_COPY, CONNECTOR_LABELS, CONNECTOR_MENU_WIDTH } from './constants';
import type { ConnectorProps } from './types';

/**
 * Figma "Rules/Connector" (U14 6094:6511, 6094:6401): the level's AND or OR on the line between
 * two of its rules and groups, with the row's padding. AND is a filled pill, OR an outlined one.
 * Given `onSwitch`, the pill is a menu button with the design's chevron, which opens the menu
 * that switches the whole level (FR-007); its name says the level, such as "AND, switch Group 01
 * to AND or OR". Choosing gives the focus back to the pill. In a based variant, the first
 * top-level connector carries the mark of a switched top level (W4), and a connector before a
 * removed item fades with it. The menu opens to the right of the pill where it fits, otherwise to
 * the left or across the window (WCAG 1.4.10).
 */
export default function Connector({
  operator,
  levelName = '',
  onSwitch,
  mark = null,
  faded = false,
}: ConnectorProps) {
  // Where the open menu is placed; null while it is closed
  const [placement, setPlacement] = useState<PopupPlacement | null>(null);
  const open = placement !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  const menuId = useId();
  // Figma's `circle` radius on a pill: KERN 2.8's 50% would draw an ellipse
  const pill = `rounded-full text-kern-static-small leading-(--kern-typography-line-height-medium-static) font-semibold ${
    operator === 'and'
      ? 'bg-kern-action-default text-kern-action-on-default'
      : 'bg-kern-layout-background-default text-kern-action-default border border-kern-action-default'
  }`;

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
    setPlacement(placementFrom(containerRef.current, CONNECTOR_MENU_WIDTH, 'start'));
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
    <div className={`flex px-24 py-8 ${faded ? INACTIVE_OPACITY : ''}`}>
      <div className="flex flex-1 items-center gap-8">
        {onSwitch ? (
          <div ref={containerRef} className={popupWrapperClass(placement)}>
            <button
              ref={triggerRef}
              id={triggerId}
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              onClick={() => (open ? setPlacement(null) : openMenu())}
              onKeyDown={handleTriggerKeyDown}
              className={`${pill} focus-visible:outline-kern-action-focus-default flex cursor-pointer items-center gap-2 py-2 pr-8 pl-16 focus-visible:outline-4 focus-visible:outline-offset-2`}
            >
              {CONNECTOR_LABELS[operator]}
              <img
                src={operator === 'and' ? expandWhiteIcon : expandActionIcon}
                alt=""
                className="size-20"
              />
              <span className="sr-only">{CONNECTOR_COPY.switchLevel(levelName)}</span>
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
          <span className={`${pill} px-16 py-2`}>{CONNECTOR_LABELS[operator]}</span>
        )}
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-(--kern-color-decorative-brand-default)"
        />
        {mark && <BranchMark mark={mark} />}
      </div>
    </div>
  );
}
