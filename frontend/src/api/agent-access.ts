import type {
  AgentAccessItem,
  AgentAccessList,
  AgentAccessUpdate,
  TokenCreate,
  TokenCreated,
} from '@konnekt/api-types/agent-access';

import { apiFetch } from './client';

// The user page's endpoints (specs/007-agent-mcp-server/contracts/management-api.md
// "Agent access, the user page")

/** The signed-in account's agent connections and personal access tokens, newest first */
export function listAgentAccess(): Promise<AgentAccessList> {
  return apiFetch<AgentAccessList>('/agent-access');
}

/** Applies from the agent's next call */
export function changeAccessLevel(id: string, body: AgentAccessUpdate): Promise<AgentAccessItem> {
  return apiFetch<AgentAccessItem>(`/agent-access/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function revokeAgentAccess(id: string): Promise<null> {
  return apiFetch<null>(`/agent-access/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** The answer holds the token's secret, which is shown once and never stored */
export function createToken(body: TokenCreate): Promise<TokenCreated> {
  return apiFetch<TokenCreated>('/agent-access/tokens', { method: 'POST', body });
}
