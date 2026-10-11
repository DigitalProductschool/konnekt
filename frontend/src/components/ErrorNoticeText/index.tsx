import { ERROR_NOTICE_COPY } from './constants';
import type { ErrorNoticeTextProps } from './types';

/**
 * The text of an error notice: the message and, after a 5xx answer, the error ID on a line of
 * its own, which one click selects for passing on to an administrator. It is inline content,
 * so it fits in a paragraph such as KernAlert's body or a field's error message.
 */
export default function ErrorNoticeText({ notice }: ErrorNoticeTextProps) {
  return (
    <>
      {notice.message}
      {notice.error_id && (
        <span className="block">
          {ERROR_NOTICE_COPY.errorId} <span className="select-all">{notice.error_id}</span>
        </span>
      )}
    </>
  );
}
