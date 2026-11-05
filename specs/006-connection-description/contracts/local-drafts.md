# Contract: Local Drafts

Changes to spec 005's [local-drafts.md](../../005-connection-drafts/contracts/local-drafts.md)
(R5). The keys, the store's API, the hooks and their rules stay the same.

## Format

```ts
LOCAL_DRAFT_FORMAT = 2;  // was 1

interface LocalDraftContent {
  name: string;
  description: string;   // was servicebwForm; as typed, untrimmed
  documents: RequestedDocument[];
  branches: BranchInput[];
  numberingBase: NumberingBase;
  counters: NumberingBase;
}
```

The key prefix stays `connection-portal:local-draft:v1:`.

## Accepted records

`parseRecord` accepts `format === 2` with `typeof content.description === 'string'`. Any other
record is invalid (spec 005's list, unchanged): a format-1 record, or one with `servicebwForm`
and no `description`.

## Old records (FR-009)

`store.list()` and `store.read()` remove an invalid record when they meet it, as they do today.
A format-1 record is therefore never offered, and it is removed the first time the account's
overview or a flow reads it. Nothing converts it.

## Tests (Vitest)

- `format.test.ts`: a format-2 record round-trips; a format-1 record with `servicebwForm` is
  refused.
- `store.test.ts`: `list()` skips and removes a format-1 entry under the account's key.
- `content.test.ts`: `emptyContent().description === ''`, and `sameContent` notices a changed
  description.
