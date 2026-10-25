// The Rules step's copy: design-notes.md §2, §4 and §5, the Figma frames named, and F29's toasts
import type { ItemNameSize } from './types';

/** The main branch of a new connection, before it is saved (FR-018) */
export const MAIN_BRANCH_NAME = 'Standard';
/** Its key until the save gives it an id */
export const MAIN_BRANCH_KEY = 'main';

/** The type of names (U14): label/small for a rule, title/default and title/small for groups */
export const NAME_SIZES: Record<ItemNameSize, string> = {
  rule: 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)',
  group: 'text-kern-adaptive-medium leading-(--kern-typography-line-height-medium-adaptive)',
  'sub-group': 'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)',
};

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
  // Grouping (U14 6344:53529, U16), with F29's toast: "Rule 02 and Rule 03 in Standard are now
  // Group 01."
  groupWithOthers: 'Group with other rules',
  grouped: (rules: string, branch: string, group: string) =>
    `${rules} in ${branch} are now ${group}.`,
  and: 'and',
  // The selection bar (U16 6344:53542, 6344:53572, 6344:53670); the one for no rule chosen has
  // no frame
  selectOneMore: (rule: string) => `Select at least one more rule to group with ${rule}.`,
  selectTwo: 'Select two or more rules to group.',
  selected: (count: number) => `${count} rules selected`,
  selectedSubGroup: (count: number, group: string) =>
    `${count} rules selected. They become a sub-group of ${group}.`,
  groupRules: 'Group rules',
  selectRule: (rule: string) => `Select ${rule}`,
  // The note after switching a level (U14 6329:19219); the one for AND has no frame
  switchedToOr: (level: string) => `${level} now needs only one rule to be true.`,
  switchedToAnd: (level: string) => `${level} now needs all its rules to be true.`,
  // A group's and a sub-group's menu (W6, W8; design-notes §5), built like the rule menu
  groupMenuLabel: (group: string) => `Actions for ${group}`,
  addMessage: 'Add error message',
  removeMessage: 'Remove error message',
  ungroup: 'Ungroup',
  deleteGroup: 'Delete group',
  // "Delete Group 01?" and the toasts (design-notes §5)
  deleteGroupText: (group: string, subGroups: number) =>
    subGroups === 0
      ? `${group} and the rules in it will be deleted. You can undo this right after.`
      : `${group} and the rules and ${subGroups === 1 ? 'sub-group' : 'sub-groups'} in it will be deleted. You can undo this right after.`,
  ungrouped: (group: string, branch: string) => `${group} in ${branch} ungrouped.`,
  groupDeleted: (group: string, branch: string) => `${group} in ${branch} deleted.`,
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
