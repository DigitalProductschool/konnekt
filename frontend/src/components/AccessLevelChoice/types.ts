import type { AccessLevel, AccessLevelInfo } from '@connection-portal/api-types/agent-access';

export interface AccessLevelChoiceProps {
  /** The levels with their names and descriptions from the API; `ACCESS_LEVELS` without them */
  levels?: AccessLevelInfo[];
  value: AccessLevel;
  onChange: (level: AccessLevel) => void;
  /** The radios' `name`, unique on the page */
  name: string;
  legend: string;
}

export interface AccessLevelOptionProps {
  level: AccessLevelInfo;
  name: string;
  checked: boolean;
  onSelect: () => void;
}
