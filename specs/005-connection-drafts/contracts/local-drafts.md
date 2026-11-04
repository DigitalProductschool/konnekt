# Contract: local drafts (browser only)

**Requirements**: FR-014 to FR-021; SC-004, SC-005. **Decisions**: research R9 to R12. **Shapes**:
[data-model.md, section 6](../data-model.md#6-local-draft-browser-only-r9r11).

Local drafts have no endpoint. This contract fixes:
- the stored format;
- the pure modules' functions;
- the hooks that bind them to the browser;
- the rules every caller follows.

Only `hooks/useLocalDraftStore.ts` touches `window.localStorage`. Every other module takes a
`StorageLike`, so Vitest tests it in `node` with an in-memory fake (constitution III). Nothing in
these modules or hooks writes to the console, and nothing is sent anywhere (FR-020).

## Format

- **Key**: `connection-portal:local-draft:v1:<username>:<flowKey>`
  (`LOCAL_DRAFT_PREFIX = 'connection-portal:local-draft:v1:'`).
- **Flow keys**:
  - `new-<uuid>`: a create flow that was never saved, with `crypto.randomUUID()`;
  - `draft-<id>`: a stored draft.
  - `flowKeyOfDraft(id)` and `isFlowKey(value)` build and check them.
- **Value**: `LocalDraftRecord` as JSON, `format: 1`.
- **Accepted records.** A record whose JSON, `format`, types or `flowKey` don't match its key is
  invalid: lists skip it and remove it.
- **Expiry**: 30 days after `changedAt` (`LOCAL_DRAFT_MAX_AGE_MS`). An expired record is removed
  when the account's records are listed or read.

## Pure modules: `frontend/src/utils/localDrafts/`

Each module has its `*.test.ts` beside it.

```ts
// types.ts
interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;   // may throw (quota, blocked)
  removeItem(key: string): void;
}
interface LocalDraftRecord { format: 1; flowKey: string; draftId: string | null;
  draftVersion: number | null; changedAt: string; step: EditorStep; content: LocalDraftContent }
interface LocalDraftContent { name: string; servicebwForm: string; documents: RequestedDocument[];
  branches: BranchInput[]; numberingBase: NumberingBase; counters: NumberingBase }

// constants.ts
LOCAL_DRAFT_PREFIX, LOCAL_DRAFT_FORMAT = 1, LOCAL_DRAFT_MAX_AGE_MS = 30 days,
LOCAL_DRAFT_WRITE_INTERVAL_MS = 1000, LOCAL_DRAFT_PARAM = 'local'

// keys.ts
storageKeyOf(username: string, flowKey: string): string
newFlowKey(uuid: string): string                     // 'new-<uuid>'
flowKeyOfDraft(draftId: string): string              // 'draft-<id>'
isFlowKey(value: string): boolean

// format.ts: untrusted JSON in, a record or null out; never throws
serializeRecord(record: LocalDraftRecord): string
parseRecord(raw: string, flowKey: string): LocalDraftRecord | null

// content.ts
emptyContent(): LocalDraftContent
sameContent(a: LocalDraftContent, b: LocalDraftContent): boolean   // structural, key order ignored
displayNameOf(content: LocalDraftContent): string                  // trimmed name or 'Untitled connection'

// store.ts: every function catches storage errors; a failing storage reads as empty
createLocalDraftStore(storage: StorageLike | null, now: () => Date): LocalDraftStore
interface LocalDraftStore {
  available: boolean;                                   // false: FR-021, everything is a no-op
  list(username: string): LocalDraftRecord[];           // valid, unexpired, newest first; prunes the rest
  read(username: string, flowKey: string): LocalDraftRecord | null;
  write(username: string, record: LocalDraftRecord): boolean;   // false on failure or closed account
  remove(username: string, flowKey: string): void;
  removeAll(username: string): number;                  // the sign-out discard
  close(username: string): void;                        // refuse writes for the account until reopen
  reopen(username: string): void;                       // on sign-in
}
```

The editor's own pure functions live in `pages/FormConnectionEditor/utils.ts`, with their tests:

```ts
localContentOf(state: EditorState, rules: RulesState): LocalDraftContent
  // the rule open in the editor counts as kept, as rulesReducer's 'saveRule' would keep it (R9)
initialStatesFromLocal(record: LocalDraftRecord): { editor: EditorState; rules: RulesState }
initialStatesFromDraft(draft: FormConnectionDraft, step?: EditorStep): { editor: EditorState; rules: RulesState }
openingStepOf(step: EditorStep, rules: RulesState): EditorStep    // 'test' without a rule → 'rules'
draftPayload(content: LocalDraftContent, step: EditorStep): DraftCreate
conflictOf(error: unknown, origin: EditorOrigin, during: 'save' | 'publish'): DraftConflict | null
```

## Hooks: `frontend/src/hooks/`

### `useLocalDraftStore(): { store: LocalDraftStore; username: string | null }`

- **Storage.** It binds `window.localStorage`, reached inside `try/catch`, and falls back to
  `createLocalDraftStore(null, …)` when the storage can't be reached (FR-021).
- **The account.** `username` comes from `useCurrentUser()`.
- **Sign-in.** It calls `store.reopen(username)` when the account signs in.

### `useLocalDraft({ flowKey, draftId, draftVersion, baseline, content, step, enabled }): { flush(): void; forget(): void }`

Used by the editor page, for origins `new` and `draft` only. It is disabled for `published`
(FR-014).

- **Baseline.** `LocalDraftContent | null`: what is already safe elsewhere
  ([data-model.md, section 6](../data-model.md#6-local-draft-browser-only-r9r11)). It is `null` for
  a stored draft's record resumed through `?local=`, and never the record's own content.
- **Writing.** After the first change in the flow, while `enabled` and the content differs from
  the baseline (on every change with `null`), it writes the record: at once, then at most once per
  `LOCAL_DRAFT_WRITE_INTERVAL_MS`, trailing. Mounting writes nothing.
- **Removing.** With a baseline, it removes the record when a change brings the content back to
  it. With `null`, only `forget()` removes it. Mounting never removes a record.
- **Flushing.** Pending writes are flushed on `pagehide`, on `visibilitychange` to hidden, and on
  unmount. On unmount the record stays: leaving the flow keeps it (FR-018).
- **Another tab removed the record.** When a `storage` event shows that its key was removed while
  this flow holds unsaved work (it has written the record and hasn't called `forget()`), the flow
  writes its record again at once (edge case "the same connection open in two tabs").
- **`forget()`.** It cancels pending writes, removes the record, and stops writing until `flowKey`
  changes. The editor calls it after a successful save or publish, and on "Reload" and
  "Open the connection".
- **`flush()`.** It writes now. `UserMenu` reaches it through a module-level registry
  (`flushPendingLocalDrafts()` in `store.ts`), so the sign-out warning counts the work of the last
  second (R11).
- **The record.** It carries `draftId`, `draftVersion` and `step` as passed, and `changedAt` set to
  the time of the change.

### `useLocalDrafts(exceptFlowKey?: string): { drafts: LocalDraftRecord[]; discard(flowKey): void }`

Used by the overview and the first-connection screen (FR-016).
- **The list.** It holds the account's records, newest first, without the flow's own key on
  `/get-started`.
- **Changes from other tabs.** It refreshes on `storage` events, so a draft discarded or written
  in another tab appears or goes.
- **Discarding.** `discard` removes one record. The caller has asked for confirmation first.

## Rules for callers

1. **The URL names the flow.** A create flow without `?local=` in its URL gets a new flow key and
   writes it into the URL with `replace`. A flow opened with `?local=<flowKey>` whose record exists
   for the account opens from it (FR-017, R10). If there is no record, the flow starts empty under
   that key, or, for a `draft-<id>` key, goes to `/form-connections/<id>/edit`.
2. **Restoring on the edit route.** `/form-connections/:id/edit` on a draft reads the record of
   `draft-<id>`:
   - if it differs from the stored draft, the page asks "Restore" or "Discard" before the editor
     mounts (FR-016);
   - if it is equal, the page removes it silently.
3. **Leaving a published connection alone.** The edit flow of a published connection never reads,
   writes or offers a record (FR-014). A `draft-<id>` record whose connection is now published is
   removed when its flow learns that (`draft_published`, or the edit page loading a published
   connection).
4. **The content stays local.** Only "Save and exit" and publishing send a record's content to the
   server, as the bodies of `management-api.md` (FR-020).
5. **Signing out.** `UserMenu`'s "Log out":
   - flushes pending writes;
   - lists the account's records;
   - if there are any, asks with the warning dialog;
   - on confirming, calls `store.removeAll(username)` and `store.close(username)`, and then signs
     out.

   An expired session never removes records (FR-019).
