// Mirrors the agent access schemas in backend/app/schemas.py
// (specs/007-agent-mcp-server/contracts/management-api.md "Schemas")

/** What an agent connection or a personal access token may do; mirrors AccessLevel */
export type AccessLevel = 'read' | 'drafts' | 'manage';

/** An agent connection (OAuth) or a personal access token; mirrors AgentAccessKind */
export type AgentAccessKind = 'oauth' | 'token';

/** An access level with its UI name and what it allows */
export interface AccessLevelInfo {
  level: AccessLevel;
  name: string;
  allows: string;
}

/** An agent connection or personal access token on the user page */
export interface AgentAccessItem {
  id: string;
  kind: AgentAccessKind;
  /** oauth only */
  client_name: string | null;
  /** token only */
  name: string | null;
  access_level: AccessLevel;
  created_at: string;
  /** token only */
  expires_at: string | null;
  last_used_at: string | null;
}

/** A new access level; applies from the agent's next call */
export interface AgentAccessUpdate {
  access_level: AccessLevel;
}

/** A new personal access token */
export interface TokenCreate {
  name: string;
  access_level: AccessLevel;
  /** 1 to AGENT_TOKEN_MAX_DAYS */
  expires_in_days: number;
}

/** A created personal access token, with its secret, shown once */
export interface TokenCreated {
  item: AgentAccessItem;
  token: string;
}

/** The bearer principal: whose access it is and at which level */
export interface AgentMe {
  username: string;
  /** oauth only */
  client_name: string | null;
  kind: AgentAccessKind;
  access_level: AccessLevel;
  levels: AccessLevelInfo[];
}

/** The user page's list: the signed-in account's agent access, newest first; mirrors AgentAccessList */
export interface AgentAccessList {
  items: AgentAccessItem[];
  levels: AccessLevelInfo[];
}
