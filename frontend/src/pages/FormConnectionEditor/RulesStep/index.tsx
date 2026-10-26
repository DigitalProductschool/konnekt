import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

import Connector from '../../../components/Connector';
import FeedbackLoader from '../../../components/FeedbackLoader';
import { groupIdOf, ruleIdOf, shownItems } from '../../../utils/rules/tree';
import type { RuleContext } from '../../../utils/rules/types';
import { unrequestedRules } from '../../../utils/rules/validation';
import { ELEMENT_IDS } from '../constants';
import AddRuleButton from './AddRuleButton';
import BranchTabs from './BranchTabs';
import { RULES_COPY } from './constants';
import LinkStrip from './LinkStrip';
import RuleEditor from './RuleEditor';
import RulesEmptyState from './RulesEmptyState';
import SelectionBar from './SelectionBar';
import SwitchNote from './SwitchNote';
import TreeItem from './TreeItem';
import type { RulesStepProps, RulesTreeView } from './types';
import UnrequestedBanner from './UnrequestedBanner';
import { branchOf, focusSoon, groupOf, switchNoteOf } from './utils';

/**
 * The Rules step (S2, S4; Figma U11, U14, U16, U17, U18, U21, U29): the variant tabs with "+ Add
 * variant" (F16), then the open branch's rules and groups in the order of adding, joined by
 * their level's AND or OR, which a connector switches for the whole level (FR-007), each with
 * its ⋯ menu, and "Add rule". Groups and sub-groups hold their members the same way (FR-008);
 * "Group with other rules" starts select mode (U16), which shifts the list for the boxes and
 * puts the selection bar at the top of the card. The rule editor opens in the rule's place, or
 * at the end of a new rule's level. A variant based on Standard opens with the link strip, and
 * marks what it changed, removed or added (FR-023, W4); a group dissolved there shows as removed
 * after its remaining member (F13). A rule that checks data no longer requested is named in a
 * banner and flagged (F11); a refused Publish or Save shows the server's message above the
 * card. Identifiers aren't shown here (FR-010).
 */
