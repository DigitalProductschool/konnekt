// The stored form of a local draft (specs/005-connection-drafts/contracts/local-drafts.md "Format",
// "Accepted records"). A record comes from storage that other tabs, other versions of the app or
// other code may have written, so it is untrusted: parseRecord checks every field this app relies
// on and never throws. The server checks the rest when the draft is saved
import type {
  BranchInput,
  EditorStep,
  NumberingBase,
  RequestedDocument,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';

import { LOCAL_DRAFT_FORMAT } from './constants';
import { draftIdOfFlowKey, isFlowKey } from './keys';
import type { LocalDraftContent, LocalDraftRecord } from './types';

const STEPS: readonly string[] = [
  'connection',
  'documents',
  'rules',
  'test',
] satisfies readonly EditorStep[];
const ORIGINS: readonly string[] = [
  'main',
  'based',
  'empty',
] satisfies readonly BranchInput['origin'][];
const COMBINATORS: readonly string[] = ['and', 'or'];

type Json = Record<string, unknown>;

/** The record as stored */
export function serializeRecord(record: LocalDraftRecord): string {
  return JSON.stringify(record);
}

/**
 * The record stored under `flowKey`, or null when it can't be read: bad JSON, another format, a
 * flow key that doesn't match the key's, a field of the wrong type, or a `__proto__` key anywhere
 */
export function parseRecord(raw: string, flowKey: string): LocalDraftRecord | null {
  try {
    return recordOf(raw, flowKey);
  } catch {
    // A pathological input (such as nesting too deep to walk) is just another invalid record
    return null;
  }
}

function recordOf(raw: string, flowKey: string): LocalDraftRecord | null {
  if (typeof raw !== 'string' || !isFlowKey(flowKey)) {
    return null;
  }
  let protoKey = false;
  const value: unknown = JSON.parse(raw, (key: string, item: unknown) => {
    if (key === '__proto__') {
      protoKey = true;
    }
    return item;
  });
  if (protoKey || !isObject(value)) {
    return null;
  }
  const { format, draftId, draftVersion, changedAt, step } = value;
  if (format !== LOCAL_DRAFT_FORMAT || value.flowKey !== flowKey) {
    return null;
  }
  if (draftId !== draftIdOfFlowKey(flowKey)) {
    return null;
  }
  if (draftVersion !== null && !isInteger(draftVersion)) {
    return null;
  }
  if (typeof changedAt !== 'string' || Number.isNaN(Date.parse(changedAt))) {
    return null;
  }
  if (typeof step !== 'string' || !STEPS.includes(step)) {
    return null;
  }
  const content = contentOf(value.content);
  if (content === null) {
    return null;
  }
  return {
    format: LOCAL_DRAFT_FORMAT,
    flowKey,
    draftId: draftId as string | null,
    draftVersion: draftVersion as number | null,
    changedAt,
    step: step as EditorStep,
    content,
  };
}

function contentOf(value: unknown): LocalDraftContent | null {
  if (!isObject(value)) {
    return null;
  }
  const { name, description, documents, branches, numberingBase, counters } = value;
  if (typeof name !== 'string' || typeof description !== 'string') {
    return null;
  }
  if (!Array.isArray(documents) || !documents.every(isDocument)) {
    return null;
  }
  if (!Array.isArray(branches) || !branches.every(isBranch)) {
    return null;
  }
  if (!isNumbering(numberingBase) || !isNumbering(counters)) {
    return null;
  }
  return { name, description, documents, branches, numberingBase, counters };
}

function isDocument(value: unknown): value is RequestedDocument {
  return (
    isObject(value) &&
    typeof value.document_type === 'string' &&
    Array.isArray(value.fields) &&
    value.fields.every((field) => typeof field === 'string')
  );
}

function isBranch(value: unknown): value is BranchInput {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.origin === 'string' &&
    ORIGINS.includes(value.origin) &&
    isCombinator(value.operator) &&
    isItems(value.items)
  );
}

function isItems(value: unknown): value is RuleTreeItem[] {
  return Array.isArray(value) && value.every(isTreeItem);
}

function isTreeItem(value: unknown): value is RuleTreeItem {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false;
  }
  if (value.type === 'rule') {
    return isObjectOrNull(value.target) && isObjectOrNull(value.condition);
  }
  if (value.type === 'group') {
    return isCombinator(value.operator) && isItems(value.items);
  }
  return false;
}

function isNumbering(value: unknown): value is NumberingBase {
  return isObject(value) && isInteger(value.rule) && isInteger(value.group);
}

function isCombinator(value: unknown): boolean {
  return typeof value === 'string' && COMBINATORS.includes(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isObjectOrNull(value: unknown): boolean {
  return value === null || isObject(value);
}
