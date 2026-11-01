import { RULES_MESSAGES } from '../../../utils/rules/constants';
import { checkedInBranch, checksUnrequestedData } from '../../../utils/rules/validation';
import { ELEMENT_IDS } from '../constants';
import GroupListItem from './GroupListItem';
import RuleListItem from './RuleListItem';
import SelectBox from './SelectBox';
import type { TreeItemProps } from './types';
import { problemFlagOf } from './utils';

/**
 * An item of the open branch's tree: a rule, or the rule editor in its place, or a group with
 * its members. In select mode, the rules of the chosen level get their box (U16), except removed
 * ones. A rule a based variant inherits unchanged isn't flagged there for data no longer
 * requested: Standard's rule is (FR-006). A rule with a finding of spec 003 gets its note, unless
 * it is removed or faded with its group, which the checks leave out (FR-001, FR-012): a conflict
 * in the warning look, a duplicate, covered or always-met rule in the info look (FR-005, FR-006;
 * A3, A4; U04 6178:8168, 6178:8216). Inside a duplicate, covered or always-met group the checks
 * report nothing, so its rules stay plain (A5).
 */
export default function TreeItem({
  view,
  item,
  level,
  parentId,
  depth,
  dissolved = false,
  faded = false,
}: TreeItemProps) {
  const { branch, state, dispatch } = view;
  if (item.type === 'group') {
    return (
      <GroupListItem view={view} group={item} depth={depth} dissolved={dissolved} faded={faded} />
    );
  }
  if (state.editing?.original?.id === item.id && state.editing.branchKey === branch.key) {
    return view.ruleEditor;
  }
  const { selection } = state;
  const removed = item.mark === 'removed';
  const selectable =
    !faded &&
    !removed &&
    selection !== null &&
    selection.branchKey === branch.key &&
    selection.parentId === parentId;
  const flag =
    problemFlagOf(state, branch, item.id) ??
    (checkedInBranch(branch, item) && checksUnrequestedData(item, view.documents)
      ? RULES_MESSAGES.notRequested(item.name.trim(), branch.name.trim())
      : null);
  // Groups form at the top level and in groups, from two or more rules (FR-008, US2-AS6)
  const canGroup =
    depth < 2 &&
    !removed &&
    level.some(
      (other) => other.type === 'rule' && other.id !== item.id && other.mark !== 'removed'
    );
  return (
    <>
      {selectable && (
        <SelectBox
          id={ELEMENT_IDS.selectBox(branch.key, item.id)}
          ruleName={item.name}
          checked={selection.ids.includes(item.id)}
          onToggle={() => dispatch({ type: 'toggleSelect', itemId: item.id })}
        />
      )}
      <RuleListItem
        rule={item}
        view={view}
        elementId={ELEMENT_IDS.rule(branch.key, item.id)}
        flag={flag}
        finding={faded || removed ? null : (view.findings.get(item.id) ?? null)}
        canGroup={canGroup}
        faded={faded}
      />
    </>
  );
}
