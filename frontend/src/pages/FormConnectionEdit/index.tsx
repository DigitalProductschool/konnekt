import { useCallback, useEffect, useReducer, useState } from 'react';
import { generatePath, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { formatChangedAt } from '../../components/LocalDraftsOffer/utils';
import { ROUTES } from '../../constants';
import { useFormConnection } from '../../hooks/useFormConnection';
import { useLocalDraftStore } from '../../hooks/useLocalDraftStore';
import { displayNameOf } from '../../utils/localDrafts/content';
import { flowKeyOfDraft } from '../../utils/localDrafts/keys';
import FormConnectionEditorPage from '../FormConnectionEditor';
import { LINK_PARAMS } from '../FormConnectionEditor/RulesStep/constants';
import type { EditorStep } from '../FormConnectionEditor/types';
import {
  headerTitleOf,
  initialStatesFromDraft,
  initialStatesFromLocal,
  originOfRecord,
} from '../FormConnectionEditor/utils';
import RestoreDialog from './RestoreDialog';
import type { DraftEditFlowProps } from './types';
import {
  draftFlowReducer,
  initialDraftFlowState,
  initialStepOf,
  linkTargetOf,
  reloadedOf,
  restoreChoiceOf,
  storedContentOf,
  withoutLinkParams,
} from './utils';

/**
 * The edit screen at /form-connections/:id/edit. Until the connection or draft is there, the
 * wizard's frame says that it is loading, or why it can't be opened.
 * - A published connection: the edit wizard, filled in with the connection's details and
 *   documents (FR-026). "Reload", after another team member saved the rules (W9), fetches it
 *   again and opens a new wizard at the Rules step: the key changes with each load, so the
 *   unsaved changes go. Its flow never reads, writes or offers a local draft (FR-014); a
 *   `draft-<id>` local draft left from before it was published is removed when it loads
 *   (contracts/local-drafts.md "Rules for callers" 3).
 * - A stored draft: the create flow with the draft's content and the "Draft" badge, at the step
 *   its details asked for, the test step included, or else at the step it was saved in (FR-008;
 *   S0, research R10). Its saves and its publishing send the version it was loaded at. If this
 *   device holds unsaved changes to it (its `draft-<id>` local draft), the page first asks
 *   whether to restore them (S5, W6; FR-016; "Rules for callers" 2). "Reload", after another
 *   team member saved the draft (S2; R6), drops that local draft, fetches the draft again and
 *   opens a new wizard at the step it was stored in, not at the one its details asked for, with
 *   the focus on the page title.
 * - A link (spec 007, S5; FR-030, FR-031), `?step=rules&variant=…&item=…`: either flow opens at
 *   the rules step, with the variant's tab open and the rule or group in view, or with the notice
 *   of what no longer exists (`linkTargetOf()`). A stored draft with unsaved changes on this device
 *   asks first, and the link applies to the content the answer opens. The search parameters win
 *   over the router state. They stay in the address while the link's variant is shown in the rules
 *   step, so that reloading opens the link again (and the address bar holds it); once the team
 *   member moves to another step or variant they go, in place of the current history entry. A
 *   conflict's "Reload" doesn't apply them. A connection that isn't there shows the frame's
 *   not-found state, and a signed-out team member comes back to the link after signing in.
 */
export default function FormConnectionEditPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Read once, so that going back to step 1 isn't undone by a re-render; the link's too (S5)
  const [requested] = useState<unknown>(() => location.state);
  const [link] = useState(() => new URLSearchParams(searchParams));
  const linkStep = link.get(LINK_PARAMS.step);
  const [initialStep, setInitialStep] = useState<EditorStep>(() =>
    initialStepOf(requested, undefined, linkStep)
  );
  // A draft conflict's "Reload" from a resumed local draft opens this page as reloaded (S2)
  const [reloaded, setReloaded] = useState(() => reloadedOf(requested));
  const { state, retry } = useFormConnection(id);
  const { store, username } = useLocalDraftStore();
  const publishedId =
    state.status === 'loaded' && state.formConnection.status === 'published'
      ? state.formConnection.id
      : null;

  // A published connection has no local draft: one left from its draft goes (rule 3)
  useEffect(() => {
    if (publishedId !== null && username !== null) {
      store.remove(username, flowKeyOfDraft(publishedId));
    }
  }, [publishedId, store, username]);

  // Once the team member moves from what the link opened, the address is the editor's own again;
  // the route and the router state stay, so the wizard stays mounted (S5)
  const handleLinkLeft = useCallback(() => {
    setSearchParams((current) => withoutLinkParams(current), {
      replace: true,
      state: location.state,
    });
  }, [setSearchParams, location.state]);

  function handleReload() {
    setInitialStep('rules');
    setReloaded(true);
    retry();
  }

  // A draft's conflict (S2): its local draft is already gone, so the flow opens the draft as now
  // stored, at its stored step
  function handleDraftReload() {
    setReloaded(true);
    retry();
  }

  if (state.status !== 'loaded') {
    return <FormConnectionLoadState state={state} onRetry={retry} />;
  }
  const loaded = state.formConnection;
  // After a reload, neither the step the details asked for nor the link applies
  const target = linkTargetOf(reloaded ? new URLSearchParams() : link, loaded.branches);
  if (loaded.status === 'draft') {
    return (
      <DraftEditFlow
        key={`${loaded.id}:${state.attempt}`}
        draft={loaded}
        initialStep={initialStepOf(reloaded ? null : requested, loaded, reloaded ? null : linkStep)}
        onReload={handleDraftReload}
        reloaded={reloaded}
        initialVariant={target.variantId}
        initialItem={target.itemId}
        linkNotice={target.notice}
        onLinkLeft={handleLinkLeft}
      />
    );
  }
  return (
    <FormConnectionEditorPage
      key={`${loaded.id}:${state.attempt}`}
      origin={{ kind: 'published', formConnection: loaded }}
      initialStep={initialStep}
      onReload={handleReload}
      reloaded={reloaded}
      initialVariant={target.variantId}
      initialItem={target.itemId}
      linkNotice={target.notice}
      onLinkLeft={handleLinkLeft}
    />
  );
}

