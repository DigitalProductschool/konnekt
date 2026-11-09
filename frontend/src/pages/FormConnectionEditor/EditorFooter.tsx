import { useState } from 'react';
import { createPortal } from 'react-dom';

import ConfirmDialog from '../../components/ConfirmDialog';
import { ExplainedButton } from '../../components/InfoTooltip';
import { DISCARD_COPY } from '../FormConnectionEdit/constants';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import SaveAndExitButton from './SaveAndExitButton';
import type { EditorFooterProps } from './types';

/**
 * The actions of Figma "Shell/Footer" (U19 6699:45349, U17 6408:72735, U98 6731:39850; build
 * note U01 #20): on the left "Back" (not on step 1) and, 8px after it, "Save and exit" (a new
 * connection or a stored draft, S0, S1; FR-001) or "Discard changes" (the edit flow, FR-045,
 * where the editor passes `onDiscard`), both tertiary (cosmetic 17); "Discard changes" asks
 * "Discard your changes?" first (U100 7173:52772: "Keep editing" / "Discard changes", the filled
 * danger button; the scrim closes it, FR-052a), and `onDiscard` runs on its confirmation. It is
 * not the leave question's "Discard changes" (#47).
 *
 * On the right, a new connection's or a stored draft's flow has the step's one action: step 1
 * continues to the documents, the documents go on to the rules ("Set rules →", unusable with "Add
 * a document first" while no document is added, FR-031), the rules to the test step ("Test rules
 * →"), and the test step ends with "Publish →", which opens the publish dialog (spec 004, S2, S8;
 * U65 7057:58897). While no branch has any rule and no rule editor is open, the rules step offers
 * publishing "without rules", which skips the test step (FR-001; F10, F17; W2); the documents
 * step doesn't (FR-031, U25 #16, U28 #25).
 *
 * The edit flow of a published connection (S18; FR-045; U98 6731:39850, 7296:52389, 6730:39145,
 * U99 7114:49808) has "Save" (primary) on every step, which opens "Save changes?" from that step
 * (`onPublish`), after the next step outlined (cosmetic 17): "Choose documents →", "Set rules →"
 * or "Test rules →"; none on the test step, and none on the rules step without any rule, where
 * "Save" asks "Save without rules?". "Save" is unusable with "Add a document first" while no
 * document is added (the server refuses a connection without one), and on the rules step, as
 * "Test rules", first while a rule is open, rules are being grouped or the rules are in error
 * (CLAR #47 (b), #66).
 *
 * "Test rules" (and the edit flow's "Save" there) is unusable while a rule is open, rules are
 * being grouped or the rules are in error (the first problem in the server's words, CLAR #66),
 * and says why on hover and focus (FR-034, W21; T022's pattern); a click with other missing input
 * says what is missing (F11), and neither the personas nor their generation ever disable a button
 * (spec 004, FR-003, FR-013). Where the actions don't fit in one row (320px, 200 % zoom), the bar
 * wraps them (`WizardLayout`): the step's actions carry `ml-auto`, so that they stay on the right
 * in a row of their own, and every button keeps its label (005-ACC.4).
 */
