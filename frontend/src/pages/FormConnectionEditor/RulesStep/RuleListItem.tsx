import RuleRow from '../../../components/RuleRow';
import ItemName from './ItemName';
import RuleMenu from './RuleMenu';
import type { RuleListItemProps } from './types';

/** A saved rule in the Rules step (S2): the shared row, its name and its ⋯ menu. */
export default function RuleListItem({
  rule,
  branch,
  context,
  elementId,
  flag,
  renaming,
  canGroup,
  dispatch,
  onEdit,
  onDuplicate,
  onGroup,
}: RuleListItemProps) {
  return (
    <RuleRow
      id={elementId}
      rule={rule}
      context={context}
      flag={flag}
      nameSlot={
        <ItemName item={rule} branch={branch} size="rule" renaming={renaming} dispatch={dispatch} />
      }
      actions={
        <RuleMenu
          ruleName={rule.name}
          canGroup={canGroup}
          onEdit={onEdit}
          onRename={() => dispatch({ type: 'startRename', branchKey: branch.key, itemId: rule.id })}
          onDuplicate={onDuplicate}
          onGroup={onGroup}
          onDelete={() => dispatch({ type: 'askDelete', branchKey: branch.key, ruleId: rule.id })}
        />
      }
    />
  );
}
