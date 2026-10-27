import type { Combinator } from '../../types/form-connections';

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
