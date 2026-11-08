import documentIcon from '../../assets/icons/document.svg';
import drivingLicenceInkIcon from '../../assets/icons/driving-licence-ink.svg';
import personalIdInkIcon from '../../assets/icons/personal-id-ink.svg';

export const RULE_ROW_COPY = {
  // Figma "Rules/Error message" (6092:3506)
  messageLabel: 'Error message citizens read:',
  // Read before a rule's identifier on the details (W1)
  identifier: 'Identifier',
};

// Figma "Icon/Glyph" in tone ink, the document marker before a statement (6083:3463)
export const DOCUMENT_GLYPHS: Record<string, string> = {
  pid: personalIdInkIcon,
  mdl: drivingLicenceInkIcon,
};
export const GENERIC_DOCUMENT_GLYPH = documentIcon;
