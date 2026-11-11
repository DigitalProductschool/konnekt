// An in-memory fake of the management API, for the MCP server's integration tests (research R19):
// the endpoints the server calls, with a `read`, a `drafts` and a `manage` caller, a small catalog
// and a store of connections (a draft with Standard, a based variant that changed one rule and an
// empty variant; a live connection; a deactivated one; one scheduled to become active, spec 010).
// The tool tests of later phases add to it
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type {
  AccessLevel,
  AccessLevelInfo,
  AgentMe,
} from '@connection-portal/api-types/agent-access';
import type {
  ApprovalAction,
  ApprovalPreview,
  ApprovalRequest,
} from '@connection-portal/api-types/approvals';
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  ActivityEntry,
  ActivityPage,
  Branch,
  BranchInput,
  ConnectionState,
  DraftCreate,
  DraftUpdate,
  FormConnection,
  FormConnectionDraft,
  FormConnectionOrDraft,
  FormConnectionSummary,
  RequestedDocument,
  RequestedDocumentView,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import { MDL, OPTION_SETS, PID, rule, target } from '@connection-portal/rules/testData';

/** The callers' bearer tokens, one per access level. */
export const BEARERS = {
  read: 'read-token',
  drafts: 'drafts-token',
  manage: 'manage-token',
} as const satisfies Record<AccessLevel, string>;

/** The fixtures' ids. */
export const IDS = {
  draft: '11111111-1111-4111-8111-111111111111',
  draftStandard: '11111111-1111-4111-8111-1111111111a1',
  draftBased: '11111111-1111-4111-8111-1111111111a2',
  draftEmpty: '11111111-1111-4111-8111-1111111111a3',
  live: '22222222-2222-4222-8222-222222222222',
  liveStandard: '22222222-2222-4222-8222-2222222222a1',
  deactivated: '33333333-3333-4333-8333-333333333333',
  deactivatedStandard: '33333333-3333-4333-8333-3333333333a1',
  scheduled: '55555555-5555-4555-8555-555555555555',
  scheduledStandard: '55555555-5555-4555-8555-5555555555a1',
} as const;

/** The day the scheduled fixture becomes active, in Germany (spec 010, research R1). */
export const SCHEDULED_START = '2026-12-01';

export const LEVELS: AccessLevelInfo[] = [
  { level: 'read', name: 'Read only', allows: 'Reading connections' },
  { level: 'drafts', name: 'Read and edit drafts', allows: 'Also creating and changing drafts' },
  {
    level: 'manage',
    name: 'Read, edit drafts and manage live connections',
    allows: 'Also deactivating, reactivating and deleting published connections',
  },
];

/** The limit on new drafts per caller, as the backend's default (R17). */
export const DRAFTS_PER_HOUR = 20;
export const RATE_LIMIT_MESSAGE = 'This agent can create drafts again at 15:40.';
export const DRAFT_CHANGED_MESSAGE = 'Another team member saved this draft after you opened it.';
export const DRAFT_PUBLISHED_MESSAGE = 'This draft has been published since you opened it.';

/**
 * The countries value set, long enough for `search_values` to answer two pages, with four names
 * that contain "ger"
 */
