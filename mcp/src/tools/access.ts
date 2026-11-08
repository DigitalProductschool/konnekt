// Asking for a higher access level (research R5; FR-003): `request_access` answers the whole MCP
// request with HTTP `403 insufficient_scope`, the protocol's signal for the client to run the
// authorization again with that level's scopes, so the consent page opens with it preselected. The
// server checks for it before the SDK sees the request (`stepUpOf()`), in both protocol eras: in a
// 2025-era session the response has started by the time a handler runs
import type { AccessLevel } from '@connection-portal/api-types/agent-access';
import { z } from 'zod';

import {
  type Caller,
  type HttpAnswer,
  HttpRefusal,
  LEVEL_NAMES,
  levelAllows,
  stepUpResponse,
} from '../auth';
import { registerTool, type ToolRegistry, toolResult } from './registry';

export const REQUEST_ACCESS = 'request_access';

const accessInput = z.object({
  level: z
    .enum(['drafts', 'manage'])
    .describe(
      "drafts: 'Read and edit drafts'; manage: 'Read, edit drafts and manage live connections'"
    ),
});

/** The level's name as the backend gives it to the caller, or the default one. */
function levelNameOf(caller: Caller, level: AccessLevel): string {
  return caller.levels.find((info) => info.level === level)?.name ?? LEVEL_NAMES[level];
}

/** What a caller who already has the level reads. */
export function alreadyHasMessage(caller: Caller, level: AccessLevel): string {
  return `You already have '${levelNameOf(caller, level)}'.`;
}

registerTool({
  name: REQUEST_ACCESS,
  level: 'read',
  description:
    'Asks the team member for a higher access level: drafts (Read and edit drafts) or manage ' +
    '(Read, edit drafts and manage live connections). Your client then opens the Connection ' +
    "Portal's consent page with that level selected, and the team member decides; call the " +
    'refused tool again afterwards. If you already have the level, it says so.',
  input: accessInput,
  handler: async (caller, input) => {
    // The server answers the step-up before the call reaches the tool (stepUpOf); this stands
    // for it should a call come another way
    if (!levelAllows(caller, input.level)) throw new HttpRefusal(stepUpResponse(input.level));
    const message = alreadyHasMessage(caller, input.level);
    return toolResult({ access_level: caller.accessLevel, message }, message);
  },
});

/**
 * The HTTP answer of a request whose messages call `request_access` for a level the caller
 * lacks: `stepUpResponse(level)`; null for any other request, for a call whose input the SDK will
 * refuse, and where `registry` doesn't serve the tool.
 */
export function stepUpOf(
  registry: ToolRegistry,
  caller: Caller,
  messages: Record<string, unknown>[]
): HttpAnswer | null {
  if (!registry.tools().some((tool) => tool.name === REQUEST_ACCESS)) return null;
  for (const message of messages) {
    if (message.method !== 'tools/call' || !('id' in message)) continue;
    const params = message.params as { name?: unknown; arguments?: unknown } | undefined;
    if (params?.name !== REQUEST_ACCESS) continue;
    const input = accessInput.safeParse(params.arguments ?? {});
    if (input.success && !levelAllows(caller, input.data.level)) {
      return stepUpResponse(input.data.level);
    }
  }
  return null;
}
