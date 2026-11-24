// A local draft's content: the empty flow, comparison and the name shown for it
// (specs/005-connection-drafts/contracts/local-drafts.md "Pure modules"; data-model.md, section 6).
// Pure: it never imports the editor, whose `localContentOf` the test pins `emptyContent()` against
import { DEFAULT_LANGUAGE, type Language } from '@konnekt/rules/language';

import { LOCAL_DRAFT_COPY } from './constants';
import type { LocalDraftContent } from './types';

/**
 * The content of a fresh create flow, its baseline: no name, no description, no documents, and the
 * main variant "Standard" alone, AND, without items, numbered from 1. `mainId` is the flow's main
 * variant's id, which its content carries (spec 007, research R10).
 */
export function emptyContent(mainId: string | null = null): LocalDraftContent {
  return {
    name: '',
    description: '',
    documents: [],
    branches: [
      {
        id: mainId,
        name: 'Standard',
        description: null,
        origin: 'main',
        operator: 'and',
        operator_mark: null,
        items: [],
      },
    ],
    numberingBase: { rule: 1, group: 1 },
    counters: { rule: 1, group: 1 },
  };
}

/**
 * Whether two contents are equal: structural, key order ignored, a key holding `undefined` counting
 * as missing; array elements compare in order.
 */
export function sameContent(a: LocalDraftContent, b: LocalDraftContent): boolean {
  return sameStructure(a, b);
}

/**
 * The name shown for a content: its trimmed name, or "Untitled connection" ("Unbenannte
 * Anbindung") in the given language when it has none.
 */
export function displayNameOf(
  content: LocalDraftContent,
  language: Language = DEFAULT_LANGUAGE
): string {
  return content.name.trim() || LOCAL_DRAFT_COPY[language].untitled;
}

/** Whether two JSON-like values are structurally equal; `undefined` equals a missing key. */
function sameStructure(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => sameStructure(value, b[index]))
    );
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...definedKeys(a), ...definedKeys(b)]);
    return [...keys].every((key) => sameStructure(a[key], b[key]));
  }
  return false;
}

/** Whether a value is a plain object (not null, not an array). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An object's keys that hold a value other than `undefined`. */
function definedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).filter((key) => value[key] !== undefined);
}
