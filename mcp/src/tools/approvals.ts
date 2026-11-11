// Asking for the team member's approval (contracts/mcp-tools.md "Approval"; research R2, R12;
// FR-021 to FR-027): publishing or deleting a draft, and deactivating, reactivating or deleting a
// published connection, never happen through a tool. `request_approval` creates an approval
// request and answers its link, which the client also shows as a URL elicitation where it declared
// one; `check_approval` reads the outcome. Nothing here changes a connection
import type { AccessLevel } from '@connection-portal/api-types/agent-access';
import type {
  ApprovalAction,
  ApprovalPreview,
  ApprovalRequest,
  ApprovalStatus,
} from '@connection-portal/api-types/approvals';
import type {
  ConnectionUrls as ApiConnectionUrls,
  FormConnectionOrDraft,
} from '@connection-portal/api-types/form-connections';
import { GERMAN_TIME_ZONE } from '@connection-portal/rules/constants';
import { CLIENT_CAPABILITIES_META_KEY, inputRequired } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { type Caller, insufficientAccessError, levelAllows } from '../auth';
import { InsufficientAccess } from '../backend';
import { isUuid, parseReference, variantLink } from '../links';
import { InvalidReference, resolveConnectionId } from '../resolve';
import {
  connectionLineOf,
  type ConnectionRef,
  connectionRefOf,
  type ConnectionState,
  type ConnectionUrls,
  summaryTextOf,
  urlsNoteOf,
  urlsTextOf,
} from '../views';
import { registerTool, type ToolContext, toolError, toolResult } from './registry';

const ACTIONS = ['publish', 'delete_draft', 'deactivate', 'reactivate', 'delete'] as const;

/** The level an action needs (data-model §5.3): drafts for a draft's, manage for the others. */
export const ACTION_LEVELS: Record<ApprovalAction, AccessLevel> = {
  publish: 'drafts',
  delete_draft: 'drafts',
  deactivate: 'manage',
  reactivate: 'manage',
  delete: 'manage',
};

/** The action as the elicitation's message names it: "Approve publishing '…'". */
const ACTION_VERBS: Record<ApprovalAction, string> = {
  publish: 'publishing',
  delete_draft: 'deleting the draft',
  deactivate: 'deactivating',
  reactivate: 'reactivating',
  delete: 'deleting',
};

/** What happens next, per action, with the time the request expires. */
const WHAT_HAPPENS: Record<ApprovalAction, (time: string) => string> = {
  publish: (time) =>
    "Nothing is published yet. The team member opens the link, sees the draft's content and the " +
    `rule checks' findings, and approves or declines before ${time}.`,
  delete_draft: (time) =>
    'Nothing is deleted yet. The team member opens the link, sees which draft it is and when it ' +
    `was last saved, and approves or declines before ${time}. Once they approve, its content ` +
    'will be gone for good.',
  deactivate: (time) =>
    "Nothing changes yet. The team member sees which connection URLs will answer 'unavailable' " +
    'until the connection is reactivated and that requests in progress are cancelled, and ' +
    `approves or declines before ${time}.`,
  reactivate: (time) =>
    'Nothing changes yet. The team member sees which connection URLs will work again, and ' +
    `approves or declines before ${time}.`,
  delete: (time) =>
    'Nothing changes yet. The team member sees which connection URLs stop working for good, ' +
    "that requests in progress are cancelled and that deleting can't be undone, and approves or " +
    `declines before ${time}.`,
};

/** What a done request did, per action. */
const DONE_TEXTS: Record<ApprovalAction, string> = {
  publish: 'The team member approved: the draft is published.',
  delete_draft: 'The team member approved: the draft is deleted.',
  deactivate: 'The team member approved: the connection is deactivated.',
  reactivate: 'The team member approved: the connection is live again.',
  delete: 'The team member approved: the connection is deleted.',
};

