import type { Condition, RuleItem, RuleTarget } from '@konnekt/api-types/form-connections';
import type { OptionSet } from '@konnekt/api-types/option-sets';
import type { OperatorDefinition } from '@konnekt/rules/types';
import type { Dispatch, KeyboardEvent, ReactNode } from 'react';

import type { MenuPlacement } from '../../../../utils/popupPlacement';
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
  /** "Discard rule"; the page asks "Save changes to Rule 01?" when there are changes (F10) */
  onCancel: () => void;
  /** "Need other data? Add it in Documents"; the page asks first when there are changes */
  onAddData: () => void;
  /** Starts renaming the rule; without it, the name shows without its pencil */
  onRename?: () => void;
  /** The day the example of a date condition counts from, YYYY-MM-DD; today in Germany */
  today?: string;
  /**
   * The hint under the message while a group around the rule has its own message (U35
   * 6965:50822; F32): "Not shown while this rule is in Group 01. …"
   */
  messageHint?: string | null;
}

/** A menu's width in the frames, px */
export type MenuWidth = 200 | 240 | 300 | 340;

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
  /** "Save rule" was pressed on an incomplete rule, so the rule's problem shows (WCAG 3.3.1); the
   * button is then the disabled button with explanation, whose press still says it (W21) */
  saveTried: boolean;
}

/** A control of the rule editor; its element id is the editor's id base and this, joined by "-" */
export type EditorControl = 'document' | 'data' | 'part' | 'check' | 'value' | 'values' | 'message';

/** What missingControl() needs to know about the rule being edited */
export interface MissingControlInput {
  /** The chosen document, also before its data */
  document: string | null;
  target: RuleTarget | null;
  /** The target checks data that is no longer requested */
  unrequested: boolean;
  /** The target is made of parts, and its part, or its licence class, isn't chosen yet */
  partMissing: boolean;
  condition: Condition | null;
  /** The condition's values are complete */
  conditionComplete: boolean;
  /** The check takes values from a set, in the values picker */
  valuesInput: boolean;
  message: string;
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
  /** Listed but not choosable, with the tag "Not for rules" */
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
  disabled?: boolean;
  open: boolean;
  /** The red border of a field with a problem, or of a missing choice after "Save rule" */
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
  /** The menu's width, from the frames */
  width: MenuWidth;
  /** Where the menu opens from its picker, measured as it opens */
  placement: MenuPlacement;
  /** A search field with this placeholder, for long menus */
  searchPlaceholder?: string;
  search: string;
  /** Under the list */
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
  /** The red border: what is chosen is no longer requested, or the choice is missing after "Save
   * rule" (FR-039) */
  invalid?: boolean;
  /** The id of the text that says what is wrong with the picker or missing from it */
  describedBy?: string;
  sections: MenuSection[];
  /** The menu's width, from the frames */
  width: MenuWidth;
  searchPlaceholder?: string;
  footer?: ReactNode;
  /** The footer has a divider above it, for the menu's height before it opens */
  footerDivided?: boolean;
  state: RuleEditorState;
  dispatch: Dispatch<RuleEditorAction>;
  onChoose: (key: string) => void;
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
  /** Announced as it appears, for a problem shown without the focus moving to it first */
  alert?: boolean;
}

export interface MessageFieldProps {
  id: string;
  message: string;
  /** The id of the text that says the rule has no message, once "Save rule" was pressed; the
   * field is then flagged (FR-039) */
  errorId?: string;
  onChange: (message: string) => void;
}

export interface EditorActionsProps {
  /** What keeps the rule from being saved, in the server's words, while it is incomplete; null
   * once it is complete (W21) */
  explanation: string | null;
  onCancel: () => void;
  /** "Save rule": saves a complete rule, or points out what is missing in an incomplete one */
  onSave: () => void;
}

export interface NameRowProps {
  id: string;
  name: string;
  onRename?: () => void;
}
