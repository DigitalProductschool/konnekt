// The PDF's file name (data-model section 7, FR-033, FR-044): "<name>_<version>.pdf", a draft's
// "<name>_draft_<version>.pdf". Only the name part is cleaned and shortened; "_draft_", the
// version and ".pdf" are never cut. The PDF itself shows the name as entered. Pure
import type { ConnectionPdfModel } from './types';

/** The name part's limit, in code points */
export const FILE_NAME_MAX_CODE_POINTS = 100;

/** What an empty name part reads */
export const FILE_NAME_FALLBACK = 'connection';

/** The characters a file name can't hold, and every control character (Unicode's Cc) */
const FORBIDDEN = /[/\\:*?"<>|\p{Cc}]/gu;

/** A leading or trailing run of dots and spaces */
const EDGE_DOTS_AND_SPACES = /^[. ]+|[. ]+$/g;

/** What is trimmed from the end of a shortened name part */
const TRAILING_AFTER_CUT = /[ .-]+$/;

/** The name part: forbidden characters and edge dots or spaces become "-", then shortened */
function namePartOf(name: string): string {
  const cleaned = name
    .replace(FORBIDDEN, '-')
    .replace(EDGE_DOTS_AND_SPACES, (run) => '-'.repeat(run.length));
  const codePoints = Array.from(cleaned);
  const part =
    codePoints.length > FILE_NAME_MAX_CODE_POINTS
      ? codePoints.slice(0, FILE_NAME_MAX_CODE_POINTS).join('').replace(TRAILING_AFTER_CUT, '')
      : cleaned;
  return /^-*$/.test(part) ? FILE_NAME_FALLBACK : part;
}

/** The file name the PDF is saved under */
export function fileNameOf(model: Pick<ConnectionPdfModel, 'kind' | 'name' | 'version'>): string {
  const draft = model.kind === 'draft' ? '_draft' : '';
  return `${namePartOf(model.name)}${draft}_${model.version}.pdf`;
}
