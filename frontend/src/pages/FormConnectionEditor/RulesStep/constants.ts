// The Rules step's copy: design-notes.md §2 and §4, the Figma frames named, and F29's toasts

/** The main branch of a new connection, before it is saved (FR-018) */
export const MAIN_BRANCH_NAME = 'Standard';
/** Its key until the save gives it an id */
export const MAIN_BRANCH_KEY = 'main';

/** The keys that move the focus between a menu's items (WAI-ARIA menu pattern) */
export const MENU_NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

export const RULES_COPY = {
  // U11 6348:40213
  title: 'Rules',
  hint: 'Each rule checks the data applicants share. If a rule isn’t met, the applicant sees its error message.',
  loading: 'Loading the documents and their values…',
  loadErrorTitle: 'Couldn’t load the documents and their values',
  loadErrorText: 'Check your connection and try again.',
  retry: 'Try again',
  // U29 6197:11654 (W5)
  emptyTitle: 'No rules yet',
  emptyText: 'Without rules, anyone who shares the requested documents can apply.',
  addRule: 'Add rule',
  // The rule menu, U14 6113:28988
  menuLabel: (rule: string) => `Actions for ${rule}`,
  editRule: 'Edit rule',
  rename: 'Rename',
  duplicate: 'Duplicate',
  deleteRule: 'Delete rule',
  // Renaming inline, U15 6344:53317–6344:53481
  renameLabel: (rule: string) => `Name of ${rule}`,
  renameHint: 'Enter saves · Esc cancels',
  // "Delete Rule 03?", U14 6113:29056 (design-notes §4, "Deleting a rule")
  deleteTitle: (rule: string) => `Delete ${rule}?`,
  deleteText: (statement: string | null) =>
    statement
      ? `Applicants will no longer be checked for “${statement}”. You can undo this right after.`
      : 'You can undo this right after.',
  cancel: 'Cancel',
  // "Save changes to Rule 01?", U28 6197:10989 (F10)
  saveChangesTitle: (rule: string) => `Save changes to ${rule}?`,
  saveChangesText: 'You changed this rule but haven’t saved it yet.',
  discard: 'Discard',
  saveChanges: 'Save changes',
  undo: 'Undo',
  // F29: toasts name the rule with its branch
  ruleSaved: (rule: string, branch: string) => `${rule} in ${branch} saved.`,
  ruleDeleted: (rule: string, branch: string) => `${rule} in ${branch} deleted.`,
  // The problems banner, U27 6197:10696 (F11)
  unrequestedTitle: (count: number) =>
    count === 1
      ? '1 rule checks data that’s no longer requested'
      : `${count} rules check data that’s no longer requested`,
  unrequestedText: (rule: string, branch: string) =>
    `${rule} in ${branch} checks data that’s no longer requested. Add the data again in Documents, or edit or delete the rule.`,
  // A refused Publish or Save (F11), with the server's message
  refusedPublishTitle: 'Couldn’t publish',
  refusedSaveTitle: 'Couldn’t save',
};