export const COUNTRIES: [string, string][] = [
  ['DE', 'Germany'],
  ['AT', 'Austria'],
  ['FR', 'France'],
  ['DZ', 'Algeria'],
  ['NE', 'Niger'],
  ['NG', 'Nigeria'],
  ['BE', 'Belgium'],
  ['NL', 'Netherlands'],
  ['LU', 'Luxembourg'],
  ['CH', 'Switzerland'],
  ['IT', 'Italy'],
  ['ES', 'Spain'],
  ['PT', 'Portugal'],
  ['PL', 'Poland'],
  ['CZ', 'Czechia'],
  ['DK', 'Denmark'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['FI', 'Finland'],
  ['IE', 'Ireland'],
  ['GB', 'United Kingdom'],
  ['GR', 'Greece'],
  ['HU', 'Hungary'],
  ['RO', 'Romania'],
  ['BG', 'Bulgaria'],
  ['HR', 'Croatia'],
  ['SI', 'Slovenia'],
  ['SK', 'Slovakia'],
  ['EE', 'Estonia'],
  ['LV', 'Latvia'],
  ['LT', 'Lithuania'],
  ['MT', 'Malta'],
  ['CY', 'Cyprus'],
];

const LEVEL_ORDER: AccessLevel[] = ['read', 'drafts', 'manage'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERVICEBW_URL = 'https://portal.example/api/connect';
const APPROVAL_MINUTES = 10;
// The activity's page size (activity.py)
const ACTIVITY_PAGE_SIZE = 50;
// The server's limits on a connection's name and description (form_connections.py)
const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 500;

/** An approval request and the bearer that made it (a bearer reads only its own). */
export interface StoredApproval {
  request: ApprovalRequest;
  token: string;
}

/** What the fake serves; tests read and change it directly. */
export interface FakeStore {
  me: Map<string, AgentMe>;
  documentTypes: DocumentType[];
  optionSets: OptionSet[];
  connections: Map<string, FormConnectionOrDraft>;
  approvals: Map<string, StoredApproval>;
  /** Each connection's activity, newest first (spec 010) */
  activity: Map<string, ActivityEntry[]>;
  /** New drafts per bearer, for the limit */
  draftsCreated: Map<string, number>;
}

/** A request the fake received: its method and path with the query. */
export interface FakeCall {
  method: string;
  path: string;
  token: string | null;
}

/** The running fake. */
export interface FakeBackend {
  url: string;
  store: FakeStore;
  calls: FakeCall[];
  /** Runs once, before the next draft save is checked: another save meanwhile (FR-015). */
  beforeNextDraftSave(hook: (draft: FormConnectionDraft) => void): void;
  /** The fixtures again, no calls, no hooks. */
  reset(): void;
  close(): Promise<void>;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>
  ) {
    super(String(body.message));
  }
}

const notFound = (message = 'Form connection not found') =>
  new HttpError(404, { error: 'Not found', message });
const validation = (message: string) => new HttpError(400, { error: 'Validation error', message });
const notAllowed = (message: string) => new HttpError(409, { error: 'not_allowed', message });

function insufficient(level: AccessLevel, action: string): HttpError {
  const name = LEVELS.find((info) => info.level === level)?.name ?? level;
  return new HttpError(403, {
    error: 'insufficient_access',
    message: `${action} needs the access level '${name}'.`,
    needs_access_level: level,
  });
}

function allows(me: AgentMe, level: AccessLevel): boolean {
  return LEVEL_ORDER.indexOf(me.access_level) >= LEVEL_ORDER.indexOf(level);
}

function meOf(level: AccessLevel): AgentMe {
  return {
    username: 'anna',
    client_name: 'Claude Code',
    kind: 'oauth',
    access_level: level,
    levels: LEVELS,
  };
}

function documentViewOf(
  catalog: DocumentType[],
  requested: RequestedDocument
): RequestedDocumentView {
  const type = catalog.find((each) => each.key === requested.document_type);
  return {
    document_type: requested.document_type,
    // A type or field the catalog dropped keeps its key as its label (spec 005)
    label: type?.label ?? requested.document_type,
    fields: requested.fields.map(
      (key) =>
        type?.fields.find((field) => field.key === key) ?? {
          key,
          label: key,
          kind: 'text',
          option_set: null,
          date_of_birth: false,
          parts: null,
          multiple_values: false,
        }
    ),
  };
}

function highestNumber(items: RuleTreeItem[], prefix: 'rule' | 'group'): number {
  let highest = 0;
  for (const item of items) {
    if (item.id.startsWith(`${prefix}-`))
      highest = Math.max(highest, Number(item.id.slice(prefix.length + 1)));
    if (item.type === 'group') highest = Math.max(highest, highestNumber(item.items, prefix));
  }
  return highest;
}

/** An entry of the fixtures' activity; `actor` null for one without a person. */
function activityEntry(
  kind: ActivityEntry['kind'],
  at: string,
  actor: ActivityEntry['actor'] = null
): ActivityEntry {
  return { id: randomUUID(), kind, at, variant: null, start_date: null, actor };
}

/**
 * The closed card's line as the backend's `last_activity()` picks it from entries newest first:
 * while deactivated the newest `deactivated` entry, else the newest with a person, else the newest
 */
function lastActivityOf(entries: ActivityEntry[], deactivated: boolean): ActivityEntry | null {
  return (
    (deactivated ? entries.find((entry) => entry.kind === 'deactivated') : undefined) ??
    entries.find((entry) => entry.actor !== null) ??
    entries[0] ??
    null
  );
}

/**
 * The fixtures: a draft with three variants, a live connection, a deactivated one and a scheduled
 * one
 */
export function fixtureStore(): FakeStore {
  const age = rule(
    1,
    target('pid', 'birthdate'),
    { operator: 'at_least_years_ago', years: 18 },
    'You must be at least 18 years old.'
  );
  const city = rule(
    2,
    target('pid', 'address_locality'),
    { operator: 'equal_to', value: 'Stuttgart' },
    'You must live in Stuttgart.'
  );
  const otherCity: RuleTreeItem = {
    ...city,
    mark: 'changed',
    condition: { operator: 'equal_to', value: 'Esslingen' },
    message: 'You must live in Esslingen.',
  };
  const branch = (
    id: string,
    name: string,
    origin: BranchInput['origin'],
    items: RuleTreeItem[]
  ): BranchInput => ({
    id,
    name,
    description: null,
    origin,
    operator: 'and',
    operator_mark: null,
    items,
  });
  const documents = (catalog: DocumentType[]) => [
    documentViewOf(catalog, { document_type: 'pid', fields: ['birthdate', 'address_locality'] }),
  ];
  const catalog: DocumentType[] = [PID, MDL];
  // Newest first: the draft an agent created, the others as the migration backfilled them, the
  // deactivated one deactivated by its team member since
  const activity = new Map<string, ActivityEntry[]>([
    [
      IDS.draft,
      [
        activityEntry('created', '2026-11-01T09:00:00Z', {
          name: 'anna',
          agent: 'Claude Code',
          approved: false,
        }),
      ],
    ],
    [
      IDS.live,
      [
        activityEntry('published', '2026-10-01T09:00:00Z'),
        activityEntry('created', '2026-10-01T09:00:00Z'),
      ],
    ],
    [
      IDS.deactivated,
      [
        activityEntry('deactivated', '2026-11-01T09:00:00Z', {
          name: 'anna',
          agent: null,
          approved: false,
        }),
        activityEntry('published', '2026-10-01T09:00:00Z'),
        activityEntry('created', '2026-10-01T09:00:00Z'),
      ],
    ],
  ]);

  const draft: FormConnectionDraft = {
    status: 'draft',
    state: 'draft',
    id: IDS.draft,
    name: 'Resident parking permit',
    description: 'The parking permit for residents of the city centre.',
    documents: documents(catalog),
    branches: [
      branch(IDS.draftStandard, 'Standard', 'main', [age, city]),
      branch(IDS.draftBased, 'Ambulance', 'based', [age, otherCity]),
      branch(IDS.draftEmpty, 'Pilot', 'empty', []),
    ],
    next_rule_number: 3,
    next_group_number: 1,
    step: 'rules',
    version: 1,
    created_at: '2026-11-01T09:00:00Z',
    updated_at: '2026-11-03T09:00:00Z',
    last_activity: lastActivityOf(activity.get(IDS.draft) ?? [], false),
  };

  const published = (
    id: string,
    standardId: string,
    name: string,
    active: boolean,
    updated: string
  ): FormConnection => {
    const pullUrl = `${SERVICEBW_URL}/${id}/branches/${standardId}/{reference}`;
    const standard: Branch = {
      ...branch(standardId, 'Standard', 'main', [age]),
      id: standardId,
      is_main: true,
      pull_url: pullUrl,
    };
    return {
      status: 'published',
      id,
      name,
      description: '',
      is_active: active,
      documents: documents(catalog),
      trigger_url: `${SERVICEBW_URL}/${id}`,
      pull_url: pullUrl,
      branches: [standard],
      rule_set_version: 1,
      next_rule_number: 2,
      next_group_number: 1,
      created_at: '2026-10-01T09:00:00Z',
      updated_at: updated,
      state: active ? 'live' : 'deactivated',
      published_at: '2026-10-01T09:00:00Z',
      activated_at: '2026-10-01T09:00:00Z',
      deactivated_at: active ? null : updated,
      start_date: null,
      last_activity: lastActivityOf(activity.get(id) ?? [], !active),
    };
  };

  return {
    me: new Map(LEVEL_ORDER.map((level) => [BEARERS[level], meOf(level)])),
    documentTypes: catalog,
    optionSets: OPTION_SETS.map((set) =>
      set.key === 'countries'
        ? {
            key: set.key,
            options: COUNTRIES.map(([value, label]) => ({ value, label, description: null })),
          }
        : set
    ),
    connections: new Map<string, FormConnectionOrDraft>([
      [IDS.draft, draft],
      [
        IDS.live,
        published(IDS.live, IDS.liveStandard, 'Fishing licence', true, '2026-11-02T09:00:00Z'),
      ],
      [
        IDS.deactivated,
        published(
          IDS.deactivated,
          IDS.deactivatedStandard,
          'Dog licence',
          false,
          '2026-11-01T09:00:00Z'
        ),
      ],
      [
        IDS.scheduled,
        {
          // Scheduled when it was published: inactive, never active yet, with its start day
          ...published(
            IDS.scheduled,
            IDS.scheduledStandard,
            'Boat licence',
            false,
            '2026-10-31T09:00:00Z'
          ),
          state: 'scheduled',
          activated_at: null,
          deactivated_at: null,
          start_date: SCHEDULED_START,
        },
      ],
    ]),
    approvals: new Map(),
    activity,
    draftsCreated: new Map(),
  };
}

/**
 * The draft as publishing it stores it (spec 005's `publish_draft`): the same id, the same
 * variants with the same ids, rules and names, live, with its connection URLs. The fake has no
 * publish endpoint; tests put this into the store
 */
export function publishedOf(draft: FormConnectionDraft): FormConnection {
  const pullUrlOf = (branchId: string) =>
    `${SERVICEBW_URL}/${draft.id}/branches/${branchId}/{reference}`;
  const branches: Branch[] = draft.branches.map((branch) => {
    const id = branch.id ?? randomUUID();
    return { ...branch, id, is_main: branch.origin === 'main', pull_url: pullUrlOf(id) };
  });
  const now = new Date().toISOString();
  return {
    status: 'published',
    id: draft.id,
    name: draft.name,
    description: draft.description,
    is_active: true,
    documents: draft.documents,
    trigger_url: `${SERVICEBW_URL}/${draft.id}`,
    pull_url: branches[0].pull_url,
    branches,
    rule_set_version: 1,
    next_rule_number: draft.next_rule_number,
    next_group_number: draft.next_group_number,
    created_at: draft.created_at,
    updated_at: now,
    state: 'live',
    published_at: now,
    activated_at: now,
    deactivated_at: null,
    start_date: null,
    last_activity: draft.last_activity,
  };
}

/**
 * The state as the backend's `state_of()` derives it from the stored columns, so that a test
 * that changes `is_active` or `start_date` in the store reads the matching state
 */
function stateOf(fc: FormConnectionOrDraft): ConnectionState {
  if (fc.status === 'draft') return 'draft';
  if (fc.is_active) return 'live';
  return fc.start_date ? 'scheduled' : 'deactivated';
}

/** A stored connection as the backend answers it: the derived state, the dates of that state. */
function answeredOf<T extends FormConnectionOrDraft>(fc: T): T;
function answeredOf(fc: FormConnectionOrDraft): FormConnectionOrDraft {
  if (fc.status === 'draft') return { ...fc, state: 'draft' };
  const state = stateOf(fc) as FormConnection['state'];
  return {
    ...fc,
    state,
    deactivated_at: state === 'deactivated' ? fc.deactivated_at : null,
    start_date: state === 'scheduled' ? fc.start_date : null,
  };
}

function summaryOf(stored: FormConnectionOrDraft): FormConnectionSummary {
  const fc = answeredOf(stored);
  return {
    id: fc.id,
    name: fc.name,
    description: fc.description,
    is_active: fc.status === 'draft' ? true : fc.is_active,
    status: fc.status,
    updated_at: fc.updated_at,
    state: fc.state,
    published_at: fc.status === 'draft' ? null : fc.published_at,
    deactivated_at: fc.status === 'draft' ? null : fc.deactivated_at,
    start_date: fc.status === 'draft' ? null : fc.start_date,
    step: fc.status === 'draft' ? fc.step : null,
  };
}

async function bodyOf(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  const text = Buffer.concat(chunks).toString('utf8');
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(422, { error: 'Validation error', message: 'Invalid request payload' });
  }
}

