import type { ReactNode } from 'react';

import type { Combinator, GroupItem } from '../../types/form-connections';

/** A member of a group, already rendered, with its React key */
export interface GroupFrameMember {
  key: string;
  node: ReactNode;
}

export interface GroupFrameProps {
  group: GroupItem;
  /** A group inside a group: white, rounded, with a smaller name (U14 6094:6318) */
  subGroup: boolean;
  /** The frame's element id; the focus moves there after a refused Publish or Save (F11) */
  id?: string;
  /** Replaces the name while it is renamed inline (F12) */
  nameSlot?: ReactNode;
  /** Shows the identifier, read-only, next to the name: on the details only (W1) */
  showIdentifier?: boolean;
  /** The Rules step's ⋯ menu; the details show none */
  actions?: ReactNode;
  /**
   * Makes the group's own message editable (W6): the field's id, and what follows typing. The
   * message card shows while the message isn't null
   */
  messageField?: { id: string; onChange: (message: string) => void };
  /** A note under the header, such as the one after switching the group's AND or OR */
  note?: ReactNode;
  /** A problem to point out under the header, such as a refused Publish's (F11) */
  flag?: string | null;
  members: GroupFrameMember[];
  /** Switches the group's AND or OR; without it, the connectors are read-only */
  onSwitchOperator?: (operator: Combinator) => void;
  /** Under the members, such as the Rules step's "Add rule" */
  footer?: ReactNode;
}

export interface GroupHeaderProps {
  name: string;
  subGroup: boolean;
  operator: Combinator;
  nameSlot?: ReactNode;
  identifier?: string;
  actions?: ReactNode;
}

export interface GroupMessageProps {
  message: string;
  field?: { id: string; onChange: (message: string) => void };
}
