// The restore question of a stored draft's edit route (contracts/ui-screens.md S5, W6, "Copy")
export const RESTORE_COPY = {
  restoreTitle: 'Restore your unsaved changes?',
  restoreText: (name: string, date: string) =>
    `This device has changes to ${name} from ${date} that weren’t saved.`,
  restore: 'Restore changes',
  discardThem: 'Discard them',
};
