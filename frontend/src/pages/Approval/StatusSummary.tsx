import { useCopy, useLanguage } from '../../hooks/useLanguage';
import ApprovalLinkCards from './ApprovalLinkCards';
import { BODY_TEXT_CLASSES, STATUS_LEADS } from './constants';
import DescriptionLine from './DescriptionLine';
import type { BodyLinesProps, BodyLineTextProps, StatusSummaryProps } from './types';
import { statusLinesOf } from './utils';

/** One sentence of what will happen; "Deleting can’t be undone." in semibold */
function BodyLineText({ line }: BodyLineTextProps) {
  return (
    <p className={`${BODY_TEXT_CLASSES} ${line.strong ? 'font-semibold' : ''}`}>{line.text}</p>
  );
}

/** The sentences of what will happen, 8 apart */
function BodyLines({ lines }: BodyLinesProps) {
  return (
    <div className="flex flex-col gap-8">
      {lines.map((line) => (
        <BodyLineText key={line.key} line={line} />
      ))}
    </div>
  );
}

/**
 * The body of `deactivate`, `reactivate`, `delete` and `set_start_date` (S3 "Body"; spec 010,
 * S21): the description line, then the details' Links card (`ApprovalLinkCards`) whose lead says
 * what becomes of the connection URLs, and under it what will happen (`statusLinesOf()`): that
 * requests in progress are cancelled, the dialogs' sentences for a scheduled connection, the start
 * ("Active from <date>", or that it goes live at once), and that deleting can't be undone. A
 * deactivated connection's copy buttons are off, as on its details (T028, W21); a scheduled one's
 * copy, as the details' (spec 010, FR-007).
 */
export default function StatusSummary({ action, connection, urls, startDate }: StatusSummaryProps) {
  const { language } = useLanguage();
  const lead = useCopy(STATUS_LEADS)[action];
  return (
    <div className="flex flex-col gap-24">
      {connection.description && <DescriptionLine description={connection.description} />}
      <ApprovalLinkCards urls={urls} lead={lead} deactivated={connection.state === 'deactivated'} />
      <BodyLines lines={statusLinesOf(action, connection, startDate, language)} />
    </div>
  );
}