/**
 * A loaded draft's flow. It reads the draft's local draft once, when it mounts: without one it
 * opens the stored draft; one with the stored draft's own content goes silently; one with changes
 * brings the restore question before the editor mounts, so that the editor's autosave can't write
 * over it until the team member has answered.
 */
function DraftEditFlow({
  draft,
  initialStep,
  onReload,
  reloaded,
  initialVariant = null,
  initialItem = null,
  linkNotice = null,
  onLinkLeft,
}: DraftEditFlowProps) {
  const { store, username } = useLocalDraftStore();
  const navigate = useNavigate();
  const flowKey = flowKeyOfDraft(draft.id);
  // Once per load: the editor reads its starting states only when it mounts
  const [stored] = useState(() => {
    // Nobody signed in can't happen behind RequireSignIn; it reads as no record
    const record = username !== null ? store.read(username, flowKey) : null;
    return {
      record,
      choice: restoreChoiceOf(record, draft),
      states: initialStatesFromDraft(draft, initialStep),
    };
  });
  const [flow, dispatch] = useReducer(draftFlowReducer, null, () =>
    initialDraftFlowState(stored.record, stored.choice)
  );

  // The stored draft's own content holds no unsaved work
  useEffect(() => {
    if (stored.choice === 'same' && username !== null) {
      store.remove(username, flowKey);
    }
  }, [stored.choice, store, username, flowKey]);

  function handleDiscard() {
    if (username !== null) {
      store.remove(username, flowKey);
    }
    dispatch({ type: 'discard' });
  }

  function handleEscape() {
    navigate(generatePath(ROUTES.formConnection, { id: draft.id }), { replace: true });
  }

  if (flow.kind === 'asking') {
    return (
      <RestoreDialog
        title={headerTitleOf(stored.states.editor)}
        name={displayNameOf(storedContentOf(draft))}
        changedAt={formatChangedAt(flow.record.changedAt)}
        onRestore={() => dispatch({ type: 'restore' })}
        onDiscard={handleDiscard}
        onEscape={handleEscape}
      />
    );
  }
  // After an answer to the question, or after a conflict's Reload, the dialog that had the focus
  // is gone: the focus starts on the page title
  const answered = stored.choice === 'ask' || reloaded;
  // A link (S5) opens the rules step after the answer, with the content the answer opens: the
  // editor checks the link's variant and item again against it
  const linked = initialVariant !== null || linkNotice !== null;
  const link = { initialVariant, initialItem, linkNotice, onLinkLeft };
  if (flow.restored) {
    const restored = initialStatesFromLocal(flow.restored);
    // At the version the record was loaded at, so a save meets the conflict if the draft changed
    // since (US3); the stored draft as loaded stays the baseline (data-model.md section 6)
    return (
      <FormConnectionEditorPage
        origin={originOfRecord(flow.restored)}
        initialStates={
          linked ? { ...restored, editor: { ...restored.editor, step: 'rules' } } : restored
        }
        baseline={storedContentOf(draft)}
        onReload={onReload}
        reloaded={answered}
        {...link}
      />
    );
  }
  return (
    <FormConnectionEditorPage
      origin={{
        kind: 'draft',
        draftId: draft.id,
        draftVersion: draft.version,
        flowKey,
      }}
      initialStates={stored.states}
      onReload={onReload}
      reloaded={answered}
      {...link}
    />
  );
}
