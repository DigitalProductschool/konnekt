import type { Condition, RuleItem, RuleTarget } from '@konnekt/api-types/form-connections';
import {
  changeOperator,
  conditionProblem,
  operatorDefinition,
  resolveTarget,
  withTarget,
} from '@konnekt/rules/conditions';
import { LICENCE_CLASSES_SET } from '@konnekt/rules/constants';
import { todayInGermany } from '@konnekt/rules/dates';
import { ruleFieldLabel } from '@konnekt/rules/statements';
import type { RuleContext } from '@konnekt/rules/types';
import { ruleProblem } from '@konnekt/rules/validation';
import { useEffect, useId, useMemo, useReducer, useRef } from 'react';

import { useLanguage } from '../../../../hooks/useLanguage';
import ChoicePicker from './ChoicePicker';
import ConditionFields from './ConditionFields';
import { MENU_WIDTHS, RULE_EDITOR_COPY } from './constants';
import EditorActions from './EditorActions';
import EditorHints from './EditorHints';
import FieldError from './FieldError';
import MenuFooter from './MenuFooter';
import MessageField from './MessageField';
import NameRow from './NameRow';
import type { MenuKey, RuleEditorProps } from './types';
import {
  checkChoiceOf,
  checkSections,
  dataSections,
  documentChoice,
  documentKeyOf,
  documentSections,
  fieldProblemOf,
  hintsOf,
  initialRuleEditorState,
  isRuleComplete,
  missingControl,
  partKeyOf,
  partSections,
  ruleEditorReducer,
  targetOfPart,
  withProposal,
} from './utils';

/**
 * The rule editor (S10; Figma "Rule editor", U30 6348:40744, 6350:41176; U31 6350:41417), in the
 * rule's place in the list: white, a 1px action-blue border, radius 8, 16px 24px padding, its
 * parts 16px apart. The choice goes document → data → part → check → value, each unlocked in
 * order (FR-039, W19): after each choice the next menu opens. Only the requested documents and
 * fields are offered, images as "Not for rules". The checks are those of the target's kind, in
 * FR-003's words. The message is proposed once the condition is complete (C3), and follows it
 * until the team member writes their own (F9). The rule itself is the page's: every change goes
 * to `onChange`. "Save rule" on an incomplete rule explains in its tooltip what is missing (W21);
 * pressed, it says so under the check row,
 * flags the missing part red (FR-039) and moves the focus to it (WCAG 3.3.1); a rule on data
 * that is no longer requested says so there.
 */
