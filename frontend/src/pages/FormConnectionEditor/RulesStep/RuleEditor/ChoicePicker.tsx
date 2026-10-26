import { useEffect, useRef } from 'react';

import ChoiceMenu from './ChoiceMenu';
import Picker from './Picker';
import type { ChoicePickerProps } from './types';

/**
 * A picker with its menu: document, data, part, check or unit (S3). Its menu is open while the
 * editor's state says so; a pointer outside closes it.
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
  widthClass,
  searchPlaceholder,
  footer,
  state,
  dispatch,
  onChoose,
}: ChoicePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const open = state.openMenu === menu;
  const triggerId = `${idBase}-${menu}`;
  const menuId = `${idBase}-${menu}-menu`;

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
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

  return (
    <div ref={containerRef} className="relative max-md:static">
      <Picker
        id={triggerId}
        name={label}
        label={chosen?.label ?? placeholder}
        placeholder={!chosen}
        disabled={disabled}
        open={open}
        invalid={invalid}
        describedBy={describedBy}
        icon={chosen?.icon}
        symbol={chosen?.symbol}
        menuId={`${menuId}-list`}
        onToggle={() => dispatch(open ? { type: 'closeMenu' } : { type: 'openMenu', menu })}
      />
      {open && (
        <ChoiceMenu
          id={menuId}
          label={label}
          sections={sections}
          selectedKey={chosen?.key ?? null}
          widthClass={widthClass}
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
