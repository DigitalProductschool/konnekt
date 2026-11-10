import { findItem, shownItems } from '@connection-portal/rules/tree';

import GroupFrame from '../../../components/GroupFrame';
import type { GroupFrameMember } from '../../../components/GroupFrame/types';
import { useLanguage } from '../../../hooks/useLanguage';
import { ELEMENT_IDS } from '../constants';
import AddRuleButton from './AddRuleButton';
import { RULES_STEP_COPY } from './constants';
import GroupMenu from './GroupMenu';
import ItemName from './ItemName';
import SwitchNote from './SwitchNote';
import TreeItem from './TreeItem';
import type { GroupListItemProps } from './types';
import { groupOf, menuEntriesOf, menuItemOf, problemFlagOf, switchNoteOf } from './utils';

/**
 * A group or sub-group in the Rules step (S2, S4; U14 6094:6411, 6094:6318; U16 6344:53610): the
 * shared frame with its inline name (F12), its ⋯ menu (W6, W8), its editable message (W6), the
 * note after switching its AND or OR (U34 6329:19219; FR-051 (32)), its members, a new rule's
 * editor at their end, and "Add rule" (U14 6094:6430, 6094:6337; U34 6094:6430, 6094:6337: kept,
 * as 002-FR-008 has it). While it, or the group around it, has a message of its own (U35
 * 6324:39410), its rules read "Not shown while this rule is in Group 01. Citizens see the group
 * message instead." in place of their own message, which stays in the data (F32, FR-037). In a
 * based variant it shows its mark (FR-023), "Changed here" also for its switched AND or OR
 * (U39 6163:5440); removed there, or dissolved (F13), it is shown removed, read-only, with
 * "Restore group" only, and what it holds is faded with it, changed members keeping their
 * "Changed here" (U47 6185:41167; F36, FR-040). The connector before a removed or dissolved
 * member fades (U47 6185:41620; FR-051 (39)). A group with a finding of spec 003 is outlined,
 * with its note under its header (FR-012; A4, A5; U02 6171:7091, 6171:7093; U06 6753:40525, U07
 * 6753:40862), unless it is removed, dissolved or faded, which the checks leave out (FR-001).
 */
export default function GroupListItem({
  view,
  group,
  depth,
  dissolved,
  faded,
}: GroupListItemProps) {
  const { branch, state, dispatch, onCopyLink: copyLink } = view;
  const { language } = useLanguage();
  const copy = RULES_STEP_COPY[language];
  const subGroup = depth > 0;
  const inactive = dissolved || group.mark === 'removed';
  // Nothing in a removed or dissolved group changes until it is restored (FR-024)
  const locked = inactive || faded;
  // While this group, or the group around it, has a message of its own, citizens read that one:
  // its rules say so in place of their message, which stays in the data (F32, FR-037)
  const parentId = subGroup ? (findItem(branch.items, group.id)?.parentId ?? null) : null;
  const parent = parentId === null ? null : groupOf(branch, parentId);
  const messageGroup =
    parent && parent.message !== null ? parent : group.message !== null ? group : null;
  const members: GroupFrameMember[] = shownItems(group.items, view.based && !locked).map(
    (entry) => ({
      key: entry.item.id,
      // The connector before a removed or dissolved member fades, as at the top level (U47
      // 6185:41620; FR-051 (39)); in a removed group, the frame fades them all
      faded: entry.dissolved || entry.item.mark === 'removed',
      node: (
        <TreeItem
          view={view}
          item={
            messageGroup && entry.item.type === 'rule'
              ? { ...entry.item, message: copy.notShownInGroup(messageGroup.name.trim()) }
              : entry.item
          }
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
  // What its ⋯ offers (FR-036; T055): a dissolved group counts as removed (F13)
  const menuItem = menuItemOf(state.branches, branch.key, group.id);
  const entries = menuItem
    ? menuEntriesOf(menuItem, {
        branchKind: branch.origin === 'main' ? 'standard' : 'variant',
        linkable: copyLink !== null,
      })
    : [];
  return (
    <GroupFrame
      group={group}
      subGroup={subGroup}
      id={ELEMENT_IDS.rule(branch.key, group.id)}
      flag={problemFlagOf(state, branch, group.id)}
      finding={locked ? null : (view.findings.get(group.id) ?? null)}
      // A group dissolved in its variant looks removed, without the tint of what it changed
      // there: its changes go with it (002-S4.17; U47 6185:41165 draws a removed group's own fill)
      mark={view.based ? (inactive ? 'removed' : group.mark) : null}
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
            subGroup={subGroup}
            entries={entries}
            branchName={branch.name.trim()}
            mainName={state.branches[0].name}
            handlers={{
              rename: () =>
                dispatch({ type: 'startRename', branchKey: branch.key, itemId: group.id }),
              addMessage: () => view.onAddGroupMessage(group.id),
              removeMessage: () =>
                dispatch({
                  type: 'setGroupMessage',
                  branchKey: branch.key,
                  groupId: group.id,
                  message: null,
                }),
              ungroup: () => view.onUngroup(group.id),
              reset: () => view.onReset(group.id),
              restore: () => view.onRestore(group.id),
              copyLink: () => copyLink?.(group.id),
              remove: () => view.onRemove(group.id),
              delete: () =>
                dispatch({ type: 'askDeleteGroup', branchKey: branch.key, groupId: group.id }),
            }}
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
      note={<SwitchNote text={switchNoteOf(state, branch, group.id, language)} />}
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