export default function RuleEditor({
  draft,
  branchName,
  catalog,
  onChange,
  onSave,
  onCancel,
  onAddData,
  onRename,
  today,
  messageHint = null,
}: RuleEditorProps) {
  const { language } = useLanguage();
  const copy = RULE_EDITOR_COPY[language];
  // A switch of the language rebuilds it, so that the proposal, the explanations and the problems
  // follow (spec 009, R4)
  const context: RuleContext = useMemo(
    () => ({ documents: catalog.documents, optionSets: catalog.optionSets, language }),
    [catalog.documents, catalog.optionSets, language]
  );
  const [state, dispatch] = useReducer(
    ruleEditorReducer,
    { draft, context },
    initialRuleEditorState
  );
  const idBase = useId();
  const nameId = `${idBase}-name`;
  const errorId = `${idBase}-error`;
  const issueId = `${idBase}-issue`;
  const focusNext = useRef<string | null>(null);
  const proposedWith = useRef(context);
  const day = today ?? todayInGermany();

  // A value field takes the focus once its check is chosen, the missing part after "Save rule"
  useEffect(() => {
    if (focusNext.current) {
      document.getElementById(focusNext.current)?.focus();
      focusNext.current = null;
    }
  });

  const documentKey = documentKeyOf(draft, state);
  const ruleDocument = catalog.documents.find((entry) => entry.key === documentKey);
  const target = resolveTarget(draft.target, catalog.documents);
  // A rule on data no longer requested still shows what it checks, in red (F11)
  const shownTarget = target ?? resolveTarget(draft.target, catalog.allDocuments);
  const unrequested = draft.target !== null && target === null;
  const field = shownTarget?.field;
  const kind =
    target && !(target.part?.per_licence_class && !target.licenceClass) ? target.kind : null;
  const definition =
    draft.condition && kind ? operatorDefinition(draft.condition.operator, kind) : undefined;
  const optionSet = target?.optionSet
    ? (catalog.optionSets.find((set) => set.key === target.optionSet) ?? null)
    : null;
  const problem =
    draft.condition && definition
      ? fieldProblemOf(draft.condition, definition, optionSet, state.touched, language)
      : null;
  // A field made of parts has a hint before its part, which leaves no kind yet
  const hints =
    target && (kind || !target.part) ? hintsOf(target, draft.condition, day, language) : [];
  const dateOfBirth = target?.dateOfBirth ?? false;
  // What keeps the rule from being saved, in the server's words: "Save rule"'s explanation (W21)
  const complete = isRuleComplete(draft, branchName, context);
  const blocker = complete ? null : ruleProblem(draft, branchName, context);
  const missing = complete
    ? null
    : missingControl({
        document: documentKey,
        target: draft.target,
        unrequested,
        partMissing: field?.kind === 'parts' && kind === null,
        condition: draft.condition,
        conditionComplete:
          kind !== null &&
          conditionProblem(draft.condition, kind, optionSet?.options ?? null) === null,
        valuesInput: definition?.input === 'values',
        message: draft.message,
      });
  // What keeps the rule from being saved, once "Save rule" was pressed, or the unrequested data,
  // unless a value's own problem already says it
  const issue = !complete && !problem && (state.saveTried || unrequested) ? blocker : null;
  const describedIf = (control: string) => (issue && missing === control ? issueId : undefined);
  // The inline flag on the part that is missing, once "Save rule" said so (FR-039)
  const flagged = (control: string) => issue !== null && missing === control;

  /** Changes the rule; its message follows the condition until it was written (F9). */
  function change(next: RuleItem) {
    onChange(withProposal(next, context, state.messageEdited));
  }

  // A switch of the language proposes an untouched proposal anew in the new language, so that it
  // follows the switch, also once the catalog's labels in that language arrive; a written message
  // stays, and a message saved earlier shows as saved until the language or the condition changes
  // (spec 009, R10, V8; US1-AS2, US3-AS3, FR-007)
  useEffect(() => {
    if (proposedWith.current === context) {
      return;
    }
    proposedWith.current = context;
    if (state.messageEdited) {
      return;
    }
    const proposed = withProposal(draft, context, false);
    if (proposed.message !== draft.message) {
      onChange(proposed);
    }
    // Only when the language or the catalog changes: the condition's changes propose through
    // change()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  function open(menu: MenuKey) {
    dispatch({ type: 'openMenu', menu });
  }

  function chooseDocument(key: string) {
    dispatch({ type: 'chooseDocument', document: key });
    if (key !== draft.target?.document_type) {
      dispatch({ type: 'resetValues' });
      change(withTarget(draft, null, context.documents));
    }
    open('data');
  }

  function chooseTarget(next: RuleTarget, then: MenuKey | null) {
    const changed = withTarget(draft, next, context.documents);
    if (changed.condition !== draft.condition) {
      dispatch({ type: 'resetValues' });
    }
    change(changed);
    if (then) {
      open(then);
    } else {
      dispatch({ type: 'closeMenu' });
    }
  }

  function chooseData(key: string) {
    if (!documentKey) {
      return;
    }
    const chosen = ruleDocument?.fields.find((entry) => entry.key === key);
    chooseTarget(
      { document_type: documentKey, field: key, part: null, licence_class: null },
      chosen?.kind === 'parts' ? 'part' : 'check'
    );
  }

  function choosePart(key: string) {
    if (draft.target) {
      chooseTarget(targetOfPart(draft.target, key), 'check');
    }
  }

  function chooseCheck(operator: string) {
    const chosen = kind ? operatorDefinition(operator, kind) : undefined;
    if (!chosen) {
      return;
    }
    const before = definition?.input;
    if (before !== chosen.input) {
      dispatch({ type: 'resetValues' });
    }
    change({ ...draft, condition: changeOperator(draft.condition, chosen) });
    if (chosen.input === 'values') {
      open('values');
    } else {
      dispatch({ type: 'closeMenu' });
      focusNext.current = `${idBase}-value`;
    }
  }

  function changeCondition(condition: Condition) {
    change({ ...draft, condition });
  }

  function changeMessage(message: string) {
    // An emptied message follows the condition again
    dispatch({ type: 'editMessage', edited: message.trim() !== '' });
    onChange({ ...draft, message });
  }

  /**
   * "Save rule": saves a complete rule; on an incomplete one, whose button only explains (W21),
   * a press still says what is missing and moves the focus there once the editor shows it, after
   * the button has handled the press (002-S3.10, WCAG 3.3.1)
   */
  function save() {
    if (complete) {
      onSave();
    } else {
      dispatch({ type: 'touchAll' });
      if (missing) {
        focusNext.current = `${idBase}-${missing}`;
      }
    }
  }

  const classes = target?.optionSet === LICENCE_CLASSES_SET;

  return (
    <section
      aria-labelledby={nameId}
      className="rounded-kern-default border-kern-action-default bg-kern-layout-background-default relative flex flex-col gap-16 border px-24 py-16"
    >
      <NameRow id={nameId} name={draft.name} onRename={onRename} />
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-8">
          <ChoicePicker
            idBase={idBase}
            menu="document"
            label={copy.documentsMenu}
            placeholder={copy.chooseDocument}
            chosen={documentChoice(
              ruleDocument ??
                catalog.allDocuments.find((entry) => entry.key === draft.target?.document_type)
            )}
            sections={documentSections(catalog.documents)}
            width={MENU_WIDTHS.document}
            invalid={flagged('document')}
            describedBy={describedIf('document')}
            footer={<MenuFooter divided text={copy.documentsFooter} />}
            footerDivided
            state={state}
            dispatch={dispatch}
            onChoose={chooseDocument}
          />
          <ChoicePicker
            idBase={idBase}
            menu="data"
            label={copy.dataMenu}
            placeholder={copy.chooseData}
            chosen={field ? { key: field.key, label: ruleFieldLabel(field, language) } : null}
            disabled={!documentKey}
            invalid={unrequested || flagged('data')}
            describedBy={describedIf('data')}
            sections={dataSections(ruleDocument, language)}
            width={MENU_WIDTHS.data}
            searchPlaceholder={ruleDocument ? copy.searchDocument(ruleDocument.label) : undefined}
            footer={
              <MenuFooter
                text={copy.needOtherData}
                onAddData={() => {
                  dispatch({ type: 'closeMenu' });
                  onAddData();
                }}
              />
            }
            state={state}
            dispatch={dispatch}
            onChoose={chooseData}
          />
          {field?.kind === 'parts' && (
            <ChoicePicker
              idBase={idBase}
              menu="part"
              label={copy.partsMenu}
              placeholder={copy.choosePart}
              chosen={
                partSections(field, catalog.optionSets, language)[0].choices.find(
                  (choice) => choice.key === partKeyOf(draft.target)
                ) ?? null
              }
              sections={partSections(field, catalog.optionSets, language)}
              invalid={flagged('part')}
              describedBy={describedIf('part')}
              width={MENU_WIDTHS.part}
              searchPlaceholder={
                field.parts?.some((part) => part.per_licence_class) ? copy.searchClasses : undefined
              }
              state={state}
              dispatch={dispatch}
              onChoose={choosePart}
            />
          )}
          <ChoicePicker
            idBase={idBase}
            menu="check"
            label={copy.checksMenu}
            placeholder={copy.chooseCheck}
            chosen={checkChoiceOf(draft.condition, kind, dateOfBirth, language)}
            disabled={!kind}
            sections={kind ? checkSections(kind, dateOfBirth, language) : []}
            invalid={flagged('check')}
            describedBy={describedIf('check')}
            width={kind === 'text' ? MENU_WIDTHS.textCheck : MENU_WIDTHS.check}
            state={state}
            dispatch={dispatch}
            onChoose={chooseCheck}
          />
          {draft.condition && definition && (
            <ConditionFields
              idBase={idBase}
              definition={definition}
              condition={draft.condition}
              dateOfBirth={dateOfBirth}
              optionSet={optionSet}
              classes={classes}
              errorId={problem ? errorId : undefined}
              problemField={problem?.field ?? null}
              state={state}
              dispatch={dispatch}
              onChange={changeCondition}
            />
          )}
        </div>
        {problem && <FieldError id={errorId} message={problem.message} />}
        {issue && <FieldError id={issueId} message={issue} alert />}
      </div>
      {/* The empty hints row keeps its 24px, except under a field error (U49 6196:10243) */}
      {(hints.length > 0 || (!problem && !issue)) && <EditorHints hints={hints} />}
      <MessageField
        id={`${idBase}-message`}
        message={draft.message}
        errorId={describedIf('message')}
        onChange={changeMessage}
      />
      {messageHint && <EditorHints hints={[messageHint]} />}
      <EditorActions explanation={blocker} onCancel={onCancel} onSave={save} />
    </section>
  );
}
