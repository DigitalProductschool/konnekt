import type { KeyboardEvent } from 'react';

/** An option of a value set, as the values menu lists it */
export interface ValueChoice {
  value: string | number;
  /** The label, or a licence class's code */
  label: string;
  /** A licence class's description, such as "Cars up to 3.5 t" */
  description: string | null;
  /** Shown at 40 % and can't be chosen or unchosen (the kit's disabled option) */
  disabled?: boolean;
}

/** The texts of a values picker, which differ with where it is used */
export interface ValuesPickerCopy {
  /**
   * The menu's accessible name: said before the chosen values on the button, and the list's
   * `aria-label` ("Values", "Licence classes")
   */
  menu: string;
  /** The button's text while no value is chosen ("Choose options", "Not shared") */
  placeholder: string;
  /** The search field's placeholder and name for licence classes */
  searchClasses: string;
  /** The search field's placeholder and name for a long value set */
  searchOptions: string;
  /** The menu's footer, `null` for none: "Select at least one option." */
  footer: string | null;
  /** The footer's text while the search matches nothing */
  noMatch: (search: string) => string;
}

/**
 * `ValuesPicker`: the values of a value set that any number of may be chosen, shown as chips. The
 * caller owns whether the menu is open and the search text, so that it can close the menu as it
 * sees fit (the rule editor's reducer, a persona field's own state)
 */
export interface ValuesPickerProps {
  /** Distinguishes the element ids of the button and the menu */
  idBase: string;
  choices: ValueChoice[];
  /** Licence classes: rows with code and description, "Search classes" (F32) */
  classes: boolean;
  values: (string | number)[];
  invalid: boolean;
  describedBy?: string;
  /**
   * Looks like a form field: 48px high, the field background and a 2px bottom border (Figma
   * "Field · Licence classes" 7058:60661), and its menu spans the field's width. Otherwise a
   * compact button with a 300px menu (the rule editor's)
   */
  field?: boolean;
  /** The texts that differ with where the picker is used; "Done" is the same everywhere */
  copy: ValuesPickerCopy;
  open: boolean;
  /** The search text */
  search: string;
  /** Opens or closes the menu (closing: Escape, a press outside, leaving by keyboard) */
  onOpenChange: (open: boolean) => void;
  onSearch: (text: string) => void;
  /** The new values, after one was toggled */
  onChange: (values: (string | number)[]) => void;
}

export interface ValueOptionItemProps {
  id: string;
  choice: ValueChoice;
  classes: boolean;
  checked: boolean;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}
