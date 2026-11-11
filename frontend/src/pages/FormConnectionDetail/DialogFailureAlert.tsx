import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import ErrorNoticeText from '../../components/ErrorNoticeText';
import { START_DATE_FAILURE_ALERT_CLASSES } from './constants';
import type { DialogFailureAlertProps } from './types';

/**
 * The failure's alert of "Change start date" and "Activate this connection again?" (FR-014, F2,
 * W8), as the publish dialog's (T024): KERN's slim danger alert with `noAnswerText` when no answer
 * came, or with the server's message and the error ID of a `5xx` on a line of its own, which wraps
 * where it needs to; any other refusal (a `4xx`, such as `409 status_changed` after a change
 * meanwhile) `title` with the server's message as its body
 */
export default function DialogFailureAlert({
  notice,
  noAnswer,
  title,
  noAnswerText,
}: DialogFailureAlertProps) {
  if (noAnswer || notice.error_id) {
    // KERN's alert as `KernAlert` renders it, without a body
    return (
      <div
        role="alert"
        className={`kern-alert kern-alert--danger ${START_DATE_FAILURE_ALERT_CLASSES}`}
      >
        <div className="kern-alert__header">
          <span aria-hidden="true" className="kern-icon kern-icon--danger kern-icon--small" />
          {/* kern.css lays the title out as a flex row: one inline box keeps the ID under the text */}
          <span className="kern-title">
            <span>{noAnswer ? noAnswerText : <ErrorNoticeText notice={notice} />}</span>
          </span>
        </div>
      </div>
    );
  }
  return (
    <KernAlert variant="danger" title={title} className={START_DATE_FAILURE_ALERT_CLASSES}>
      <ErrorNoticeText notice={notice} />
    </KernAlert>
  );
}
