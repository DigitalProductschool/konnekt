import type { Combinator, Mark } from '../../types/form-connections';
import type { PopupPlacement } from '../../utils/popupPlacement';

export interface ConnectorProps {
  /** How the level's rules and groups combine */
  operator: Combinator;
  /** The level, by the name of its group, or of its branch for the top level */
  levelName?: string;
  /**
   * Switches the level to AND or OR. With it, the pill opens the menu that switches it; without
   * it, the connector is read-only
   */
  onSwitch?: (operator: Combinator) => void;
  /** A based variant's top-level AND/OR switched there: its mark, after the line (W4) */
  mark?: Mark | null;
  /** Before a removed rule or group: faded with it (U23 6185:8571) */
  faded?: boolean;
}

export interface ConnectorMenuProps {
  id: string;
  /** The id of the button that opens it, which names it */
  triggerId: string;
  operator: Combinator;
  levelName: string;
  /** Where it opens from its pill: below it, to the side that fits (utils/popupPlacement.ts) */
  placement: PopupPlacement;
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