/** Why a request was cancelled, per `cancel_reason` (data-model §5.2). */
const CANCELLED_TEXTS: Record<string, string> = {
  draft_changed:
    'The draft changed after you asked, so nothing happened. Ask again with request_approval.',
  draft_published: 'The draft has been published since you asked.',
  draft_deleted: 'The draft has been deleted since you asked.',
  connection_changed:
    'The connection was deactivated or reactivated since you asked, so nothing happened.',
  connection_deleted: 'The connection has been deleted since you asked.',
  revoked: 'Your access was revoked, so the request was cancelled.',
  access_changed: 'Your access level has changed, so the request was cancelled.',
  access_ended: 'Your access has ended, so the request was cancelled.',
};

export const APPROVAL_MESSAGES = {
  requestReference:
    'Name an approval request by its id or its link, as request_approval answered them.',
  elicitation: (action: ApprovalAction, name: string) =>
    `Approve ${ACTION_VERBS[action]} '${name}' in Konnekt.`,
  whatHappens: (action: ApprovalAction, expiresAt: string) =>
    WHAT_HAPPENS[action](timeOf(expiresAt)),
  handOver:
    'Hand the link to the team member, and check the outcome with check_approval once they say ' +
    'they decided.',
  notWaiting: (status: ApprovalStatus) =>
    `The request is ${status} now: check_approval tells the outcome.`,
  waiting: (time: string) => `The team member hasn't decided yet. The link works until ${time}.`,
  declined: 'The team member declined. Nothing has changed.',
  expired: (time: string) =>
    `The request expired at ${time}. Nothing has changed. Ask again with request_approval if ` +
    "it's still wanted.",
  replaced: 'A newer request for the same connection and action replaced this one.',
  cancelled: (reason: string | null) =>
    CANCELLED_TEXTS[reason ?? ''] ?? 'The request was cancelled. Nothing has changed.',
  failed: (errorId: string | null, time: string) =>
    "The team member approved, but it couldn't be carried out" +
    (errorId ? ` (Error ID: ${errorId})` : '') +
    `. Nothing has changed. The team member can try again on the approval page until ${time}.`,
  done: (action: ApprovalAction) => DONE_TEXTS[action],
} as const;

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: GERMAN_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** A time as the team member reads it: "15:40", on Germany's clock (as the backend's messages). */
export function timeOf(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

/** What the request's connection is while the API gives neither the draft nor the connection. */
function stateAfter(request: ApprovalRequest): ConnectionState {
  const done = request.status === 'done';
  switch (request.action) {
    case 'publish':
      return done ? 'live' : 'draft';
    case 'delete_draft':
      return 'draft';
    case 'deactivate':
      return done ? 'deactivated' : 'live';
    case 'reactivate':
      return done ? 'live' : 'deactivated';
    case 'delete':
      // A deleted connection's URLs answer nothing; until then it is live or deactivated
      return 'deactivated';
  }
}

/** The request's connection as agents see it: from the preview where it has it, else derived. */
export function approvalConnectionRefOf(
  request: ApprovalRequest,
  preview: Pick<ApprovalPreview, 'draft' | 'connection'> | null
): ConnectionRef {
  const fc = preview?.draft ?? preview?.connection ?? null;
  if (fc) return connectionRefOf(fc);
  const state = stateAfter(request);
  return connectionRefOf({
    id: request.form_connection_id,
    name: request.connection_name,
    status: state === 'draft' ? 'draft' : 'published',
    is_active: state === 'live',
    state,
  });
}

/** The API's connection URLs with each variant's link (contracts/mcp-tools.md `ConnectionUrls`). */
export function approvalUrlsOf(
  urls: ApiConnectionUrls | null,
  connectionId: string
): ConnectionUrls | null {
  if (!urls) return null;
  return {
    trigger_url: urls.trigger_url,
    variants: urls.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      link: variantLink(connectionId, variant.id),
      pull_url: variant.pull_url,
    })),
  };
}

/** The actions whose done request answers the connection URLs: those that made them work. */
const URL_ACTIONS: ReadonlySet<ApprovalAction> = new Set(['publish', 'reactivate']);

