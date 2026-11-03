import ResultRow from './ResultRow';
import type { MemberRowsProps } from './types';

/**
 * A reported group's members that aren't met or couldn't be checked, recursively for sub-groups,
 * each with its name, statement and status, indented under the group (S8.6; W10; FR-015). Only a
 * reported group has members here: a met group, or one that isn't reported, lists none (FR-015k)
 */
export default function MemberRows({ members, depth, messageColumn }: MemberRowsProps) {
  return members.map((member) => (
    <ResultRow key={member.itemId} row={member} depth={depth} messageColumn={messageColumn} />
  ));
}
