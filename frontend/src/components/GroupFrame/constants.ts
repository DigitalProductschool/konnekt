import type { Combinator } from '../../types/form-connections';
import type { ItemFindingKind } from '../../utils/rules/checks/types';

export const GROUP_FRAME_COPY = {
  // Figma "Rules/Group header" (U14 6094:6413, 6094:6320): how the members combine
  subtitles: {
    and: 'All of these must be true',
    or: 'At least one of these must be true',
  } satisfies Record<Combinator, string>,
  // The group's own message (U14 6324:39411) and its hint (6324:39419)
  messageLabel: 'Error message applicants read:',
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
