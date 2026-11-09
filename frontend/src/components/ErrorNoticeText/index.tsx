import { ERROR_NOTICE_COPY } from './constants';
import type { ErrorNoticeTextProps } from './types';

/**
 * The text of an error notice, for the body of KERN's danger alert (P07, the §3 "Alert, page
 * level" pattern: an alert with a body keeps its error ID, F22) or a field's error message: the
 * message and, after a 5xx answer, the error ID on a line of its own, which one click selects for
 * passing on to an administrator. The design draws no error ID, so the line keeps the body's
 * style. It is inline content, as `KernAlert` puts its body into a paragraph; the ID may break
 * anywhere, so that it fits at 320px (FR-010).
 */
export default function ErrorNoticeText({ notice }: ErrorNoticeTextProps) {
  return (
    <>
      {notice.message}
      {notice.error_id && (
        <span className="block">
          {ERROR_NOTICE_COPY.errorId}{' '}
          <span className="wrap-anywhere select-all">{notice.error_id}</span>
        </span>
      )}
    </>
  );
}
