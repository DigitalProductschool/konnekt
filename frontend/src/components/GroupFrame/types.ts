import type { Combinator, GroupItem, Mark } from '@connection-portal/api-types/form-connections';
import type { ReactNode } from 'react';

import type { ShownFinding } from '../FindingNote/types';

/** A member of a group, already rendered, with its React key */
export interface GroupFrameMember {
  key: string;
  node: ReactNode;
  /**
   * Fades the connector before it, as next to a removed item (U47 6185:8569; FR-051 (39)): the
   * call site's decision. The member fades its own content
   */
  faded?: boolean;
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
  /**
   * The group's finding of spec 003, in the Rules step only: the details never pass it (FR-020).
   * The frame is then outlined in the finding's colour with its note under the header (F4, F6). A
   * `flag` wins: a flagged group shows no finding (W11)
   */
  finding?: ShownFinding | null;
  members: GroupFrameMember[];
  /** Switches the group's AND or OR; without it, the connectors are read-only */
  onSwitchOperator?: (operator: Combinator) => void;
  /** Under the members, such as the Rules step's "Add rule" */
  footer?: ReactNode;
  /** How a based variant's group differs from Standard's (FR-023); none elsewhere */
  mark?: Mark | null;
  /**
   * Removed, or dissolved in its variant (F13; U47 6185:41165): marked "Removed here", its name
   * struck through and its header's text, message and connectors faded, the frame, the mark and
   * the ⋯ at full colour. Its members fade themselves: the call site passes them `faded`
   */
  inactive?: boolean;
  /**
   * Inside a removed or dissolved group (U47 6185:41171): faded part by part, its frame's fill,
   * border and divider too, its name struck through; its mark keeps its colour (F36, FR-040)
   */
  faded?: boolean;
  /**
   * The group's checkbox in select mode (F33; U36 6344:53557), placed before the frame; the
   * selected group itself looks unchanged
   */
  selectBox?: ReactNode;
}

export interface GroupHeaderProps {
  /**
   * The header's element id, which makes it focusable from script: the findings banner's name
   * links move the focus there (spec 003, W19)
   */
  id?: string;
  /** The id of the note under the header that describes it, a problem or a finding */
  describedBy?: string;
  name: string;
  subGroup: boolean;
  operator: Combinator;
  nameSlot?: ReactNode;
  identifier?: string;
  actions?: ReactNode;
  mark?: Mark | null;
  /** Fades the name and the subtitle and strikes the name through; the mark and ⋯ stay */
  inactive?: boolean;
  /** In a faded frame: the divider under the header fades too */
  faded?: boolean;
}

export interface GroupMessageProps {
  message: string;
  field?: { id: string; onChange: (message: string) => void };
  /** In a removed group or inside one: the card fades (it holds no menu) */
  faded?: boolean;
}
