import documentIcon from '../assets/icons/document.svg';
import documentBlueIcon from '../assets/icons/document-blue.svg';
import drivingLicenceIcon from '../assets/icons/driving-licence.svg';
import drivingLicenceBlueIcon from '../assets/icons/driving-licence-blue.svg';
import personalIdIcon from '../assets/icons/personal-id.svg';
import personalIdBlueIcon from '../assets/icons/personal-id-blue.svg';

interface Glyphs {
  muted: string;
  blue: string;
}

// Figma "Icon/Glyph": one glyph per document type, the same everywhere
const DOCUMENT_GLYPHS: Record<string, Glyphs> = {
  pid: { muted: personalIdIcon, blue: personalIdBlueIcon },
  mdl: { muted: drivingLicenceIcon, blue: drivingLicenceBlueIcon },
};

const GENERIC_GLYPHS: Glyphs = { muted: documentIcon, blue: documentBlueIcon };

/** The glyph of a document type, muted (not chosen) or blue (chosen). */
export function documentGlyph(documentType: string, tone: keyof Glyphs): string {
  return (DOCUMENT_GLYPHS[documentType] ?? GENERIC_GLYPHS)[tone];
}