function bearerOf(request: IncomingMessage): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? '');
  return match ? match[1] : null;
}

/** Starts the fake on an ephemeral port of 127.0.0.1. */
export async function startFakeBackend(options: { portalUrl?: string } = {}): Promise<FakeBackend> {
  const portalUrl = options.portalUrl ?? 'http://localhost:5173';
  const fake = { store: fixtureStore(), calls: [] as FakeCall[] };
  let draftSaveHook: ((draft: FormConnectionDraft) => void) | null = null;

  function connectionOf(id: string): FormConnectionOrDraft {
    const fc = fake.store.connections.get(id);
    if (!fc) throw notFound();
    return fc;
  }

  function branchesOf(branches: BranchInput[]): BranchInput[] {
    const seen = new Set<string>();
    return branches.map((branch) => {
      if (branch.id !== null && (!UUID.test(branch.id) || seen.has(branch.id))) {
        throw validation('Unknown variant.');
      }
      const id = branch.id ?? randomUUID();
      seen.add(id);
      return { ...branch, id };
    });
  }

  /**
   * The server's checks of a draft's name, description and documents (`clean_name`,
   * `clean_description`, `clean_documents(complete=False)`), with its messages: the documents
   * in the order sent, as the backend stores (`document_order`) and answers them (spec 010,
   * FR-045, FR-050), each with its fields in catalog order
   */
  function cleanDraft(body: DraftCreate): {
    name: string;
    description: string;
    documents: RequestedDocument[];
  } {
    const name = (body.name ?? '').trim();
    if (!name) throw validation('Enter a name for the connection.');
    if (name.length > NAME_MAX_LENGTH) {
      throw validation(`The name can have at most ${NAME_MAX_LENGTH} characters.`);
    }
    const description = (body.description ?? '').trim();
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      throw validation(`The description can have at most ${DESCRIPTION_MAX_LENGTH} characters.`);
    }
    const catalog = fake.store.documentTypes;
    for (const document of body.documents) {
      const type = catalog.find((each) => each.key === document.document_type);
      if (!type) throw validation(`Unknown document type '${document.document_type}'.`);
      const unknown = document.fields.find((key) => !type.fields.some((each) => each.key === key));
      if (unknown !== undefined) {
        throw validation(`Unknown field '${unknown}' for '${type.label}'.`);
      }
    }
    const seen = new Set<string>();
    const documents = body.documents.flatMap((requested) => {
      if (seen.has(requested.document_type)) return [];
      seen.add(requested.document_type);
      const type = catalog.find((each) => each.key === requested.document_type);
      const fields = (type?.fields ?? [])
        .filter((field) => requested.fields.includes(field.key))
        .map((field) => field.key);
      return [{ document_type: requested.document_type, fields }];
    });
    return { name, description, documents };
  }

  function draftOf(
    id: string,
    body: DraftCreate,
    version: number,
    created: string,
    previous?: FormConnectionDraft
  ): FormConnectionDraft {
    const { name, description, documents } = cleanDraft(body);
    const branches = branchesOf(body.rules.branches);
    const items = branches.flatMap((branch) => branch.items);
    return {
      status: 'draft',
      state: 'draft',
      id,
      name,
      description,
      documents: documents.map((document) => documentViewOf(fake.store.documentTypes, document)),
      branches,
      next_rule_number: Math.max(
        previous?.next_rule_number ?? 1,
        body.rules.numbering_base.rule,
        highestNumber(items, 'rule') + 1
      ),
      next_group_number: Math.max(
        previous?.next_group_number ?? 1,
        body.rules.numbering_base.group,
        highestNumber(items, 'group') + 1
      ),
      step: body.step,
      version,
      created_at: created,
      updated_at: new Date().toISOString(),
      last_activity: previous?.last_activity ?? null,
    };
  }

  function search(query: URLSearchParams): {
    items: FormConnectionSummary[];
    next_cursor: string | null;
  } {
    const q = (query.get('q') ?? '').trim().toLowerCase();
    const status = query.get('status');
    if (status !== null && !['draft', 'scheduled', 'live', 'deactivated'].includes(status)) {
      throw validation('Unknown status.');
    }
    const offset = Number(query.get('cursor') ?? '0');
    if (!Number.isInteger(offset) || offset < 0) throw validation('Invalid cursor.');
    const limit = Math.min(Math.max(Number(query.get('limit') ?? '25') || 25, 1), 25);
    const matches = [...fake.store.connections.values()]
      .filter((fc) => status === null || stateOf(fc) === status)
      .filter(
        (fc) =>
          q === '' || fc.name.toLowerCase().includes(q) || fc.description.toLowerCase().includes(q)
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));
    const page = matches.slice(offset, offset + limit);
    return {
      items: page.map(summaryOf),
      next_cursor: offset + limit < matches.length ? String(offset + limit) : null,
    };
  }

  /** A page of a connection's activity, newest first; the cursor is an offset here. */
  function activityPage(id: string, query: URLSearchParams): ActivityPage {
    connectionOf(id);
    const offset = Number(query.get('cursor') ?? '0');
    if (!Number.isInteger(offset) || offset < 0) throw validation('Unknown cursor.');
    const entries = fake.store.activity.get(id) ?? [];
    return {
      items: entries.slice(offset, offset + ACTIVITY_PAGE_SIZE),
      next_cursor:
        offset + ACTIVITY_PAGE_SIZE < entries.length ? String(offset + ACTIVITY_PAGE_SIZE) : null,
    };
  }

  function createDraft(token: string, me: AgentMe, body: DraftCreate): FormConnectionDraft {
    if (!allows(me, 'drafts')) throw insufficient('drafts', 'Changing drafts');
    const created = fake.store.draftsCreated.get(token) ?? 0;
    if (created >= DRAFTS_PER_HOUR) {
      throw new HttpError(429, { error: 'rate_limited', message: RATE_LIMIT_MESSAGE });
    }
    const now = new Date().toISOString();
    const draft = draftOf(randomUUID(), body, 1, now);
    fake.store.connections.set(draft.id, draft);
    fake.store.draftsCreated.set(token, created + 1);
    return draft;
  }

  function saveDraft(me: AgentMe, id: string, body: DraftUpdate): FormConnectionDraft {
    if (!allows(me, 'drafts')) throw insufficient('drafts', 'Changing drafts');
    const stored = connectionOf(id);
    if (stored.status === 'draft' && draftSaveHook) {
      const hook = draftSaveHook;
      draftSaveHook = null;
      hook(stored);
    }
    const current = connectionOf(id);
    if (current.status !== 'draft') {
      throw new HttpError(409, { error: 'draft_published', message: DRAFT_PUBLISHED_MESSAGE });
    }
    if (body.version !== current.version && !body.replace) {
      throw new HttpError(409, { error: 'draft_changed', message: DRAFT_CHANGED_MESSAGE });
    }
    const saved = draftOf(id, body, current.version + 1, current.created_at, current);
    fake.store.connections.set(id, saved);
    return saved;
  }

  function requestApproval(
    token: string,
    me: AgentMe,
    body: { form_connection_id?: string; action?: ApprovalAction }
  ): ApprovalRequest {
    const action = body.action;
    const draftAction = action === 'publish' || action === 'delete_draft';
    if (
      !action ||
      !['publish', 'delete_draft', 'deactivate', 'reactivate', 'delete'].includes(action)
    ) {
      throw validation('Unknown action.');
    }
    // As the backend: each action's own level, so that a read caller asking to deactivate reads
    // the manage level's message
    if (draftAction && !allows(me, 'drafts')) throw insufficient('drafts', 'Asking for approval');
    if (!draftAction && !allows(me, 'manage')) {
      throw insufficient('manage', 'Deactivating, reactivating and deleting published connections');
    }
    const fc = connectionOf(body.form_connection_id ?? '');
    if (draftAction && fc.status !== 'draft')
      throw notAllowed('This connection is already published.');
    if (!draftAction && fc.status === 'draft') {
      throw notAllowed('This connection is a draft: it has nothing live yet.');
    }
    if (action === 'publish' && fc.documents.length === 0)
      throw validation('Add at least one document.');
    if (action === 'deactivate' && fc.status === 'published' && !fc.is_active) {
      throw notAllowed('This connection is already deactivated.');
    }
    if (action === 'reactivate' && fc.status === 'published' && fc.is_active) {
      throw notAllowed('This connection is already live.');
    }
    for (const stored of fake.store.approvals.values()) {
      const waiting = stored.request;
      if (
        waiting.form_connection_id === fc.id &&
        waiting.action === action &&
        waiting.status === 'waiting'
      ) {
        stored.request = { ...waiting, status: 'replaced', outcome: 'replaced' };
      }
    }
    const id = randomUUID();
    const now = new Date();
    const request: ApprovalRequest = {
      id,
      action,
      form_connection_id: fc.id,
      connection_name: fc.name,
      requested_by: me.client_name ?? 'Personal access token',
      status: 'waiting',
      outcome: 'waiting',
      cancel_reason: null,
      link: `${portalUrl}/approvals/${id}`,
      expires_at: new Date(now.getTime() + APPROVAL_MINUTES * 60_000).toISOString(),
      created_at: now.toISOString(),
      decided_at: null,
      failed_at: null,
      error_id: null,
      mine: true,
    };
    fake.store.approvals.set(id, { request, token });
    return request;
  }

  function approvalPreview(token: string, id: string): ApprovalPreview {
    const stored = fake.store.approvals.get(id);
    if (!stored || stored.token !== token) throw notFound('Approval request not found');
    const fc = fake.store.connections.get(stored.request.form_connection_id) ?? null;
    return {
      request: stored.request,
      draft: fc?.status === 'draft' ? answeredOf(fc) : null,
      connection: fc?.status === 'published' ? answeredOf(fc) : null,
      // As the backend: a published connection's URLs in every status (a done publish's too),
      // so that check_approval's own filtering shows
      urls:
        fc?.status === 'published'
          ? {
              trigger_url: fc.trigger_url,
              variants: fc.branches.map((branch) => ({
                id: branch.id,
                name: branch.name,
                pull_url: branch.pull_url,
              })),
            }
          : null,
    };
  }

  async function route(request: IncomingMessage): Promise<{ status: number; body: unknown }> {
    const url = new URL(request.url ?? '/', 'http://fake');
    const token = bearerOf(request);
    fake.calls.push({
      method: request.method ?? 'GET',
      path: `${url.pathname}${url.search}`,
      token,
    });
    const me = token ? fake.store.me.get(token) : undefined;
    if (!me || token === null) {
      throw new HttpError(401, { error: 'Unauthorized', message: 'Sign in to continue' });
    }
    const method = request.method ?? 'GET';
    const parts = url.pathname.split('/').filter(Boolean);
    const ok = (data: unknown, status = 200) => ({ status, body: { data } });

    if (method === 'GET' && url.pathname === '/api/agent/me') return ok(me);
    if (method === 'GET' && url.pathname === '/api/document-types')
      return ok(fake.store.documentTypes);
    if (method === 'GET' && url.pathname === '/api/option-sets') return ok(fake.store.optionSets);
    if (method === 'GET' && url.pathname === '/api/form-connections/search') {
      return ok(search(url.searchParams));
    }
    if (method === 'POST' && url.pathname === '/api/form-connections/drafts') {
      return ok(createDraft(token, me, (await bodyOf(request)) as DraftCreate), 201);
    }
    if (
      parts[0] === 'api' &&
      parts[1] === 'form-connections' &&
      parts.length === 3 &&
      method === 'GET'
    ) {
      return ok(answeredOf(connectionOf(parts[2])));
    }
    if (
      parts[0] === 'api' &&
      parts[1] === 'form-connections' &&
      parts.length === 4 &&
      parts[3] === 'activity' &&
      method === 'GET'
    ) {
      return ok(activityPage(parts[2], url.searchParams));
    }
    if (
      parts[0] === 'api' &&
      parts[1] === 'form-connections' &&
      parts.length === 4 &&
      parts[3] === 'draft' &&
      method === 'PUT'
    ) {
      return ok(saveDraft(me, parts[2], (await bodyOf(request)) as DraftUpdate));
    }
    if (method === 'POST' && url.pathname === '/api/approval-requests') {
      const body = (await bodyOf(request)) as {
        form_connection_id?: string;
        action?: ApprovalAction;
      };
      return ok(requestApproval(token, me, body ?? {}), 201);
    }
    if (
      parts[0] === 'api' &&
      parts[1] === 'approval-requests' &&
      parts.length === 3 &&
      method === 'GET'
    ) {
      return ok(approvalPreview(token, parts[2]));
    }
    throw notFound('Not found');
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    let status: number;
    let body: unknown;
    try {
      ({ status, body } = await route(request));
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      ({ status, body } = error);
    }
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  }

  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({ error: 'Internal server error', message: 'x', error_id: 'fake-error' })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    get store() {
      return fake.store;
    },
    calls: fake.calls,
    beforeNextDraftSave(hook) {
      draftSaveHook = hook;
    },
    reset() {
      fake.store = fixtureStore();
      fake.calls.length = 0;
      draftSaveHook = null;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