/**
 * The URLs `check_approval` answers: once a draft is published or a connection reactivated
 * (contracts/mcp-tools.md). The backend answers a published connection's URLs in every status,
 * also while a deactivate waits or after it is done, where they don't (or no longer) work
 */
function checkedUrlsOf(preview: ApprovalPreview): ConnectionUrls | null {
  const { request } = preview;
  if (request.outcome !== 'done' || !URL_ACTIONS.has(request.action)) return null;
  return approvalUrlsOf(preview.urls, request.form_connection_id);
}

/**
 * Whether the client declared URL-mode elicitation (`elicitation.url`, an object; research R2):
 * on 2026-07-28 in the request's envelope, in a 2025-era session in its `initialize`
 */
function declaresUrlElicitation({ request, server }: ToolContext): boolean {
  const envelope = request.mcpReq.envelope as Record<string, unknown> | undefined;
  const capabilities = (envelope?.[CLIENT_CAPABILITIES_META_KEY] ??
    server.server.getClientCapabilities()) as { elicitation?: { url?: unknown } } | undefined;
  const url = capabilities?.elicitation?.url;
  return typeof url === 'object' && url !== null;
}

/** An approval request's id from its id or its link. */
function requestIdOf(reference: string): string {
  const parsed = parseReference(reference);
  if (parsed.kind === 'uuid') return parsed.id;
  if (parsed.kind === 'approval_link') return parsed.requestId;
  throw new InvalidReference(APPROVAL_MESSAGES.requestReference);
}

/** `request_approval`'s answer for a request and its connection. */
function requestedResult(request: ApprovalRequest, connection: ConnectionRef) {
  const whatHappens = APPROVAL_MESSAGES.whatHappens(request.action, request.expires_at);
  return toolResult(
    {
      request: {
        id: request.id,
        action: request.action,
        connection,
        link: request.link,
        expires_at: request.expires_at,
        status: request.status,
      },
      what_happens: whatHappens,
    },
    summaryTextOf(
      `Approval link for ${ACTION_VERBS[request.action]} '${connection.name}': ${request.link}`,
      connectionLineOf(connection),
      whatHappens,
      request.status !== 'waiting' && APPROVAL_MESSAGES.notWaiting(request.status),
      APPROVAL_MESSAGES.handOver
    )
  );
}

/** The refusal of an action above the caller's level, naming the level it needs (FR-003). */
function insufficientFor(caller: Caller, level: AccessLevel) {
  const { code, message, needs_access_level } = insufficientAccessError(caller, level);
  return toolError(code, message, { needs_access_level });
}

/** What the outcome means, for the text block. */
function outcomeTextOf(request: ApprovalRequest): string {
  const time = timeOf(request.expires_at);
  switch (request.outcome) {
    case 'waiting':
      return APPROVAL_MESSAGES.waiting(time);
    case 'done':
      return APPROVAL_MESSAGES.done(request.action);
    case 'declined':
      return APPROVAL_MESSAGES.declined;
    case 'expired':
      return APPROVAL_MESSAGES.expired(time);
    case 'replaced':
      return APPROVAL_MESSAGES.replaced;
    case 'cancelled':
      return APPROVAL_MESSAGES.cancelled(request.cancel_reason);
    case 'failed':
      return APPROVAL_MESSAGES.failed(request.error_id, time);
  }
}

// request_approval

