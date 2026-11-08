import type { ItemFindingKind } from '@connection-portal/rules/checks/types';
import { GROUP_SUBTITLES } from '@connection-portal/rules/personas/constants';

export const GROUP_FRAME_COPY = {
  // Figma "Rules/Group header" (U14 6094:6413, 6094:6320): how the members combine. The texts
  // live in the rules package, whose test results name a group by them
  subtitles: GROUP_SUBTITLES,
  // The group's own message (U14 6324:39411) and its hint (6324:39419)
  messageLabel: 'Error message citizens read:',
  messageHint: 'Shown instead of the rules’ own messages when this group isn’t met.',
  // Read before a group's identifier on the details (W1)
  identifier: 'Identifier',
};

// A group's own message, like a rule's: at most 500 characters (data-model.md, "Group")
export const GROUP_MESSAGE_MAX_LENGTH = 500;

// The space above a group's finding note, under its header's divider (spec 003, A5): a
// conflicting group's note follows the divider (U05 6753:40166), a duplicate, covered or
// always-met group's note has 8 px above it, as "Finding note · group" draws it (U06 6753:40823,
// U07 6753:41297). Below it, `FindingNote` keeps its own 8 px
export const GROUP_FINDING_NOTE_SPACING: Record<ItemFindingKind, string> = {
  conflicting: '',
  redundant: 'pt-8',
  always_met: 'pt-8',
};

// Appended to a group frame's id for its header's id: the findings banner's name links move the
// focus to the header, which the group's note describes (spec 003, W19; contracts/ui-screens.md
// "Accessibility")
export const GROUP_HEADER_ID_SUFFIX = '-header';
