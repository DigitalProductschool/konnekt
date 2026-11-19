import ResultRow from './ResultRow';
import type { ResultListProps } from './types';

/**
 * The result list (S8.6; FR-015; test-results-v5 R2; V5 frame 1 7599:55727, rows 7599:55832,
 * 7599:55842): one row per reported item, its members under it, then one per other top-level
 * item, each with a 1px decorative divider under it. No head: the V5 frames hide the table head
 * ("Old · Table head" 7599:55827), and each row names its message itself ("Message for
 * citizens:"), so neither "Rule" nor "Message Mia reads" nor "Rules Mia meets" is shown (reversing
 * spec 004 F3, F14 and S8.6.3, S8.6.6, S8.6.7's head).
 */
export default function ResultList({ rows }: ResultListProps) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <ResultRow key={row.itemId} row={row} depth={0} />
      ))}
    </ul>
  );
}
