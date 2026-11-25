import type { Combinator, Mark } from '@konnekt/api-types/form-connections';
import type { ItemFindingKind } from '@konnekt/rules/checks/types';
import { defineTexts } from '@konnekt/rules/language';

export const GROUP_FRAME_COPY = defineTexts<{
  subtitles: Record<Combinator, string>;
  messageLabel: string;
  messageHint: string;
  identifier: string;
}>(
  {
    // Figma "Rules/Group header" (U34 6094:6413, 6094:6320; FR-051 (32)): how the members
    // combine, the words of the connector menu's options. The test results map the rules
    // package's `GROUP_SUBTITLES` to these words too (`TestStep/utils.ts` `resultStatementOf()`)
    subtitles: {
      and: 'All rules must be met',
      or: 'At least one rule must be met',
    },
    // The group's own message (U35 6324:39411; C2) and its hint (6324:39419)
    messageLabel: 'Message for citizens:',
    messageHint: 'Shown instead of the rules’ own messages when this group isn’t met.',
    // Read before a group's identifier on the details (W1)
    identifier: 'Identifier',
  },
  {
    subtitles: {
      and: 'Alle Regeln müssen erfüllt sein',
      or: 'Mindestens eine Regel muss erfüllt sein',
    },
    messageLabel: 'Nachricht an die antragstellende Person:',
    messageHint:
      'Wird anstelle der Nachrichten der einzelnen Regeln angezeigt, wenn diese Gruppe nicht erfüllt ist.',
    identifier: 'Kennung',
  }
);

// A group's own message, like a rule's: at most 500 characters (data-model.md, "Group")
export const GROUP_MESSAGE_MAX_LENGTH = 500;

// The space around a group's finding note, under its header's divider (spec 003, A5): a
// conflicting group's note follows the divider (U44 6750:41109), a duplicate, covered or
// always-met group's note has 8px above it (U45 6753:40823); both end 16px from the frame's right
// edge. Below it, `FindingNote` keeps its own 8px
export const GROUP_FINDING_NOTE_SPACING: Record<ItemFindingKind, string> = {
  conflicting: 'pr-16',
  redundant: 'pt-8 pr-16',
  always_met: 'pt-8 pr-16',
};

// Appended to a group frame's id for its header's id: the findings banner's name links move the
// focus to the header, which the group's note describes (spec 003, W19; contracts/ui-screens.md
// "Accessibility")
export const GROUP_HEADER_ID_SUFFIX = '-header';

// "Group wrap" › the frame (U34 6094:6411, 6094:6318): a group fills the card's width with the
// page's light blue and square corners, a sub-group is white with radius 8; both start 8px above
// the header and keep a 3px left border in the action colour (a changed group too, U58
// 6522:32997), purple for a group added in its variant (U38 6163:5269)
export const GROUP_FRAME_FILLS = {
  group: 'bg-kern-layout-background-hued',
  subGroup: 'rounded-kern-default bg-kern-layout-background-default',
};
export const GROUP_FRAME_BORDERS = {
  default: 'border-kern-action-default',
  added: 'border-variant-new',
};

/**
 * Inside a removed group, Figma fades a sub-group's whole frame to
 * `action-state-opacity-disabled` (U47 6185:41171). The frame fades its parts instead (its fill,
 * border and divider here, its header's text, its message and its connectors), because opacity
 * on a box makes a stacking context: it would fade the members' marks, which keep their colour
 * (F36), and any menu opened inside. These are the frame's colours at that 40%, over what lies
 * behind them, as the faded box shows them
 */
export const GROUP_FRAME_FADED_FILLS = {
  group: 'bg-kern-layout-background-hued/40',
  subGroup: 'rounded-kern-default bg-kern-layout-background-default/40',
};
export const GROUP_FRAME_FADED_BORDERS = {
  default: 'border-kern-action-default/40',
  added: 'border-variant-new/40',
};
export const GROUP_FRAME_FADED_TINTS: Record<Mark, string> = {
  changed: 'bg-variant-changed-background/40',
  added: 'bg-variant-new-background/40',
  removed: '',
};

// The header's divider ("Header", 1px `decorative-border`), at 40% in a faded frame
export const GROUP_HEADER_DIVIDERS = {
  default: 'border-(--kern-color-decorative-border-default)',
  faded: 'border-(--kern-color-decorative-border-default)/40',
};
