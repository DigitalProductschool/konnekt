// The restore question of a stored draft's edit route (spec 005 S5, W6, "Copy"), on U17's dialog
// (7173:52681; spec 008 W4)
export const RESTORE_COPY = {
  restoreTitle: 'Restore your unsaved changes?',
  restoreText: (name: string, date: string) =>
    `This device has changes to ${name} from ${date} that weren’t saved.`,
  restore: 'Restore changes',
  discardThem: 'Discard them',
};
