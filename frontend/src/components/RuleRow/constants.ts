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
  },
  {
    messageLabel: 'Nachricht für Bürgerinnen und Bürger:',
    identifier: 'Kennung',
    documentSeparator: '·',
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

// The 16/24 text of the data and the check's words
export const MEDIUM_TEXT =
  'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)';

// Figma "Problem" › "Outline" (U44 6171:7487; U27 6197:10704): a flagged, marked or checked row
// sits 8px in from the card's edges in a frame with radius 8; its colours change in 150ms (§4)
export const ROW_FRAME =
  'rounded-kern-default motion transition-colors duration-(--duration-colour)';
