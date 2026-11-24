import type { AccessLevel, AccessLevelInfo } from '@konnekt/api-types/agent-access';

export interface AccessLevelChoiceProps {
  /** The levels with their names and descriptions from the API; `ACCESS_LEVELS` without them */
  levels?: AccessLevelInfo[];
  value: AccessLevel;
  onChange: (level: AccessLevel) => void;
  /** The radios' `name`, unique on the page */
  name: string;
  legend: string;
  /** Greys every radio out (KERN's 40 %) and stops the choice changing */
  disabled?: boolean;
}

export interface AccessLevelOptionProps {
  level: AccessLevelInfo;
  name: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
}
