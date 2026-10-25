import { useRef } from 'react';

import RuleRow from '../../../components/RuleRow';
import CopyPopover from './CopyPopover';
import ItemName from './ItemName';
import RuleMenu from './RuleMenu';
import type { RuleListItemProps } from './types';
import { standingOf } from './utils';

/**
 * A saved rule in the Rules step (S2, S4): the shared row, its name and its ⋯ menu, with "Copy to
 * variant" under it (U20), and in a based variant its mark (FR-023). A removed rule keeps its
 * name, and only offers "Restore rule"; in a removed or dissolved group, a rule is faded with it
 * and has no menu.
 */
export default function RuleListItem({
  rule,
  view,
  elementId,
  flag,
  canGroup,
  faded,
}: RuleListItemProps) {
  const { branch, state, dispatch } = view;
  const standing = standingOf(branch, rule);
  const main = state.branches[0];
  const renaming = state.renaming?.branchKey === branch.key && state.renaming.itemId === rule.id;
  const { dialog } = state;
  const copying =
    dialog?.type === 'copyRule' && dialog.branchKey === branch.key && dialog.ruleId === rule.id;
  const actionsRef = useRef<HTMLDivElement>(null);

  /** Closes "Copy to variant" with the focus back on the rule's ⋯. */
  function closeCopy(targets?: string[]) {
    dispatch(targets ? { type: 'copyRule', targets } : { type: 'closeDialog' });
    actionsRef.current?.querySelector<HTMLElement>('[aria-haspopup=menu]')?.focus();
  }
  return (
    <RuleRow
      id={elementId}
      rule={rule}
      context={view.context}
      flag={flag}
      mark={view.based ? rule.mark : null}
      faded={faded}
      nameSlot={
        faded || standing === 'removed' ? undefined : (
          <ItemName
            item={rule}
            branch={branch}
            branches={state.branches}
            size="rule"
            renaming={renaming}
            dispatch={dispatch}
          />
        )
      }
      actions={
        faded ? undefined : (
          <div ref={actionsRef} className="relative">
            <RuleMenu
              ruleName={rule.name}
              standing={standing}
              canGroup={canGroup}
              canCopy={state.branches.length > 1}
              canReset={view.based && rule.mark === 'changed'}
              mainName={main.name}
              onEdit={() => view.onEditRule(rule.id)}
              onRename={() =>
                dispatch({ type: 'startRename', branchKey: branch.key, itemId: rule.id })
              }
              onDuplicate={() => view.onDuplicateRule(rule.id)}
              onCopy={() => view.onCopyRule(rule.id)}
              onGroup={() => view.onStartSelect(rule.id)}
              onReset={() => view.onReset(rule.id)}
              onDelete={() =>
                standing === 'inherited'
                  ? view.onRemove(rule.id)
                  : dispatch({ type: 'askDelete', branchKey: branch.key, ruleId: rule.id })
              }
              onRestore={() => view.onRestore(rule.id)}
            />
            {copying && (
              <CopyPopover
                state={state}
                branchKey={branch.key}
                ruleName={rule.name}
                onCopy={closeCopy}
                onClose={closeCopy}
              />
            )}
          </div>
        )
      }
    />
  );
}
