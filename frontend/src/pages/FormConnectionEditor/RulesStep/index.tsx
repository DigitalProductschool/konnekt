import { namesOf, noteOf } from '@connection-portal/rules/checks/findingMessages';
import type { Language } from '@connection-portal/rules/language';
import { groupIdOf, ruleIdOf, shownItems } from '@connection-portal/rules/tree';
import type { RuleContext } from '@connection-portal/rules/types';
import { unrequestedRules } from '@connection-portal/rules/validation';
import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';

import type { BranchFindings } from '../../../components/BranchName/types';
import Connector from '../../../components/Connector';
import ExampleBanner from '../../../components/ExampleBanner';
import FeedbackLoader from '../../../components/FeedbackLoader';
import type { ShownFinding } from '../../../components/FindingNote/types';
import { useLanguage } from '../../../hooks/useLanguage';
import { ELEMENT_IDS } from '../constants';
import type { ExampleStepProps } from '../types';
import { rulesExampleBannerOf } from '../utils';
import AddRuleButton from './AddRuleButton';
import BranchTabs from './BranchTabs';
import {
  EDITOR_WRAP_CLASSES,
  FIRST_RULE_SPACING,
  PINNED_TABS_CLASSES,
  PINNED_TOP_CLASSES,
  RULES_STEP_COPY,
  SELECTION_SCROLL_MARGIN,
  TABS_HEIGHT_PROPERTY,
  TABS_SCROLL_MARGIN,
} from './constants';
import FindingsBanner from './FindingsBanner';
import LinkNotice from './LinkNotice';
import LinkStrip from './LinkStrip';
import RuleEditor from './RuleEditor';
import RulesEmptyState from './RulesEmptyState';
import SelectionBar from './SelectionBar';
import SwitchNote from './SwitchNote';
import TreeItem from './TreeItem';
import type {
  RulesCatalog,
  RulesState,
  RulesStepProps,
  RulesTreeView,
  UnrequestedRule,
} from './types';
import UnrequestedBanner from './UnrequestedBanner';
import { branchOf, editorMessageHintOf, focusSoon, groupOf, linkOf, switchNoteOf } from './utils';

/**
 * Keeps the pinned tab row's height in `--rules-tabs-height` on the step's root (constants.ts),
 * measured, because the row wraps with many variants or at narrow widths, and 0 where the row
 * isn't pinned (`wizard-pinned:`, which follows the window's size). A custom property only carries
 * the measurement: the styles that use it are classes. The tab row is there once the step has
 * loaded (`status`).
 */
function usePinnedTabsHeight(
  rootRef: RefObject<HTMLDivElement | null>,
  tabsRef: RefObject<HTMLDivElement | null>,
  status: RulesStepProps['status']
) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const tabs = tabsRef.current;
    if (!root || !tabs) {
      return;
    }
    function update() {
      if (!root || !tabs) {
        return;
      }
      const pinned = getComputedStyle(tabs).position === 'sticky';
      const height = pinned ? Math.ceil(tabs.getBoundingClientRect().height) : 0;
      root.style.setProperty(TABS_HEIGHT_PROPERTY, `${height}px`);
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(tabs);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [rootRef, tabsRef, status]);
}

/**
 * The rules that check data no longer requested, in every branch, as the banner names them (F11,
 * F58, FR-023c): the field's sentence, or, when the whole document is no longer requested, the
 * document's (U50 7173:52333); with their branch's key for the tab's icon.
 */
function unrequestedOf(
  branches: RulesState['branches'],
  catalog: RulesCatalog,
  language: Language
): { branchKey: string; entry: UnrequestedRule }[] {
  const copy = RULES_STEP_COPY[language];
  return unrequestedRules(branches, catalog.documents).map(({ branchIndex, rule }) => {
    const branch = branches[branchIndex];
    const documentType = rule.target?.document_type;
    const requested = catalog.documents.some((document) => document.key === documentType);
    const label = requested
      ? undefined
      : catalog.allDocuments.find((document) => document.key === documentType)?.label;
    const name = rule.name.trim();
    const branchName = branch.name.trim();
    const text =
      label === undefined
        ? copy.unrequestedText(name, branchName)
        : copy.unrequestedDocumentText(name, branchName, label.trim());
    return { branchKey: branch.key, entry: { key: `${branch.key}-${rule.id}`, text } };
  });
}

