import type { EditLocationState } from '@connection-portal/api-types/routing';

// The restore question of a stored draft's edit route (spec 005 S5, W6, "Copy"), on U17's dialog
// (7173:52681; spec 008 W4)
export const RESTORE_COPY = {
  restoreTitle: 'Restore your unsaved changes?',
  restoreText: (name: string, date: string) =>
    `This device has changes to ${name} from ${date} that weren’t saved.`,
  restore: 'Restore changes',
  discardThem: 'Discard them',
};

// The entry question before editing a published connection (S17; F48, FR-045 (a); U15 6699:47905
// from the row's "Edit", U87 6396:49030 from the details' "Edit connection"): the title of F48,
// the design's body (cosmetic 14) and buttons. It doesn't change anything, so the scrim closes it
// (FR-052a)
export const EDIT_ENTRY_COPY = {
  title: (name: string) => `Edit “${name}”?`,
  text: 'Your changes only take effect when you save them. Started connections don’t get interrupted or modified even after saving.',
  cancel: 'Cancel',
  confirm: 'Edit connection',
};

// "Edit connection" in the entry question opens the edit flow at step 1 (FR-046)
export const EDIT_ENTRY_STATE: EditLocationState = { step: 'connection' };

// The footer's "Discard changes" in the edit flow (S18; FR-045 (c); U100 7173:52772): "Discard
// changes" is the filled danger button, "Keep editing" the outlined one. It deletes nothing
// stored, so the scrim closes it (FR-052a). Not the leave question's "Discard changes" (#47)
export const DISCARD_COPY = {
  title: 'Discard your changes?',
  text: 'The connection goes back to the version that’s active now. Citizens aren’t affected.',
  keepEditing: 'Keep editing',
  discard: 'Discard changes',
};