export default function RulesStep({
  status,
  onRetry,
  state,
  catalog,
  editing,
  dispatch,
  onAddRule,
  onEditRule,
  onAddData,
  onSaveRule,
  onCancelEditor,
}: RulesStepProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editedId = state.editing?.draft.id;
  const editedBranch = state.editing?.branchKey;
  const editedParent = state.editing?.parentId ?? null;
  const lastEdited = useRef<{ id: string; branchKey: string; parentId: string | null } | null>(
    null
  );

  // An opened editor takes the focus, so that keyboard users continue in it; a closed one
  // gives it to its rule, or to its level's "Add rule" when the rule wasn't kept. Only if the
  // focus went with the editor: a refused Publish has moved it to the rule it names (F11)
  useEffect(() => {
    if (editedId && editedBranch) {
      lastEdited.current = { id: editedId, branchKey: editedBranch, parentId: editedParent };
      requestAnimationFrame(() =>
        editorRef.current?.querySelector<HTMLElement>('button, input, select')?.focus()
      );
    } else if (lastEdited.current) {
      const { id, branchKey, parentId } = lastEdited.current;
      lastEdited.current = null;
      focusSoon(ELEMENT_IDS.rule(branchKey, id), ELEMENT_IDS.addRule(branchKey, parentId), true);
    }
  }, [editedId, editedBranch, editedParent]);

  if (status === 'loading') {
    return <FeedbackLoader label={RULES_COPY.loading} />;
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-start gap-16">
        <KernAlert variant="danger" title={RULES_COPY.loadErrorTitle} className="w-full">
          {RULES_COPY.loadErrorText}
        </KernAlert>
        <button type="button" onClick={onRetry} className="kern-btn kern-btn--secondary">
          <span className="kern-label">{RULES_COPY.retry}</span>
        </button>
      </div>
    );
  }

  const branch = branchOf(state, state.openBranch) ?? state.branches[0];
  const based = branch.origin === 'based';
  const shown = shownItems(branch.items, based);
  // Statements read from the whole catalog, so that a rule on data no longer requested reads
  const context: RuleContext = { documents: catalog.allDocuments, optionSets: catalog.optionSets };
  const unrequested = unrequestedRules(state.branches, catalog.documents).map(
    ({ branchIndex, rule }) => ({ rule, branchName: state.branches[branchIndex].name })
  );
  const editor = state.editing?.branchKey === branch.key ? state.editing : null;
  const { items } = branch;
  const addingAtTop = editor !== null && editor.original === null && editor.parentId === null;
  const selection = state.selection?.branchKey === branch.key ? state.selection : null;
  const { problem } = state;

  /** Runs an action that changes the list, then moves the focus to the element it names. */
  function thenFocus(action: () => void, id: string, fallbackId?: string) {
    flushSync(action);
    const element =
      document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
    element?.focus();
  }

  /**
   * Runs an action from an item's menu, and keeps the focus on its ⋯ if it is still there, or
   * else on the item: a removal can take the item into a dissolved group, which has no menus.
   */
  function keepFocus(action: () => void, itemId: string) {
    flushSync(action);
    if (document.activeElement === document.body || !document.activeElement) {
      document.getElementById(ELEMENT_IDS.rule(branch.key, itemId))?.focus();
    }
  }

  const ruleEditor = editor && (
    <div ref={editorRef} className={items.length === 0 ? 'p-16' : 'px-16 py-8'}>
      <RuleEditor
        draft={editor.draft}
        isNew={editor.original === null}
        branchName={branch.name}
        catalog={catalog}
        onChange={(draft) => dispatch({ type: 'changeDraft', draft })}
        onSave={onSaveRule}
        onCancel={onCancelEditor}
        onAddData={onAddData}
      />
    </div>
  );

  const view: RulesTreeView = {
    branch,
    based,
    state,
    context,
    documents: catalog.documents,
    ruleEditor,
    dispatch,
    onAddRule: (parentId) => onAddRule(branch.key, parentId),
    onEditRule: (ruleId) => onEditRule(branch.key, ruleId),
    onDuplicateRule: (ruleId) =>
      thenFocus(
        () => dispatch({ type: 'duplicateRule', branchKey: branch.key, ruleId }),
        ELEMENT_IDS.rule(branch.key, ruleIdOf(state.counters.rule))
      ),
    onStartSelect: (ruleId) =>
      thenFocus(
        () => dispatch({ type: 'startSelect', branchKey: branch.key, itemId: ruleId }),
        ELEMENT_IDS.selectBox(branch.key, ruleId)
      ),
    onUngroup: (groupId) => {
      const first = groupOf(branch, groupId)?.items[0];
      thenFocus(
        () => dispatch({ type: 'ungroup', branchKey: branch.key, groupId }),
        first ? ELEMENT_IDS.rule(branch.key, first.id) : ''
      );
    },
    onAddGroupMessage: (groupId) =>
      thenFocus(
        () => dispatch({ type: 'setGroupMessage', branchKey: branch.key, groupId, message: '' }),
        ELEMENT_IDS.groupMessage(branch.key, groupId)
      ),
    onCopyRule: (ruleId) => dispatch({ type: 'askCopyRule', branchKey: branch.key, ruleId }),
    onRemove: (itemId) =>
      keepFocus(() => dispatch({ type: 'removeItem', branchKey: branch.key, itemId }), itemId),
    onRestore: (itemId) =>
      keepFocus(() => dispatch({ type: 'restoreItem', branchKey: branch.key, itemId }), itemId),
    onReset: (itemId) =>
      keepFocus(() => dispatch({ type: 'resetItem', branchKey: branch.key, itemId }), itemId),
  };

  // Back to the first chosen rule, or to its level's "Add rule" once no rule is chosen
  function cancelSelect() {
    const origin = selection?.ids[0];
    thenFocus(
      () => dispatch({ type: 'cancelSelect' }),
      origin ? ELEMENT_IDS.rule(branch.key, origin) : '',
      ELEMENT_IDS.addRule(branch.key, selection?.parentId ?? null)
    );
  }

  function groupSelected() {
    thenFocus(
      () => dispatch({ type: 'groupSelected' }),
      ELEMENT_IDS.rule(branch.key, groupIdOf(state.counters.group))
    );
  }

  return (
    <div className="flex flex-col gap-16">
      <BranchTabs state={state} dispatch={dispatch} />
      {problem && (
        <KernAlert
          id={ELEMENT_IDS.rulesProblem}
          tabIndex={-1}
          variant="danger"
          title={editing ? RULES_COPY.refusedSaveTitle : RULES_COPY.refusedPublishTitle}
          className="w-full"
        >
          {problem.message}
        </KernAlert>
      )}
      {/* Positioned, so that select mode's boxes line up 16px from its left edge */}
      <section
        id={ELEMENT_IDS.branchPanel(branch.key)}
        role="tabpanel"
        aria-labelledby={ELEMENT_IDS.branchTab(branch.key)}
        className="rounded-kern-large bg-kern-layout-background-default relative border border-(--kern-color-decorative-border-default)"
      >
        {based && <LinkStrip mainName={state.branches[0].name} />}
        {selection && (
          <SelectionBar
            selection={selection}
            branch={branch}
            onCancel={cancelSelect}
            onGroup={groupSelected}
          />
        )}
        {unrequested.length > 0 && <UnrequestedBanner rules={unrequested} />}
        <SwitchNote text={switchNoteOf(state, branch, null)} topLevel />
        {items.length === 0 && !editor ? (
          <RulesEmptyState
            addRuleId={ELEMENT_IDS.addRule(branch.key)}
            onAddRule={() => onAddRule(branch.key, null)}
          />
        ) : (
          <>
            <ul className={selection ? 'pl-40' : undefined}>
              {shown.map(({ item, dissolved }, index) => (
                <li key={item.id}>
                  {index > 0 && (
                    <Connector
                      operator={branch.operator}
                      levelName={branch.name}
                      mark={index === 1 && based ? branch.operator_mark : null}
                      faded={dissolved || item.mark === 'removed'}
                      onSwitch={(operator) =>
                        dispatch({
                          type: 'switchOperator',
                          branchKey: branch.key,
                          parentId: null,
                          operator,
                        })
                      }
                    />
                  )}
                  <TreeItem
                    view={view}
                    item={item}
                    level={items}
                    parentId={null}
                    depth={0}
                    dissolved={dissolved}
                  />
                </li>
              ))}
              {addingAtTop && (
                <li>
                  {items.length > 0 && <Connector operator={branch.operator} />}
                  {ruleEditor}
                </li>
              )}
            </ul>
            {items.length > 0 && (
              <AddRuleButton
                id={ELEMENT_IDS.addRule(branch.key)}
                onAddRule={() => onAddRule(branch.key, null)}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
