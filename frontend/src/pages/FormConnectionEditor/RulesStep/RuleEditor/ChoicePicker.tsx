import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { isLanguageSwitchTarget } from '../../../../components/LanguageSwitch/utils';
import {
  type MenuPlacement,
  placementFrom,
  popupWrapperClass,
} from '../../../../utils/popupPlacement';
import ChoiceMenu from './ChoiceMenu';
import { CHOICE_FULL_WRAPPERS, CHOICE_MENU_DRAWN_HEIGHT } from './constants';
import Picker from './Picker';
import type { ChoicePickerProps } from './types';
import { choiceMenuHeight } from './utils';

/**
 * A picker with its menu: document, data, part, check or unit (S10). Its menu is open while the
 * editor's state says so; a pointer outside closes it, except on the language switch, which keeps
 * the menu and its search (spec 009, US1-AS2). The menu is placed from its picker as it
 * opens, before it shows (utils/popupPlacement.ts, research R10; T021's placement): a choice opens
 * the next picker's menu, whose picker may only appear, or move, in that same change, so it is
 * measured once the picker is where it ends up.
 */
export default function ChoicePicker({
  idBase,
  menu,
  label,
  placeholder,
  chosen,
  disabled = false,
  invalid = false,
  describedBy,
  sections,
  width,
  searchPlaceholder,
  footer,
  footerDivided = false,
  state,
  dispatch,
  onChoose,
}: ChoicePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const open = state.openMenu === menu;
  const triggerId = `${idBase}-${menu}`;
  const menuId = `${idBase}-${menu}-menu`;
  const shown = open ? placement : null;

  // Measured before the browser paints, so that the menu shows in its place at once
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const height = choiceMenuHeight(
      sections,
      searchPlaceholder !== undefined,
      footer ? (footerDivided ? 'divided' : 'plain') : 'none'
    );
    // The placement is a measurement of the page, which only exists after the render
    setPlacement(
      placementFrom(
        containerRef.current,
        width,
        'start',
        0,
        Math.min(height, CHOICE_MENU_DRAWN_HEIGHT)
      )
    );
    // Only when the menu opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !isLanguageSwitchTarget(event.target)
      ) {
        dispatch({ type: 'closeMenu' });
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open, dispatch]);

  function close() {
    dispatch({ type: 'closeMenu' });
    document.getElementById(triggerId)?.focus();
  }

  const wrapper =
    shown?.side === 'full'
      ? CHOICE_FULL_WRAPPERS[shown.direction]
      : popupWrapperClass(shown?.side ?? null);

  return (
    <div ref={containerRef} className={`max-w-full ${wrapper}`}>
      <Picker
        id={triggerId}
        name={label}
        label={chosen?.label ?? placeholder}
        disabled={disabled}
        open={open}
        invalid={invalid}
        describedBy={describedBy}
        icon={chosen?.icon}
        symbol={chosen?.symbol}
        menuId={`${menuId}-list`}
        onToggle={() => dispatch(open ? { type: 'closeMenu' } : { type: 'openMenu', menu })}
      />
      {shown && (
        <ChoiceMenu
          id={menuId}
          label={label}
          sections={sections}
          selectedKey={chosen?.key ?? null}
          width={width}
          placement={shown}
          searchPlaceholder={searchPlaceholder}
          search={state.search}
          footer={footer}
          onSearch={(text) => dispatch({ type: 'search', text })}
          onChoose={onChoose}
          onClose={close}
          onDismiss={() => dispatch({ type: 'closeMenu' })}
        />
      )}
    </div>
  );
}
