import type {
  AccessLevel,
  AccessLevelInfo,
  AgentAccessItem,
  AgentAccessList,
  TokenCreated,
} from '@connection-portal/api-types/agent-access';
import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { ReactNode } from 'react';

import type { ToastContent } from '../../components/Toast/types';

/** The "Create token" dialog's fields */
export interface TokenForm {
  name: string;
  level: AccessLevel;
  /** How many days the token is valid, one of `TOKEN_VALIDITY_DAYS` */
  days: number;
  /** Why the name was refused, shown until it changes */
  nameError: string | null;
}

/** The page's open dialog; the token's secret lives only in `tokenCreated`, until it closes */
export type AccountDialog =
  | { type: 'level'; item: AgentAccessItem; level: AccessLevel }
  | { type: 'revoke'; item: AgentAccessItem }
  | { type: 'createToken'; form: TokenForm }
  | { type: 'tokenCreated'; name: string; token: string };

export interface AccountState {
  status: 'loading' | 'loaded' | 'failed';
  /** Why loading failed */
  loadError: ErrorNotice | null;
  items: AgentAccessItem[];
  levels: AccessLevelInfo[];
  /** When the list was loaded: the relative times count from it */
  now: Date | null;
  dialog: AccountDialog | null;
  /** The open dialog's request runs */
  busy: boolean;
  /** Why the open dialog's last request failed */
  error: ErrorNotice | null;
  toast: ToastContent | null;
  /** How many toasts were shown, so that each new one gets its own id */
  toastCount: number;
}

export type AccountAction =
  | { type: 'loaded'; list: AgentAccessList; now: Date }
  | { type: 'loadFailed'; error: ErrorNotice }
  | { type: 'levelDialogOpened'; item: AgentAccessItem }
  | { type: 'revokeDialogOpened'; item: AgentAccessItem }
  | { type: 'createDialogOpened' }
  | { type: 'levelChosen'; level: AccessLevel }
  | { type: 'tokenFormChanged'; changes: Partial<Pick<TokenForm, 'name' | 'days'>> }
  | { type: 'tokenNameRefused'; error: string }
  | { type: 'dialogClosed' }
  | { type: 'submitted' }
  | { type: 'failed'; error: ErrorNotice }
  | { type: 'levelChanged'; item: AgentAccessItem }
  | { type: 'revoked'; id: string }
  | { type: 'tokenCreated'; created: TokenCreated }
  | { type: 'toastDismissed' };

/** A date in a row: its words, the date as shown, and the timestamp for `datetime` */
export interface DatedText {
  prefix: string;
  date: string;
  datetime: string;
}

/** What a row says */
export interface RowTexts {
  /** The client's name or the token's */
  name: string;
  /** The access level's name */
  level: string;
  /** "Connected {date}" or "Created {date}" */
  since: DatedText;
  /** "Expires {date}", tokens only */
  expires: DatedText | null;
  /** "Last used {relative}"; null for "Never used" */
  lastUse: DatedText | null;
}

export interface AgentAccessListProps {
  /** The section's heading */
  heading: string;
  /** Shown instead of the list while it is empty */
  empty: ReactNode;
  items: AgentAccessItem[];
  levels: AccessLevelInfo[];
  now: Date;
  /** Beside the heading, such as "Create token" */
  action?: ReactNode;
  onChangeLevel: (item: AgentAccessItem) => void;
  onRevoke: (item: AgentAccessItem) => void;
}

export interface AgentAccessRowProps {
  item: AgentAccessItem;
  levels: AccessLevelInfo[];
  now: Date;
  onChangeLevel: (item: AgentAccessItem) => void;
  onRevoke: (item: AgentAccessItem) => void;
}

/** A dialog of the page: the open dialog, whether its request runs, and why it failed */
export interface AccountDialogProps {
  dialog: AccountDialog | null;
  busy: boolean;
  error: ErrorNotice | null;
  dispatch: (action: AccountAction) => void;
}

export interface LevelDialogProps extends AccountDialogProps {
  levels: AccessLevelInfo[];
}

export interface TokenCreatedDialogProps {
  dialog: AccountDialog | null;
  onClose: () => void;
}

export interface TokenCopyFieldProps {
  token: string;
  /** The id of the text that tells to copy it now */
  describedBy: string;
}

export interface DatedLineProps {
  text: DatedText;
}

export type CopyStatus = 'idle' | 'copied' | 'failed';