export default function EditorFooter({
  step,
  editing,
  publishing,
  rulesNextAction,
  ruleOpen,
  grouping,
  rulesProblem = null,
  onBack,
  onAddRules,
  addRulesExplanation = null,
  onTestRules,
  onPublish,
  canSaveDraft,
  savingDraft,
  onSaveAndExit,
  onDiscard,
}: EditorFooterProps) {
  // "Discard your changes?" is open, or closed and fading out
  const [discardAsked, setDiscardAsked] = useState(false);
  const back = step !== 'connection' && (
    <button type="button" onClick={onBack} className="kern-btn kern-btn--tertiary">
      <span aria-hidden="true" className="kern-icon kern-icon--arrow-back" />
      <span className="kern-label">{EDITOR_COPY.back}</span>
    </button>
  );
  const saveAndExit = canSaveDraft && (
    <SaveAndExitButton savingDraft={savingDraft} onSaveAndExit={onSaveAndExit} />
  );
  const discard = onDiscard && (
    <>
      {/* U98 6731:39850: the "undo" glyph */}
      <button
        type="button"
        onClick={() => setDiscardAsked(true)}
        className="kern-btn kern-btn--tertiary"
      >
        <span aria-hidden="true" className="kern-icon icon-undo" />
        <span className="kern-label">{EDITOR_COPY.discardChanges}</span>
      </button>
      {/* In the body, not in the footer, whose 40px buttons (`.wizard-footer .kern-btn`) would
          shrink the dialog's 48px ones */}
      {createPortal(
        <ConfirmDialog
          open={discardAsked}
          title={DISCARD_COPY.title}
          text={DISCARD_COPY.text}
          cancelLabel={DISCARD_COPY.keepEditing}
          confirmLabel={DISCARD_COPY.discard}
          danger
          onCancel={() => setDiscardAsked(false)}
          onConfirm={onDiscard}
        />,
        document.body
      )}
    </>
  );
  const leading = (back || saveAndExit || discard) && (
    // Figma: Back and "Save and exit" (or "Discard changes") are 8px apart
    <div className="flex flex-wrap items-center gap-8">
      {back}
      {saveAndExit}
      {discard}
    </div>
  );
  const withoutRules = rulesNextAction === 'publishWithoutRules';
  // Why "Test rules" (and the edit flow's "Save" on the rules step) can't be used now (FR-034,
  // W21; CLAR #47 (b), #66): the open editor and grouping explain themselves first
  const rulesExplanation = ruleOpen
    ? EDITOR_COPY.saveRuleFirst
    : grouping
      ? EDITOR_COPY.finishGroupingFirst
      : rulesProblem;
  const testRules = (secondary: boolean) => (
    <ExplainedButton
      explanation={rulesExplanation}
      align="end"
      wrapperClassName={secondary ? '' : 'ml-auto'}
      onClick={onTestRules}
      className={`kern-btn ${secondary ? 'kern-btn--secondary' : 'kern-btn--primary'}`}
    >
      <span className="kern-label">{EDITOR_COPY.testRules}</span>
      <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
    </ExplainedButton>
  );
  if (editing) {
    return (
      <>
        {leading}
        {/* U98 6731:39850, 7296:52389, 6730:39145, U99 7114:49808: the next step outlined, then
            "Save", 8px apart, together at the right, also when the row wraps */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-8">
          {step === 'connection' && (
            <button type="submit" form={ELEMENT_IDS.form} className="kern-btn kern-btn--secondary">
              <span className="kern-label">{EDITOR_COPY.continue}</span>
              <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
            </button>
          )}
          {step === 'documents' && (
            <ExplainedButton
              explanation={addRulesExplanation}
              align="end"
              onClick={onAddRules}
              className="kern-btn kern-btn--secondary"
            >
              <span className="kern-label">{EDITOR_COPY.addRules}</span>
              <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
            </ExplainedButton>
          )}
          {/* Without any rule there is nothing to test: "Save" asks "Save without rules?" */}
          {step === 'rules' && !withoutRules && testRules(true)}
          <ExplainedButton
            explanation={(step === 'rules' ? rulesExplanation : null) ?? addRulesExplanation}
            align="end"
            onClick={publishing ? undefined : onPublish}
            className="kern-btn kern-btn--primary"
          >
            {/* No arrow: saving ends the flow (U99 7114:49808) */}
            <span className="kern-label">{EDITOR_COPY.save}</span>
          </ExplainedButton>
        </div>
      </>
    );
  }
  return (
    <>
      {leading}
      {step === 'connection' && (
        <button
          type="submit"
          form={ELEMENT_IDS.form}
          className="kern-btn kern-btn--primary ml-auto"
        >
          <span className="kern-label">{EDITOR_COPY.continue}</span>
          <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
        </button>
      )}
      {step === 'documents' && (
        <ExplainedButton
          explanation={addRulesExplanation}
          align="end"
          wrapperClassName="ml-auto"
          onClick={onAddRules}
          className="kern-btn kern-btn--primary"
        >
          <span className="kern-label">{EDITOR_COPY.addRules}</span>
          <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
        </ExplainedButton>
      )}
      {step === 'rules' &&
        (withoutRules ? (
          <button
            type="button"
            onClick={publishing ? undefined : onPublish}
            aria-disabled={publishing}
            className="kern-btn kern-btn--secondary ml-auto"
          >
            {/* U51 8.8 6198:12366: secondary, and no arrow, since publishing ends the wizard */}
            <span className="kern-label">{EDITOR_COPY.publishWithoutRules}</span>
          </button>
        ) : (
          testRules(false)
        ))}
      {step === 'test' && (
        <button
          type="button"
          onClick={publishing ? undefined : onPublish}
          aria-disabled={publishing}
          className="kern-btn kern-btn--primary ml-auto"
        >
          {/* U65 7057:58897, U74 7062:50960: "Publish →" (it opens the publish dialog) */}
          <span className="kern-label">{EDITOR_COPY.publish}</span>
          <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
        </button>
      )}
    </>
  );
}