registerTool({
  name: 'request_approval',
  // Each action checks its own level below, so that a "Read only" caller asking to deactivate
  // reads the manage level's message rather than the drafts level's (FR-003)
  level: 'read',
  description:
    'Asks the team member to approve publishing a draft (publish), deleting a draft ' +
    '(delete_draft), or deactivating, reactivating or deleting a published connection. Nothing ' +
    'changes: it answers a link to an approval page, valid for about ten minutes, which the ' +
    'team member opens to approve or decline; your client may show it too. Hand the link over ' +
    'and call check_approval once they say they decided. A draft that publishing would refuse ' +
    "is refused at once with publishing's message.",
  input: z.object({
    connection: z
      .string()
      .min(1)
      .describe('The connection or draft: its id, or any Konnekt link that names it'),
    action: z
      .enum(ACTIONS)
      .describe(
        'publish or delete_draft for a draft (Read and edit drafts); deactivate, reactivate or ' +
          'delete for a published connection (Read, edit drafts and manage live connections)'
      ),
  }),
  handler: async (caller, input, context) => {
    const level = ACTION_LEVELS[input.action];
    if (!levelAllows(caller, level)) return insufficientFor(caller, level);
    const { backend } = context;

    // The re-entered call after the elicitation (research R2): the request made in the first
    // round, read back by its id, whatever the elicitation's outcome. The backend answers only
    // this caller's own requests, so the client-held state needs no signature
    const state = context.request.mcpReq.requestState<unknown>();
    if (state !== undefined) {
      if (typeof state !== 'string' || !isUuid(state)) {
        return toolError('validation', APPROVAL_MESSAGES.requestReference);
      }
      const preview = await backend.get<ApprovalPreview>(`/api/approval-requests/${state}`);
      return requestedResult(preview.request, approvalConnectionRefOf(preview.request, preview));
    }

    const connectionId = resolveConnectionId(input.connection);
    const fc = await backend.get<FormConnectionOrDraft>(`/api/form-connections/${connectionId}`);
    let request: ApprovalRequest;
    try {
      request = await backend.post<ApprovalRequest>('/api/approval-requests', {
        form_connection_id: fc.id,
        action: input.action,
      });
    } catch (error) {
      // The backend's level check is the safety net: its refusal reads as the tool's own
      if (error instanceof InsufficientAccess) return insufficientFor(caller, error.level);
      throw error;
    }
    if (declaresUrlElicitation(context)) {
      return inputRequired({
        inputRequests: {
          approval: inputRequired.elicitUrl({
            url: request.link,
            message: APPROVAL_MESSAGES.elicitation(request.action, request.connection_name),
          }),
        },
        requestState: request.id,
      });
    }
    return requestedResult(request, connectionRefOf(fc));
  },
});

// check_approval

registerTool({
  name: 'check_approval',
  level: 'drafts',
  description:
    'Reads the outcome of an approval request made with request_approval: waiting, done, ' +
    'declined, expired, replaced (a newer request), cancelled (with the reason) or failed (with ' +
    'the error ID). Once a draft is published or a connection reactivated, it answers the ' +
    'connection URLs. Call it when the team member says they decided, not in a loop.',
  input: z.object({
    request_id: z
      .string()
      .min(1)
      .describe("The approval request's id, or its link, as request_approval answered them"),
  }),
  handler: async (_caller, input, { backend }) => {
    const id = requestIdOf(input.request_id);
    const preview = await backend.get<ApprovalPreview>(`/api/approval-requests/${id}`);
    const { request } = preview;
    const connection = approvalConnectionRefOf(request, preview);
    // The day a scheduled connection becomes active, which its URLs' note names
    const startDate = preview.connection?.start_date ?? null;
    const urls = checkedUrlsOf(preview);
    return toolResult(
      {
        request: {
          id: request.id,
          action: request.action,
          connection,
          link: request.link,
          expires_at: request.expires_at,
          status: request.status,
          outcome: request.outcome,
          ...(request.cancel_reason ? { reason: request.cancel_reason } : {}),
          ...(request.error_id ? { error_id: request.error_id } : {}),
        },
        urls,
      },
      summaryTextOf(
        `Approval request for ${ACTION_VERBS[request.action]} '${connection.name}': ` +
          `${request.outcome}. ${request.link}`,
        connectionLineOf(connection, startDate),
        outcomeTextOf(request),
        urls && urlsTextOf(urls, urlsNoteOf({ state: connection.status, start_date: startDate }))
      )
    );
  },
});
