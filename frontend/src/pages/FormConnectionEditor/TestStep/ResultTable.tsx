import { useCopy } from '../../../hooks/useLanguage';
import { TEST_STEP_COPY } from './constants';
import ResultRow from './ResultRow';
import type { ResultTableProps } from './types';

/**
 * The result table (S8.6; F3, F8, F14, W10; FR-015; Figma "Table" U01 7057:58825, U08
 * 7058:61764, met list 7057:59239): its head, body/small and muted, 6px above its 1px decorative
 * divider, then one row per reported item, its members indented under it, and per other
 * top-level item.
 * - A variant the persona doesn't meet: the columns "Rule" (300px after the icon and 12px) and
 *   "Message Mia reads".
 * - A variant the persona meets: the one column "Rules Mia meets", no message column (F3).
 *
 * Figma's 340px column needs a card of 480px or more (a container query on `ResultSection`'s
 * card); in a narrower card (a phone, or 200 % zoom) the two columns share the width, so that the
 * message column isn't cut off (quickstart V9). In a window under 320 CSS px the two columns
 * stack: each message under its rule (T096).
 *
 * A table, so that each message is read with its column's name.
 */
export default function ResultTable({ view }: ResultTableProps) {
  const copy = useCopy(TEST_STEP_COPY);
  const messageColumn = view.messageColumn !== null;
  const head =
    'text-kern-static-small text-kern-layout-text-muted pb-6 text-left align-top leading-(--kern-typography-line-height-medium-static) font-normal';
  return (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr className="border-b border-(--kern-color-decorative-border-default)">
          <th
            scope="col"
            className={`${head} pl-40 ${messageColumn ? 'narrow:block narrow:w-full w-1/2 @min-[480px]:w-340' : 'pr-8'}`}
          >
            {view.listHeading ?? copy.rule}
          </th>
          {messageColumn && (
            <th scope="col" className={`${head} narrow:block narrow:pl-20 pr-8 pl-12 break-words`}>
              {view.messageColumn}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {view.rows.map((row) => (
          <ResultRow key={row.itemId} row={row} depth={0} messageColumn={messageColumn} />
        ))}
      </tbody>
    </table>
  );
}
