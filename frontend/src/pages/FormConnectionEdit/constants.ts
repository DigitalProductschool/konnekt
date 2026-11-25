import type { EditLocationState } from '@konnekt/api-types/routing';
import { defineTexts } from '@konnekt/rules/language';

// The restore question of a stored draft's edit route (spec 005 S5, W6, "Copy"), on U17's dialog
// (7173:52681; spec 008 W4), in both languages (spec 009, R1); the draft's name is content
export const RESTORE_COPY = defineTexts(
  {
    restoreTitle: 'Restore your unsaved changes?',
    restoreText: (name: string, date: string) =>
      `This device has changes to ${name} from ${date} that weren’t saved.`,
    restore: 'Restore changes',
    discardThem: 'Discard them',
  },
  {
    // A soft hyphen (R9 step 3): at 320px the whole word pushed the dialog's × out of the window
    // (spec 009, T046); the tab title leaves it out (RestoreDialog)
    restoreTitle: 'Nicht gespeicherte Änderungen wieder\u00ADherstellen?',
    restoreText: (name: string, date: string) =>
      `Auf diesem Gerät gibt es nicht gespeicherte Änderungen an ${name} vom ${date}.`,
    restore: 'Änderungen wiederherstellen',
    discardThem: 'Verwerfen',
  }
);

// The entry question before editing a published connection (S17; F48, FR-045 (a); U15 6699:47905
// from the row's "Edit", U87 6396:49030 from the details' "Edit connection"): the title of F48,
// the design's body (cosmetic 14) and buttons. It doesn't change anything, so the scrim closes it
// (FR-052a)
export const EDIT_ENTRY_DIALOG_COPY = defineTexts(
  {
    title: (name: string) => `Edit “${name}”?`,
    text: 'Your changes only take effect when you save them. Started connections don’t get interrupted or modified even after saving.',
    // The details' question for a scheduled connection (spec 010, S17; FR-013, W7); the row's
    // keeps `title` (U15 6699:47905)
    scheduledTitle: 'Edit this scheduled connection?',
    scheduledText: (date: string) =>
      `Your changes only take effect when you save them. Saved changes become active on ${date}.`,
    cancel: 'Cancel',
    confirm: 'Edit connection',
  },
  {
    title: (name: string) => `„${name}“ bearbeiten?`,
    text: 'Ihre Änderungen werden erst wirksam, wenn Sie sie speichern. Bereits begonnene Anfragen werden auch nach dem Speichern weder unterbrochen noch verändert.',
    scheduledTitle: 'Diese geplante Anbindung bearbeiten?',
    scheduledText: (date: string) =>
      `Ihre Änderungen werden erst wirksam, wenn Sie sie speichern. Gespeicherte Änderungen werden am ${date} aktiv.`,
    cancel: 'Abbrechen',
    confirm: 'Anbindung bearbeiten',
  }
);

// "Edit connection" in the entry question opens the edit flow at step 1 (FR-046)
export const EDIT_ENTRY_STATE: EditLocationState = { step: 'connection' };

// The footer's "Discard changes" in the edit flow (S18; FR-045 (c); U100 7173:52772): "Discard
// changes" is the filled danger button, "Keep editing" the outlined one. It deletes nothing
// stored, so the scrim closes it (FR-052a). Not the leave question's "Discard changes" (#47)
export const DISCARD_COPY = defineTexts(
  {
    title: 'Discard your changes?',
    text: 'The connection goes back to the version that’s active now. Citizens aren’t affected.',
    // For a scheduled connection (spec 010, S18; FR-013, W7)
    scheduledText: (date: string) =>
      `The connection goes back to the version that becomes active on ${date}. Citizens aren’t affected.`,
    keepEditing: 'Keep editing',
    discard: 'Discard changes',
  },
  {
    title: 'Ihre Änderungen verwerfen?',
    text: 'Die Anbindung kehrt zur derzeit aktiven Version zurück. Bürgerinnen und Bürger sind davon nicht betroffen.',
    scheduledText: (date: string) =>
      `Die Anbindung kehrt zu der Version zurück, die am ${date} aktiv wird. Bürgerinnen und Bürger sind davon nicht betroffen.`,
    keepEditing: 'Weiter bearbeiten',
    discard: 'Änderungen verwerfen',
  }
);
