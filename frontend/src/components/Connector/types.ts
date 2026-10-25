import type { Combinator } from '../../types/form-connections';

export interface ConnectorProps {
  /** How the level's rules and groups combine */
  operator: Combinator;
}
