import GroupFrame from '../../../components/GroupFrame';
import type { GroupFrameMember } from '../../../components/GroupFrame/types';
import { shownItems } from '../../../utils/rules/tree';
import { ELEMENT_IDS } from '../constants';
import AddRuleButton from './AddRuleButton';
import GroupMenu from './GroupMenu';
import ItemName from './ItemName';
import SwitchNote from './SwitchNote';
import TreeItem from './TreeItem';
import type { GroupListItemProps } from './types';
import { problemFlagOf, standingOf, switchNoteOf } from './utils';

/**
 * A group or sub-group in the Rules step (S2, S4; U14 6094:6411, 6094:6318; U16 6344:53610): the
 * shared frame with its inline name (F12), its ⋯ menu (W6, W8), its editable message (W6), the
 * note after switching its AND or OR, its members, a new rule's editor at their end, and "Add
 * rule" (U14 6094:6430, 6094:6337). In a based variant it shows its mark (FR-023); removed
 * there, or dissolved (F13), it is shown removed, read-only, with "Restore group" only, and what
 * it holds is faded with it (U23 6185:41164). A group with a finding of spec 003 is outlined,
 * with its note under its header (FR-012; F4, F6; U02 6171:7091, 6171:7093), unless it is
 * removed, dissolved or faded, which the checks leave out (FR-001).
 */
export default function GroupListItem({
  view,
  group,
  depth,
  dissolved,
  faded,
}: GroupListItemProps) {
  const { branch, state, dispatch } = view;
  const subGroup = depth > 0;
  const inactive = dissolved || group.mark === 'removed';
  // Nothing in a removed or dissolved group changes until it is restored (FR-024)
  const locked = inactive || faded;
  const members: GroupFrameMember[] = shownItems(group.items, view.based && !locked).map(
    (entry) => ({
      key: entry.item.id,
      node: (
        <TreeItem
          view={view}
          item={entry.item}
          level={group.items}
          parentId={group.id}
          depth={depth + 1}
          dissolved={entry.dissolved}
          faded={locked}
        />
      ),
    })
  );
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
  const standing = dissolved ? 'removed' : standingOf(branch, group);
  return (
    <GroupFrame
      group={group}
      subGroup={subGroup}
      id={ELEMENT_IDS.rule(branch.key, group.id)}
      flag={problemFlagOf(state, branch, group.id)}
      finding={locked ? null : (view.findings.get(group.id) ?? null)}
      mark={view.based ? group.mark : null}
      inactive={inactive}
      faded={faded}
      nameSlot={
        locked ? undefined : (
          <ItemName
            item={group}
            branch={branch}
            branches={state.branches}
            size={subGroup ? 'sub-group' : 'group'}
            renaming={
              state.renaming?.branchKey === branch.key && state.renaming.itemId === group.id
            }
            dispatch={dispatch}
          />
        )
      }
      actions={
        faded ? undefined : (
          <GroupMenu
            groupName={group.name}
            standing={standing}
            hasMessage={group.message !== null}
            canReset={view.based && group.mark === 'changed'}
            mainName={state.branches[0].name}
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
            onReset={() => view.onReset(group.id)}
            onDelete={() =>
              standing === 'inherited'
                ? view.onRemove(group.id)
                : dispatch({ type: 'askDeleteGroup', branchKey: branch.key, groupId: group.id })
            }
            onRestore={() => view.onRestore(group.id)}
          />
        )
      }
      messageField={
        locked
          ? undefined
          : {
              id: ELEMENT_IDS.groupMessage(branch.key, group.id),
              onChange: (message) =>
                dispatch({
                  type: 'setGroupMessage',
                  branchKey: branch.key,
                  groupId: group.id,
                  message,
                }),
            }
      }
      note={<SwitchNote text={switchNoteOf(state, branch, group.id)} />}
      members={members}
      onSwitchOperator={
        locked
          ? undefined
          : (operator) =>
              dispatch({
                type: 'switchOperator',
                branchKey: branch.key,
                parentId: group.id,
                operator,
              })
      }
      footer={
        locked ? undefined : (
          <AddRuleButton
            id={ELEMENT_IDS.addRule(branch.key, group.id)}
            onAddRule={() => view.onAddRule(group.id)}
          />
        )
      }
    />
  );
}
