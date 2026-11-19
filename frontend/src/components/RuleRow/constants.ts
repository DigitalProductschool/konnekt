import { defineTexts } from '@connection-portal/rules/language';

import documentIcon from '../../assets/icons/document.svg';
import drivingLicenceInkIcon from '../../assets/icons/driving-licence-ink.svg';
import personalIdInkIcon from '../../assets/icons/personal-id-ink.svg';

export const RULE_ROW_COPY = defineTexts(
  {
    // Figma "Rules/Error message" (6092:3506; U30 6348:40889): the label before the message (C2)
    messageLabel: 'Message for citizens:',
    // Read before a rule's identifier on the details (F35)
    identifier: 'Identifier',
    // After the document's name in the statement: "Personal ID · Date of birth (Age)" (C3)
    documentSeparator: '·',
    // A member's message line while a group it is in has its own message (F32, FR-037; U35
    // 6965:50822): the rule keeps its message, citizens read the group's. The rules step and the
    // test step's result rows both show it (test-results-v5 R3)
    notShownInGroup: (group: string) =>
      `Not shown while this rule is in ${group}. Citizens see the group message instead.`,
  },
  {
    messageLabel: 'Nachricht für Bürgerinnen und Bürger:',
    identifier: 'Kennung',
    documentSeparator: '·',
    notShownInGroup: (group: string) =>
      `Wird nicht angezeigt, solange diese Regel in ${group} ist. Bürgerinnen und Bürger sehen stattdessen die Nachricht der Gruppe.`,
  }
);

// Figma "Icon/Glyph" in tone ink, the document marker before a statement (6083:3463)
export const DOCUMENT_GLYPHS: Record<string, string> = {
  pid: personalIdInkIcon,
  mdl: drivingLicenceInkIcon,
};
export const GENERIC_DOCUMENT_GLYPH = documentIcon;

// The 14/24 text of the row's small parts: the name, the document, the chips, the message
export const SMALL_TEXT =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * `RuleMessage`'s hanging layout (test-results-v5 R3; V5 "Long rules" 7644:65780): in a container
 * of 560px or more (the caller's `@container`), the label keeps one line and the message wraps
 * beside it, its lines under its first word. In a narrower one, as at 320 px or 200 % zoom, the
 * message flows on under its label, as everywhere else. 560 rather than 480, so that the German
 * label ("Nachricht für Bürgerinnen und Bürger:", 243px at 14/600) leaves the message 200px or more
 */
export const HANGING_MESSAGE = {
  line: '@min-[560px]:flex @min-[560px]:items-start',
  label: '@min-[560px]:shrink-0 @min-[560px]:whitespace-nowrap',
  message: '@min-[560px]:min-w-0 @min-[560px]:flex-1',
} as const;

// The 16/24 text of the data and the check's words
export const MEDIUM_TEXT =
  'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)';

// Figma "Problem" › "Outline" (U44 6171:7487; U27 6197:10704): a flagged, marked or checked row
// sits 8px in from the card's edges in a frame with radius 8; its colours change in 150ms (§4)
export const ROW_FRAME =
  'rounded-kern-default motion transition-colors duration-(--duration-colour)';
