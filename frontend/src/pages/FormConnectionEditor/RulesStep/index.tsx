import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

import Connector from '../../../components/Connector';
import FeedbackLoader from '../../../components/FeedbackLoader';
import type { RuleItem } from '../../../types/form-connections';
import { RULES_MESSAGES } from '../../../utils/rules/constants';
import { ruleIdOf } from '../../../utils/rules/tree';
import type { RuleContext } from '../../../utils/rules/types';
import { checksUnrequestedData, unrequestedRules } from '../../../utils/rules/validation';
import { ELEMENT_IDS } from '../constants';
import AddRuleButton from './AddRuleButton';
import { RULES_COPY } from './constants';
import RuleEditor from './RuleEditor';
import RuleListItem from './RuleListItem';
import RulesEmptyState from './RulesEmptyState';
import type { RulesStepProps } from './types';
import UnrequestedBanner from './UnrequestedBanner';
import { branchOf, focusSoon } from './utils';

/**
 * The Rules step (S2; Figma U11, U14, U21, U29): the open branch's rules in the order of
 * adding, joined by their AND, each with its ⋯ menu, and "Add rule". The rule editor opens in
 * the rule's place, or after the list for a new rule. A rule that checks data no longer
 * requested is named in a banner and flagged (F11); a refused Publish or Save shows the
 * server's message above the card. Identifiers aren't shown here (FR-010).
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
  const lastEdited = useRef<{ id: string; branchKey: string } | null>(null);

  // An opened editor takes the focus, so that keyboard users continue in it; a closed one
  // gives it to its rule, or to "Add rule" when the rule wasn't kept
  useEffect(() => {
    if (editedId && editedBranch) {
      lastEdited.current = { id: editedId, branchKey: editedBranch };
      requestAnimationFrame(() =>
        editorRef.current?.querySelector<HTMLElement>('button, input, select')?.focus()
      );
    } else if (lastEdited.current) {
      const { id, branchKey } = lastEdited.current;
      lastEdited.current = null;
      focusSoon(ELEMENT_IDS.rule(branchKey, id), ELEMENT_IDS.addRule(branchKey));
    }
  }, [editedId, editedBranch]);

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
  // Statements read from the whole catalog, so that a rule on data no longer requested reads
  const context: RuleContext = { documents: catalog.allDocuments, optionSets: catalog.optionSets };
  const unrequested = unrequestedRules(state.branches, catalog.documents).map(
    ({ branchIndex, rule }) => ({ rule, branchName: state.branches[branchIndex].name })
  );
  const editor = state.editing?.branchKey === branch.key ? state.editing : null;
  // This step adds rules only: groups come with their own frame
  const rules = branch.items.filter((item): item is RuleItem => item.type === 'rule');
  const addingNew = editor !== null && editor.original === null;
  const { problem } = state;
  const problemBranch =
    problem?.branchIndex === null || problem === null
      ? null
      : state.branches[problem.branchIndex]?.key;

  function flagOf(rule: RuleItem): string | null {
    if (problem?.itemId === rule.id && problemBranch === branch.key) {
      return problem.message;
    }
    return checksUnrequestedData(rule, catalog.documents)
      ? RULES_MESSAGES.notRequested(rule.name.trim(), branch.name.trim())
      : null;
  }

  function duplicate(ruleId: string) {
    const newId = ruleIdOf(state.counters.rule);
    flushSync(() => dispatch({ type: 'duplicateRule', branchKey: branch.key, ruleId }));
    document.getElementById(ELEMENT_IDS.rule(branch.key, newId))?.focus();
  }

  const ruleEditor = editor && (
    <div ref={editorRef} className={rules.length === 0 ? 'p-16' : 'px-16 py-8'}>
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

  return (
    <div className="flex flex-col gap-16">
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
      <section
        aria-label={branch.name}
        className="rounded-kern-large bg-kern-layout-background-default border border-(--kern-color-decorative-border-default)"
      >
        {unrequested.length > 0 && <UnrequestedBanner rules={unrequested} />}
        {rules.length === 0 && !editor ? (
          <RulesEmptyState
            addRuleId={ELEMENT_IDS.addRule(branch.key)}
            onAddRule={() => onAddRule(branch.key)}
          />
        ) : (
          <>
            <ul>
              {rules.map((rule, index) => (
                <li key={rule.id}>
                  {index > 0 && <Connector operator={branch.operator} />}
                  {editor?.original?.id === rule.id ? (
                    ruleEditor
                  ) : (
                    <RuleListItem
                      rule={rule}
                      branch={branch}
                      context={context}
                      elementId={ELEMENT_IDS.rule(branch.key, rule.id)}
                      flag={flagOf(rule)}
                      renaming={
                        state.renaming?.branchKey === branch.key &&
                        state.renaming.itemId === rule.id
                      }
                      dispatch={dispatch}
                      onEdit={() => onEditRule(branch.key, rule.id)}
                      onDuplicate={() => duplicate(rule.id)}
                    />
                  )}
                </li>
              ))}
              {addingNew && (
                <li>
                  {rules.length > 0 && <Connector operator={branch.operator} />}
                  {ruleEditor}
                </li>
              )}
            </ul>
            {rules.length > 0 && (
              <AddRuleButton
                id={ELEMENT_IDS.addRule(branch.key)}
                onAddRule={() => onAddRule(branch.key)}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