/**
 * The tab icon of a branch with rules on data no longer requested (U50 7375:101551; FR-041a): the
 * red `error` kind, which wins over its findings' icon (error > warning > info, T026's carried
 * order), with the banner's sentences in its tooltip.
 */
function tabProblemsOf(
  unrequested: { branchKey: string; entry: UnrequestedRule }[]
): Record<string, BranchFindings> {
  const problems: Record<string, BranchFindings> = {};
  for (const { branchKey, entry } of unrequested) {
    const before = problems[branchKey]?.text;
    problems[branchKey] = { kind: 'error', text: before ? `${before} ${entry.text}` : entry.text };
  }
  return problems;
}

/**
 * The Rules step (S9; spec 002's S2, S4; Figma U29, U43, U01 #17–#19): under the step header
 * "Set eligibility rules for citizens" (the page's, `pageTitleOf`), the variant tabs with
 * "+ Add variant" from the start of the step (F26), pinned with the step header while the page
 * scrolls (U01 #18), then the rules card: "No rules yet" with "Add rule" (U29 6504:43841), or the
 * open branch's rules and groups in the order of adding, joined by their level's AND or OR, which
 * a connector switches for the whole level (FR-007), each with its ⋯ menu, and "Add rule"
 * (U43 6168:7014). Groups and sub-groups hold their members the same way (FR-008); "Group with
 * other rules" starts select mode (U16), which shifts the list for the boxes and puts the
 * selection bar at the top of the card, pinned under the tabs once the card's top scrolls past
 * (U01 #19). The rule editor opens in the rule's place, or at the end of a new rule's level. A
 * variant based on Standard opens with the link strip, and marks what it changed, removed or
 * added (FR-023, W4); a group dissolved there shows as removed after its remaining member (F13).
 * A rule that checks data no longer requested is named in a banner with "Add it in Documents",
 * flagged, and puts the red icon on its variant's tab (F11, F58; U50); a refused Publish or Save
 * shows the server's message above the card. Identifiers aren't shown here (F35,
 * FR-010). The rule checks of spec 003 outline each rule and group of the open branch that has a
 * finding, with its note (S2; FR-012; F4, F5, F6; Figma U01 6171:6749, U02 6171:7064), and the
 * findings banner sums them up above its rules, after the problems banner, with links to them
 * (FR-013; A1, A2); they update in place after every change (W1), refuse nothing (F8; FR-016),
 * and the rule editor shows nothing about them (S3; W15). A stored draft's and a published
 * connection's ⋯ menus offer "Copy link" (spec 007, S4; FR-028), and a link to what no longer
 * exists shows its notice at the top of the step until it is dismissed (S5; FR-031). "Test
 * rules" is the footer's (EditorFooter), unusable while a rule is open or rules are grouped
 * (F65, W21, FR-034). While the loaded draft is the example, `ExampleBanner` stands above the tabs,
 * 16px from them (spec 010, S9/S11; FR-058; U18 1i 7344:96387, 1i-c 7344:96442): Standard's
 * sentence on the main branch, the variant's on the example's variant, none on another variant
 * (`rulesExampleBannerOf()`); it scrolls away under the pinned tabs, as the link notice does.
 */
