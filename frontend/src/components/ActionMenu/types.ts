export interface RuleMenuItemProps {
  label: string;
  /** A KERN icon class, such as 'kern-icon--edit', or an image; none for "Restore rule" */
  icon?: { kern: string } | { src: string };
  danger?: boolean;
  onSelect: () => void;
}

/** An action of a ⋯ menu */
export interface MenuAction {
  label: string;
  icon?: RuleMenuItemProps['icon'];
  danger?: boolean;
  /** Draws the menu's divider before it */
  separated?: boolean;
  onSelect: () => void;
}

export interface ActionMenuProps {
  /** The ⋯ button's name, such as "Actions for Rule 01" */
  label: string;
  actions: MenuAction[];
}
