import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import expandActionIcon from '../../assets/icons/expand-more-action-small.svg';
import expandWhiteIcon from '../../assets/icons/expand-more-white-small.svg';
import ConnectorMenu from './ConnectorMenu';
import { CONNECTOR_COPY, CONNECTOR_LABELS } from './constants';
import type { ConnectorProps } from './types';

/**
 * Figma "Rules/Connector" (U14 6094:6511, 6094:6401): the level's AND or OR on the line between
 * two of its rules and groups, with the row's padding. AND is a filled pill, OR an outlined one.
 * Given `onSwitch`, the pill is a menu button with the design's chevron, which opens the menu
 * that switches the whole level (FR-007); its name says the level, such as "AND, switch Group 01
 * to AND or OR". Choosing gives the focus back to the pill.
 */
export default function Connector({ operator, levelName = '', onSwitch }: ConnectorProps) {
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div className="flex px-24 py-8">
      <div className="flex flex-1 items-center gap-8">
        {onSwitch ? (
          <div ref={containerRef} className="relative">
            <button
              ref={triggerRef}
              id={triggerId}
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              onClick={() => setOpen((isOpen) => !isOpen)}
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
            {open && (
              <ConnectorMenu
                id={menuId}
                triggerId={triggerId}
                operator={operator}
                levelName={levelName}
                onChoose={(chosen) => {
                  close();
                  if (chosen !== operator) {
                    onSwitch(chosen);
                  }
                }}
                onClose={close}
                onLeave={() => setOpen(false)}
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
      </div>
    </div>
  );
}