export default function RulesStep({
  status,
  onRetry,
  state,
  catalog,
  checks,
  editing,
  connectionId,
  linkNotice,
  onDismissLinkNotice,
  dispatch,
  onAddRule,
  onEditRule,
  onAddData,
  onSaveRule,
  onCancelEditor,
  isExample = false,
}: RulesStepProps & ExampleStepProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  usePinnedTabsHeight(rootRef, tabsRef, status);
  const { language } = useLanguage();
  const copy = RULES_STEP_COPY[language];
  // Statements read from the whole catalog, so that a rule on data no longer requested reads; a
  // switch of the language rebuilds it, and every statement follows (spec 009, R4)
  const context = useMemo<RuleContext>(
    () => ({ documents: catalog.allDocuments, optionSets: catalog.optionSets, language }),
    [catalog.allDocuments, catalog.optionSets, language]
  );
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
    return <FeedbackLoader label={copy.loading} />;
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-start gap-16">
        <KernAlert variant="danger" title={copy.loadErrorTitle} className="w-full">
          {copy.loadErrorText}
        </KernAlert>
        <button type="button" onClick={onRetry} className="kern-btn kern-btn--secondary">
          <span className="kern-label">{copy.retry}</span>
        </button>
      </div>
    );
  }

  const branch = branchOf(state, state.openBranch) ?? state.branches[0];
  const based = branch.origin === 'based';
  const shown = shownItems(branch.items, based);
  const unrequested = unrequestedOf(state.branches, catalog, language);
  const tabProblems = tabProblemsOf(unrequested);
  const exampleBanner = isExample ? rulesExampleBannerOf(branch, language) : null;
  const editor = state.editing?.branchKey === branch.key ? state.editing : null;
  const { items } = branch;
  const addingAtTop = editor !== null && editor.original === null && editor.parentId === null;
  const selection = state.selection?.branchKey === branch.key ? state.selection : null;
  const { problem } = state;
  // Each finding's note names the items by their current names, so a rename shows at once
  // (FR-011)
  const names = namesOf(items);
  const findings = new Map<string, ShownFinding>(
    (checks[branch.key]?.findings ?? []).map((finding) => [
      finding.itemId,
      { kind: finding.kind, text: noteOf(finding, names, language) },
    ])
  );

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

  /**
   * "Copy link" (S4; FR-028): writes the link of the variant, or of its rule or group, to the
   * clipboard, and the toast says whether it worked. Without a secure context there is no
   * clipboard, which fails as a refused permission does.
   */
  function copyLink(variantId: string, itemId?: string) {
    if (connectionId === null) {
      return;
    }
    const link = linkOf(window.location.origin, connectionId, variantId, itemId);
    void Promise.resolve()
      .then(() => navigator.clipboard.writeText(link))
      .then(
        () => dispatch({ type: 'showToast', message: copy.linkCopied }),
        () => dispatch({ type: 'showToast', message: copy.linkNotCopied })
      );
  }

  /** "Dismiss": the notice goes, and the focus moves to the open variant's tab. */
  function dismissLinkNotice() {
    thenFocus(onDismissLinkNotice, ELEMENT_IDS.branchTab(branch.key));
  }

  const ruleEditor = editor && (
    <div ref={editorRef} className={EDITOR_WRAP_CLASSES}>
      <RuleEditor
        draft={editor.draft}
        isNew={editor.original === null}
        branchName={branch.name}
        catalog={catalog}
        onChange={(draft) => dispatch({ type: 'changeDraft', draft })}
        onSave={onSaveRule}
        onCancel={onCancelEditor}
        onAddData={onAddData}
        messageHint={editorMessageHintOf(branch.items, editor, language)}
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
    findings,
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
        () => dispatch({ type: 'ungroup', branchKey: branch.key, groupId, language }),
        first ? ELEMENT_IDS.rule(branch.key, first.id) : ''
      );
    },
    // "Add message" opens the group's message field; on a group that has one already ("Remove
    // message" next to it, FR-036) it only moves the focus there, keeping the message
    onAddGroupMessage: (groupId) => {
      const fieldId = ELEMENT_IDS.groupMessage(branch.key, groupId);
      if (groupOf(branch, groupId)?.message === null) {
        thenFocus(
          () => dispatch({ type: 'setGroupMessage', branchKey: branch.key, groupId, message: '' }),
          fieldId
        );
        return;
      }
      const field = document.getElementById(fieldId);
      if (field instanceof HTMLTextAreaElement) {
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
      }
    },
    onCopyRule: (ruleId) => dispatch({ type: 'askCopyRule', branchKey: branch.key, ruleId }),
    onRemove: (itemId) =>
      keepFocus(() => dispatch({ type: 'removeItem', branchKey: branch.key, itemId }), itemId),
    onRestore: (itemId) =>
      keepFocus(() => dispatch({ type: 'restoreItem', branchKey: branch.key, itemId }), itemId),
    onReset: (itemId) =>
      keepFocus(() => dispatch({ type: 'resetItem', branchKey: branch.key, itemId }), itemId),
    onCopyLink: connectionId === null ? null : (itemId) => copyLink(branch.key, itemId),
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
      () => dispatch({ type: 'groupSelected', language }),
      ELEMENT_IDS.rule(branch.key, groupIdOf(state.counters.group))
    );
  }

  // The first rule of the list keeps 16px under it before the first connector (U43 6168:7017)
  const firstRuleSpaced = shown[0]?.item.type === 'rule' && (shown.length > 1 || addingAtTop);

  return (
    <div ref={rootRef} className={`flex flex-col gap-16 ${PINNED_TOP_CLASSES.root}`}>
      {linkNotice && <LinkNotice kind={linkNotice} onDismiss={dismissLinkNotice} />}
      {exampleBanner !== null && <ExampleBanner text={exampleBanner} />}
      {/* Pinned with the step header while the page scrolls (U01 #18) */}
      <div ref={tabsRef} className={PINNED_TABS_CLASSES}>
        <BranchTabs
          state={state}
          checks={checks}
          dispatch={dispatch}
          onCopyLink={connectionId === null ? null : (branchKey) => copyLink(branchKey)}
          problems={tabProblems}
        />
      </div>
      {problem && (
        <KernAlert
          id={ELEMENT_IDS.rulesProblem}
          tabIndex={-1}
          variant="danger"
          title={editing ? copy.refusedSaveTitle : copy.refusedPublishTitle}
          className={`w-full ${TABS_SCROLL_MARGIN}`}
        >
          {problem.message}
        </KernAlert>
      )}
      {/* Positioned, so that select mode's boxes line up 16px from its left edge. An element that
          gets the focus scrolls clear of the pinned tabs, and in select mode of the pinned
          selection bar too (WCAG 2.4.11), which pins under the tabs (U01 #19) */}
      <section
        id={ELEMENT_IDS.branchPanel(branch.key)}
        role="tabpanel"
        aria-labelledby={ELEMENT_IDS.branchTab(branch.key)}
        className={`rounded-kern-large bg-kern-layout-background-default relative border border-(--kern-color-decorative-border-default) ${PINNED_TOP_CLASSES.card} ${selection ? SELECTION_SCROLL_MARGIN : TABS_SCROLL_MARGIN}`}
      >
        {based && <LinkStrip branch={branch} mainName={state.branches[0].name} />}
        {selection && (
          <SelectionBar
            selection={selection}
            branch={branch}
            mainName={state.branches[0].name}
            onCancel={cancelSelect}
            onGroup={groupSelected}
          />
        )}
        {unrequested.length > 0 && (
          <UnrequestedBanner rules={unrequested.map(({ entry }) => entry)} onAddData={onAddData} />
        )}
        <FindingsBanner
          check={checks[branch.key] ?? null}
          branch={branch}
          names={names}
          expanded={state.expandedFindings.includes(branch.key)}
          dispatch={dispatch}
          plainItemId={editor && editor.original !== null ? editor.draft.id : null}
        />
        <SwitchNote text={switchNoteOf(state, branch, null, language)} topLevel />
        {items.length === 0 && !editor ? (
          <RulesEmptyState
            addRuleId={ELEMENT_IDS.addRule(branch.key)}
            onAddRule={() => onAddRule(branch.key, null)}
          />
        ) : (
          <>
            <ul className={selection ? 'pl-40' : undefined}>
              {shown.map(({ item, dissolved }, index) => (
                <li
                  key={item.id}
                  className={index === 0 && firstRuleSpaced ? FIRST_RULE_SPACING : undefined}
                >
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
