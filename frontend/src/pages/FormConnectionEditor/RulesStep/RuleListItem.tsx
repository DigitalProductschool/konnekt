import RuleRow from '../../../components/RuleRow';
import RuleMenu from './RuleMenu';
import RuleName from './RuleName';
import type { RuleListItemProps } from './types';

/** A saved rule in the Rules step (S2): the shared row, its name and its ⋯ menu. */
export default function RuleListItem({
  rule,
  branch,
  context,
  elementId,
  flag,
  renaming,
  dispatch,
  onEdit,
  onDuplicate,
}: RuleListItemProps) {
  return (
    <RuleRow
      id={elementId}
      rule={rule}
      context={context}
      flag={flag}
      nameSlot={<RuleName rule={rule} branch={branch} renaming={renaming} dispatch={dispatch} />}
      actions={
        <RuleMenu
          ruleName={rule.name}
          onEdit={onEdit}
          onRename={() => dispatch({ type: 'startRename', branchKey: branch.key, itemId: rule.id })}
          onDuplicate={onDuplicate}
          onDelete={() => dispatch({ type: 'askDelete', branchKey: branch.key, ruleId: rule.id })}
        />
      }
    />
  );
}
