import { RULES_MESSAGES } from '../../../utils/rules/constants';
import { checksUnrequestedData } from '../../../utils/rules/validation';
import { ELEMENT_IDS } from '../constants';
import GroupListItem from './GroupListItem';
import RuleListItem from './RuleListItem';
import SelectBox from './SelectBox';
import type { TreeItemProps } from './types';
import { problemFlagOf } from './utils';

/**
 * An item of the open branch's tree: a rule, or the rule editor in its place, or a group with
 * its members. In select mode, the rules of the chosen level get their box (U16).
 */
export default function TreeItem({ view, item, level, parentId, depth }: TreeItemProps) {
  const { branch, state, dispatch } = view;
  if (item.type === 'group') {
    return <GroupListItem view={view} group={item} depth={depth} />;
  }
  if (state.editing?.original?.id === item.id && state.editing.branchKey === branch.key) {
    return view.ruleEditor;
  }
  const { selection } = state;
  const selectable =
    selection !== null && selection.branchKey === branch.key && selection.parentId === parentId;
  const flag =
    problemFlagOf(state, branch, item.id) ??
    (checksUnrequestedData(item, view.documents)
      ? RULES_MESSAGES.notRequested(item.name.trim(), branch.name.trim())
      : null);
  // Groups form at the top level and in groups, from two or more rules (FR-008, US2-AS6)
  const canGroup =
    depth < 2 && level.some((other) => other.type === 'rule' && other.id !== item.id);
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
        branch={branch}
        context={view.context}
        elementId={ELEMENT_IDS.rule(branch.key, item.id)}
        flag={flag}
        renaming={state.renaming?.branchKey === branch.key && state.renaming.itemId === item.id}
        canGroup={canGroup}
        dispatch={dispatch}
        onEdit={() => view.onEditRule(item.id)}
        onDuplicate={() => view.onDuplicateRule(item.id)}
        onGroup={() => view.onStartSelect(item.id)}
      />
    </>
  );
}
