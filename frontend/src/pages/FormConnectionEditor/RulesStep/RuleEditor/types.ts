import type { Dispatch, KeyboardEvent, ReactNode } from 'react';

import type { Condition, RuleItem } from '../../../../types/form-connections';
import type { OptionSet } from '../../../../types/option-sets';
import type { OperatorDefinition } from '../../../../utils/rules/types';
import type { RulesCatalog } from '../types';

export interface RuleEditorProps {
  /** The rule as edited so far; every change goes to `onChange` */
  draft: RuleItem;
  /** The rule isn't in the list yet ("+ Add rule") */
  isNew: boolean;
  /** The branch's name, for messages such as "Rule 01 in Standard: choose a check." */
  branchName: string;
  catalog: RulesCatalog;
  onChange: (draft: RuleItem) => void;
  /** "Save rule", offered once the rule is complete */
  onSave: () => void;
  /** "Cancel"; the page asks "Save changes to Rule 01?" when there are changes (F10) */
  onCancel: () => void;
  /** "Need other data? Add it in Documents"; the page asks first when there are changes */
  onAddData: () => void;
  /** Starts renaming the rule; without it, the name shows without its pencil */
  onRename?: () => void;
  /** The day the example of a date condition counts from, YYYY-MM-DD; today in Germany */
  today?: string;
}

/** The editor's menus; one is open at a time */
export type MenuKey = 'document' | 'data' | 'part' | 'check' | 'unit' | 'values';

/** A value field whose problem shows once it was used (U25) */
export type ValueField = 'value' | 'years' | 'amount' | 'values' | 'date';

/** The rule editor's own state; the rule itself is the page's (`draft`) */
export interface RuleEditorState {
  openMenu: MenuKey | null;
  /** What is typed into the open menu's search field */
  search: string;
  /** The document chosen before its data, which the rule's target can't hold yet */
  document: string | null;
  /** The team member wrote the message: it no longer follows the condition (F9) */
  messageEdited: boolean;
  /** Numbers as typed, while they aren't numbers yet, such as "1." */
  typed: Partial<Record<'value' | 'years' | 'amount', string>>;
  /** The value fields that were used, whose problems show (U25) */
  touched: Partial<Record<ValueField, boolean>>;
}

export type RuleEditorAction =
  | { type: 'openMenu'; menu: MenuKey }
  | { type: 'closeMenu' }
  | { type: 'search'; text: string }
  | { type: 'chooseDocument'; document: string }
  | { type: 'editMessage'; edited: boolean }
  | { type: 'type'; field: 'value' | 'years' | 'amount'; text: string }
  | { type: 'touch'; field: ValueField }
  | { type: 'touchAll' }
  /** A new check: its values start again */
  | { type: 'resetValues' };

/** One choice of a single-select menu */
export interface MenuChoice {
  /** Unique within the menu */
  key: string;
  label: string;
  /** The decoration chip before the words, such as "≥"; hidden from assistive technologies */
  symbol?: string | null;
  /** A 16px glyph before the label */
  icon?: string;
  /** Listed but not choosable, with the tag "Can't be checked" */
  unavailable?: boolean;
}

/** A section of a menu: an optional heading and its choices */
export interface MenuSection {
  key: string;
  heading?: string;
  choices: MenuChoice[];
}

export interface SymbolChipProps {
  symbol: string;
}

export interface PickerProps {
  id: string;
  /** What the picker chooses, for assistive technologies: "Data" */
  name: string;
  /** What the picker shows: the choice, or what to choose */
  label: string;
  /** Nothing is chosen yet: the label is what to choose */
  placeholder: boolean;
  disabled?: boolean;
  open: boolean;
  /** The red border of a field with a problem */
  invalid?: boolean;
  icon?: string;
  symbol?: string | null;
  /** The id of the open menu, which the picker controls */
  menuId: string;
  describedBy?: string;
  onToggle: () => void;
}

export interface ChoiceMenuProps {
  id: string;
  /** The accessible name of the list, such as "Data" */
  label: string;
  sections: MenuSection[];
  selectedKey: string | null;
  /** The menu's width class, from the frames */
  widthClass: string;
  /** A search field with this placeholder, for long menus */
  searchPlaceholder?: string;
  search: string;
  /** Under the list, after a divider */
  footer?: ReactNode;
  onSearch: (text: string) => void;
  onChoose: (key: string) => void;
  /** Escape: the menu closes and the focus goes back to its picker */
  onClose: () => void;
  /** Tab: the menu closes, and the focus moves on */
  onDismiss: () => void;
}

export interface MenuSectionGroupProps {
  idBase: string;
  section: MenuSection;
  /** A divider separates it from the section before it */
  divided: boolean;
  selectedKey: string | null;
  onChoose: (key: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, key: string) => void;
}

export interface MenuChoiceItemProps {
  id: string;
  choice: MenuChoice;
  selected: boolean;
  onChoose: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface MenuSearchFieldProps {
  id: string;
  placeholder: string;
  value: string;
  controls: string;
  onChange: (text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export interface ChoicePickerProps {
  /** Distinguishes the picker's element ids */
  idBase: string;
  menu: MenuKey;
  /** The menu's accessible name */
  label: string;
  /** What the picker shows when nothing is chosen */
  placeholder: string;
  chosen: MenuChoice | null;
  disabled?: boolean;
  /** The red border: what is chosen is no longer requested */
  invalid?: boolean;
  sections: MenuSection[];
  widthClass: string;
  searchPlaceholder?: string;
  footer?: ReactNode;
  state: RuleEditorState;
  dispatch: Dispatch<RuleEditorAction>;
  onChoose: (key: string) => void;
}

/** An option of a value set, as the values menu lists it */
export interface ValueChoice {
  value: string | number;
  /** The label, or a licence class's code */
  label: string;
  /** A licence class's description, such as "Cars up to 3.5 t" */
  description: string | null;
}

export interface ValuesPickerProps {
  idBase: string;
  choices: ValueChoice[];
  /** Licence classes: rows with code and description, "Search classes" (F32) */
  classes: boolean;
  values: (string | number)[];
  invalid: boolean;
  describedBy?: string;
  state: RuleEditorState;
  dispatch: Dispatch<RuleEditorAction>;
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

export interface ValueInputProps {
  id: string;
  label: string;
  /** The text in the field */
  value: string;
  type?: 'text' | 'date';
  inputMode?: 'numeric' | 'decimal' | 'text';
  invalid: boolean;
  describedBy?: string;
  /** The frames' width: 64px for years, 96px for a text */
  widthClass: string;
  onChange: (text: string) => void;
  onBlur: () => void;
}

export interface ConditionFieldsProps {
  idBase: string;
  definition: OperatorDefinition;
  condition: Condition;
  dateOfBirth: boolean;
  optionSet: OptionSet | null;
  classes: boolean;
  /** The id of the field error under the check row, while one shows */
  errorId?: string;
  problemField: ValueField | null;
  state: RuleEditorState;
  dispatch: Dispatch<RuleEditorAction>;
  onChange: (condition: Condition) => void;
}

export interface MenuFooterProps {
  text: string;
  /** A divider separates it from the list */
  divided?: boolean;
  /** "Add it in Documents" */
  onAddData?: () => void;
}

export interface EditorHintsProps {
  hints: string[];
}

export interface EditorHintProps {
  text: string;
}

export interface FieldErrorProps {
  id: string;
  message: string;
}

export interface MessageFieldProps {
  id: string;
  message: string;
  onChange: (message: string) => void;
}

export interface EditorActionsProps {
  complete: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export interface NameRowProps {
  id: string;
  name: string;
  onRename?: () => void;
}
