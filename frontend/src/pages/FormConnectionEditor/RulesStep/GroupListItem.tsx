import GroupFrame from '../../../components/GroupFrame';
import type { GroupFrameMember } from '../../../components/GroupFrame/types';
import { ELEMENT_IDS } from '../constants';
import AddRuleButton from './AddRuleButton';
import GroupMenu from './GroupMenu';
import ItemName from './ItemName';
import SwitchNote from './SwitchNote';
import TreeItem from './TreeItem';
import type { GroupListItemProps } from './types';
import { problemFlagOf, switchNoteOf } from './utils';

/**
 * A group or sub-group in the Rules step (S2; U14 6094:6411, 6094:6318; U16 6344:53610): the
 * shared frame with its inline name (F12), its ⋯ menu (W6, W8), its editable message (W6), the
 * note after switching its AND or OR, its members, a new rule's editor at their end, and "Add
 * rule" (U14 6094:6430, 6094:6337).
 */
export default function GroupListItem({ view, group, depth }: GroupListItemProps) {
  const { branch, state, dispatch } = view;
  const subGroup = depth > 0;
  const members: GroupFrameMember[] = group.items.map((member) => ({
    key: member.id,
    node: (
      <TreeItem
        view={view}
        item={member}
        level={group.items}
        parentId={group.id}
        depth={depth + 1}
      />
    ),
  }));
  const { editing } = state;
  // A new rule's editor ends its group's members
  if (
    editing &&
    !editing.original &&
    editing.branchKey === branch.key &&
    editing.parentId === group.id
  ) {
    members.push({ key: editing.draft.id, node: view.ruleEditor });
  }
  return (
    <GroupFrame
      group={group}
      subGroup={subGroup}
      id={ELEMENT_IDS.rule(branch.key, group.id)}
      flag={problemFlagOf(state, branch, group.id)}
      nameSlot={
        <ItemName
          item={group}
          branch={branch}
          size={subGroup ? 'sub-group' : 'group'}
          renaming={state.renaming?.branchKey === branch.key && state.renaming.itemId === group.id}
          dispatch={dispatch}
        />
      }
      actions={
        <GroupMenu
          groupName={group.name}
          hasMessage={group.message !== null}
          onAddMessage={() => view.onAddGroupMessage(group.id)}
          onRemoveMessage={() =>
            dispatch({
              type: 'setGroupMessage',
              branchKey: branch.key,
              groupId: group.id,
              message: null,
            })
          }
          onRename={() =>
            dispatch({ type: 'startRename', branchKey: branch.key, itemId: group.id })
          }
          onUngroup={() => view.onUngroup(group.id)}
          onDelete={() =>
            dispatch({ type: 'askDeleteGroup', branchKey: branch.key, groupId: group.id })
          }
        />
      }
      messageField={{
        id: ELEMENT_IDS.groupMessage(branch.key, group.id),
        onChange: (message) =>
          dispatch({ type: 'setGroupMessage', branchKey: branch.key, groupId: group.id, message }),
      }}
      note={<SwitchNote text={switchNoteOf(state, branch, group.id)} />}
      members={members}
      onSwitchOperator={(operator) =>
        dispatch({ type: 'switchOperator', branchKey: branch.key, parentId: group.id, operator })
      }
      footer={
        <AddRuleButton
          id={ELEMENT_IDS.addRule(branch.key, group.id)}
          onAddRule={() => view.onAddRule(group.id)}
        />
      }
    />
  );
}
