// The local drafts' fixed values (specs/005-connection-drafts/contracts/local-drafts.md "Format";
// research R9, R10) and the one text this folder words
import { defineTexts } from '@connection-portal/rules/language';

/**
 * What every key of this app's local drafts starts with. The app's name keeps them apart from
 * other apps' entries on the same origin, and `v1` lets a later format use keys of its own. Spec
 * 006 changed the format, not the prefix, so that old records are still found and removed
 */
export const LOCAL_DRAFT_PREFIX = 'connection-portal:local-draft:v1:';

/**
 * The record's `format`: a record of another format is invalid and removed (R9). Format 1 held the
 * form ID (`servicebwForm`); its records are removed, not converted (spec 006, FR-009)
 */
export const LOCAL_DRAFT_FORMAT = 2;

/**
 * How long a record without a change is kept: 30 days (FR-018). Long enough to come back after a
 * holiday, short enough that forgotten work doesn't pile up on a shared device
 */
export const LOCAL_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The longest gap between two writes of a flow's record. Serialising on every keystroke would
 * make the editor stutter at spec 002's limits; one second keeps the loss well under the spec's
 * 5 seconds (SC-004)
 */
export const LOCAL_DRAFT_WRITE_INTERVAL_MS = 1000;

/**
 * The query parameter that names the flow's local draft (`?local=<flowKey>`). A search parameter
 * survives the sign-in round trip after an expired session, which router state doesn't (R10)
 */
export const LOCAL_DRAFT_PARAM = 'local';

/**
 * The name shown for a content without one (`displayNameOf`; spec 009, G§2 "connection"). A
 * text the page shows, never stored: a record keeps its name as typed, the empty one included
 */
export const LOCAL_DRAFT_COPY = defineTexts(
  { untitled: 'Untitled connection' },
  { untitled: 'Unbenannte Anbindung' }
);
