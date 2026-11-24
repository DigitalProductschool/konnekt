import type { Combinator, Mark } from '@konnekt/api-types/form-connections';

import type { MenuPlacement } from '../../utils/popupPlacement';

export interface ConnectorProps {
  /** How the level's rules and groups combine */
  operator: Combinator;
  /** The level, by the name of its group, or of its branch for the top level */
  levelName?: string;
  /**
   * Switches the level to AND or OR. With it, the pill opens the menu that switches it; without
   * it, the connector is read-only (the details' summary: no chevron, U03 #26)
   */
  onSwitch?: (operator: Combinator) => void;
  /** A based variant's top-level AND/OR switched there: its mark, after the line (W12) */
  mark?: Mark | null;
  /**
   * Next to a removed rule or group, or beside the only active item of its level: faded (U47
   * 6185:8569; FR-051 (39))
   */
  faded?: boolean;
}

export interface ConnectorMenuProps {
  id: string;
  /** The id of the button that opens it, which names it */
  triggerId: string;
  operator: Combinator;
  levelName: string;
  /** Where it opens from its pill: side, direction and max-height step (utils/popupPlacement.ts) */
  placement: MenuPlacement;
  onChoose: (operator: Combinator) => void;
  /** Escape: closes the menu and gives the focus back to its button */
  onClose: () => void;
  /** Tab: closes the menu and lets the focus move on */
  onLeave: () => void;
}

export interface ConnectorOptionProps {
  operator: Combinator;
  description: string;
  checked: boolean;
  onChoose: () => void;
}
