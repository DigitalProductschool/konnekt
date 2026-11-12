import warningIcon from '../../assets/icons/warning-amber.svg';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import { BULK_DELETE_CLASSES } from './constants';
import type { BulkDeleteLineProps, BulkDeleteWarningProps } from './types';

/**
 * One connection in the bulk delete dialog's summary (spec 010, FR-041; U15 6699:45320, "Row ·
 * <name>"): its name in label/default and its status pill on the right, as the overview's row shows
 * it ("Scheduled" without the date: the warning line names it). Where the name would get less
 * than 120px beside it, and below 320 CSS px, the pill goes under the name
 */
export default function BulkDeleteLine({ formConnection }: BulkDeleteLineProps) {
  return (
    <li className={BULK_DELETE_CLASSES.line}>
      <span className={BULK_DELETE_CLASSES.name}>{formConnection.name}</span>
      <ConnectionStatusBadge state={formConnection.state} />
    </li>
  );
}

/**
 * A warning line of the bulk delete dialog (FR-041; U15 6699:45320, "Warnings"): the design's
 * 20px amber triangle at the top, 8, then the sentence in label/default and feedback/warning. The
 * sentence says it all, so the triangle is decorative
 */
export function BulkDeleteWarning({ text }: BulkDeleteWarningProps) {
  return (
    <li className={BULK_DELETE_CLASSES.warning}>
      <img src={warningIcon} alt="" width={20} height={20} className="shrink-0" />
      <p className={BULK_DELETE_CLASSES.warningText}>{text}</p>
    </li>
  );
}
