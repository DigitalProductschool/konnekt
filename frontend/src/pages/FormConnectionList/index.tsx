import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';
import type { OverviewLocationState } from '@connection-portal/api-types/routing';
import type { Language } from '@connection-portal/rules/language';
import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import { generatePath, Link, useLocation, useNavigate } from 'react-router';

import { errorNoticeOf } from '../../api/client';
import {
  deleteConnections,
  deleteDraft,
  deleteFormConnection,
  listFormConnections,
  restoreDeletion,
} from '../../api/form-connections';
import AppLayout from '../../components/AppLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import LocalDraftsOffer from '../../components/LocalDraftsOffer';
import PageLoader from '../../components/PageLoader';
import PageTitle from '../../components/PageTitle';
import { ARRIVAL_CARD_CLASSES } from '../../components/SignInMotion/constants';
import Toast from '../../components/Toast';
import type { ToastContent } from '../../components/Toast/types';
import TopBar from '../../components/TopBar';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { useRememberedHomepage } from '../../hooks/useRememberedHomepage';
import { useSignInDestination } from '../../hooks/useSignInMotion';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { EDIT_ENTRY_DIALOG_COPY, EDIT_ENTRY_STATE } from '../FormConnectionEdit/constants';
import BulkDeleteDialog from './BulkDeleteDialog';
import {
  COLUMN_HEADER_CLASSES,
  COLUMN_HEADERS,
  DELETE_CONNECTION_COPY,
  INITIAL_BULK_DELETE_STATE,
  INITIAL_LIST_STATE,
  INITIAL_ROW_DELETE_STATE,
  LIST_CARD_CLASSES,
  LIST_COPY,
  NO_SELECTION,
  OVERVIEW_COLUMN_CLASSES,
  OVERVIEW_FOOTER_CLASSES,
  ROWS_CLASSES,
  SEARCH_COPY,
  SELECTION_COPY,
  SKELETON_ROW_COUNT,
  WELCOME_COPY,
} from './constants';
import FormConnectionRow, { FormConnectionRowSkeleton, SelectCheckbox } from './FormConnectionRow';
import SearchToolbar from './SearchToolbar';
import SelectionBar from './SelectionBar';
import type { ColumnHeadersProps, HomepageView, NoMatchesProps } from './types';
import {
  bulkDeleteFailureOf,
  bulkDeleteReducer,
  canRestore,
  deleteDialogCopyOf,
  deletionItemsOf,
  deletionReducer,
  deletionToastOf,
  filterConnections,
  homepageOf,
  initialDeletionOf,
  listReducer,
  restoreFailureOf,
  rowDeleteFailureOf,
  rowDeleteReducer,
  selectAllStateOf,
  selectionReducer,
} from './utils';
import WelcomePage from './WelcomePage';

/**
 * "/" while the list loads and the device remembers nothing of it (Figma U10 6401:28567, "After
 * log in: loading your workspace"): the white page with the signed-out header (the white Konnekt
 * pill, no account pill, U10 #18) and the 56px loader with "Loading your connections…" centred
 * in the window, the page starting under the 64px header area as `AuthLayout`'s does. The
 * frame draws no title; the page's one h1 is there for screen readers (FR-012)
 */
function HomepageLoader() {
  const copy = useCopy(LIST_COPY);
  return (
    <div className="bg-kern-layout-background-default flex min-h-dvh flex-col">
      <TopBar signedOut />
      <main className="-mt-64">
        <h1 className="sr-only">{copy.title}</h1>
        <PageLoader label={copy.loading} />
      </main>
    </div>
  );
}

/**
 * The list card's column headers (U11 6699:44583; spec 010, U15 6699:45213): the select-all
 * "Select all connections" (FR-038, FR-040; U15 6699:45214), checked while every listed row is
 * selected and mixed while some are, then the labels, which are for the eye: the rows say what
 * each value is. Where the rows wrap only "Name" stays beside the select-all. The skeleton keeps
 * the select-all's place without it
 */
function ColumnHeaders({ selectAll }: ColumnHeadersProps) {
  const headers = useCopy(COLUMN_HEADERS);
  const copy = useCopy(SELECTION_COPY);
  return (
    <div className={COLUMN_HEADER_CLASSES.headers}>
      {selectAll ? (
        <SelectCheckbox
          label={copy.selectAll}
          checked={selectAll.state === 'all'}
          indeterminate={selectAll.state === 'some'}
          disabled={selectAll.disabled}
          onChange={selectAll.onToggle}
        />
      ) : (
        <span className="h-28 w-20 shrink-0" />
      )}
      <span aria-hidden="true" className={COLUMN_HEADER_CLASSES.name}>
        {headers.name}
      </span>
      <span aria-hidden="true" className={COLUMN_HEADER_CLASSES.column}>
        {headers.status}
      </span>
      <span aria-hidden="true" className={COLUMN_HEADER_CLASSES.date}>
        {headers.date}
      </span>
    </div>
  );
}

/**
 * The overview while its list loads (001-S3.5, §3 "Skeleton"): the toolbar's place, then the
 * list card with its headers and skeleton rows in the rows' shape, where the list will be; screen
 * readers hear "Loading your connections…"
 */
function ListSkeleton() {
  const copy = useCopy(LIST_COPY);
  return (
    <div role="status" className="flex min-h-0 flex-col gap-16">
      <span className="sr-only">{copy.loading}</span>
      {/* The toolbar's 48px, so that the card doesn't move when the list arrives */}
      <div aria-hidden="true" className="h-48 shrink-0" />
      <div aria-hidden="true" className={LIST_CARD_CLASSES}>
        <ColumnHeaders />
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <FormConnectionRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * The search's empty result, inside the list card under the column headers (Figma U11
 * 6699:44628): what was searched, a hint, and "Clear search", which empties the field (FR-051
 * (27)). The count above says "0 of 3 connections"
 */
function NoMatches({ query, onClear }: NoMatchesProps) {
  const copy = useCopy(SEARCH_COPY);
  // "Clear search" as drawn: label/default in the action colour, its underline on hover only
  return (
    <div className="flex flex-col items-start gap-8 px-24 py-32 leading-(--kern-typography-line-height-medium-static)">
      <p className="text-kern-static-medium text-kern-layout-text-default font-semibold break-words">
        {copy.noMatches(query)}
      </p>
      <p className="text-kern-static-small text-kern-layout-text-muted">{copy.noMatchesHint}</p>
      <button
        type="button"
        onClick={onClear}
        className="kern-link text-kern-static-medium py-0! font-semibold! no-underline! hover:underline!"
      >
        {copy.clear}
      </button>
    </div>
  );
}

/**
 * The toast of an arrival after "Save and exit": the success toast "Draft saved. …" (U17
 * 6699:48002). A delete on the details arrives as a deletion instead (`initialDeletionOf`), with
 * the toast a row delete shows
 */
function arrivalToastOf(
  arrival: OverviewLocationState | null,
  language: Language
): ToastContent | null {
  if (arrival?.draftSaved !== undefined) {
    return { id: 1, kind: 'success', message: LIST_COPY[language].draftSaved };
  }
  return null;
}

/**
 * The homepage "/" (FR-027, research R6): the welcome page (S3) while no connection or draft
 * exists, the overview (S4, Figma "Your connections") once anything is listed, drafts included.
 * While the list loads, the device's memory of the account (`useRememberedHomepage`) picks the
 * page, so that a reload shows no flash of the wrong one; without a memory the loading page
 * shows. A failed load shows the overview's error state with its error ID (W2), whatever the
 * memory says. After the last connection is deleted the list is empty again, and so is the
 * memory: the welcome page returns. Both pages offer the unsaved work on this device (S5,
 * 005-S4): above the welcome page, and on the overview between its title and its toolbar.
 *
 * The overview (Figma U11 6699:44240) lists every connection that isn't deleted: "Your
 * connections" with the design's one hint in every state (FR-029a), the error state under it
 * (W2), the local-drafts offer (S5), the toolbar with the count and the search, which filters
 * the loaded list in the page (FR-051 (27), (28); `filterConnections`), the list card with its
 * column headers and rows, which scroll inside the card when they don't fit the window (U12), and
 * the footer bar with "Create connection" (cosmetic 1). While the
 * list loads, skeleton rows stand for it (001-S3.5). A row's "Delete" asks the one delete dialog
 * (FR-028, FR-029c); after the delete the row leaves the list, and the focus moves to the page's
 * heading, since the button that opened the dialog is gone; after the last one the welcome page
 * shows. A delete on the details arrives here the same way.
 *
 * The deletion's toast (spec 010, FR-033 to FR-037; S4 "After a deletion", "Undo"; W11): the red
 * "“<name>” deleted." with "Undo", over the welcome page too after the last connection; the page
 * keeps the deletion's id with it (`deletionReducer`). "Undo" sends the restore: the answered rows
 * return to the list without a reload (the welcome page gives way to the overview) and the green
 * "“<name>” restored." is announced; `409 not_restorable` says "“<name>” can no longer be
 * restored." and changes nothing; no answer or a server failure says "Couldn’t restore. Try
 * again." with "Undo" again. The Undo button goes with its toast, so the focus moves to the
 * page's heading when it was on it. A toast that closed (6 s, Escape), was replaced or was left
 * with the page leaves the deletion standing. After "Save and exit" the success toast
 * "Draft saved. You can pick it up any time." confirms the saved draft (U17 6699:48002); a saved
 * draft also means that the list holds something, so the overview shows at once. A published
 * connection's "Edit" asks "Edit “<name>”?" first (S17, F48; U15 6699:47905): "Edit connection"
 * opens the edit flow at step 1, and "Cancel", the ×, Escape and the scrim keep the overview.
 *
 * The selection (spec 010, S4 "Selection", "Selection bar"; FR-038 to FR-040, FR-081; U15
 * 6699:45199): a checkbox on every row and the select-all in the list's header, over the listed
 * rows (the rows the search shows; `selectionReducer`). While a row is selected the selection
 * bar stands where the toolbar was ("<n> selected", announced; "Cancel"; "Delete"); "Cancel"
 * clears the selection, and the toolbar comes back with its search text and the focus in the
 * field. A row that leaves the loaded list leaves the selection. "Delete" with one row selected
 * asks that row's own delete dialog; with more, the bulk dialog (`BulkDeleteDialog`). The
 * local-drafts offer stays between the title and the bar; its device-only connections are no
 * rows, so they are neither counted nor selectable. Nothing of the selection is stored.
 *
 * The bulk deletion (spec 010, S4 "Delete", "After a deletion"; FR-041 to FR-044): the dialog
 * sends each row's id and state. After it the rows are gone, the selection is cleared, the
 * toolbar is back with the focus on the heading, and the red "<n> connections deleted." offers
 * "Undo" for all of them (`deletionReducer`). When a connection changed meanwhile, nothing is
 * deleted: the dialog stays open and names it, and the list behind it loads again without its
 * skeleton, so that the bar and its "Delete" stay where the focus returns.
 *
 * As the destination of a sign-in (bug login-welcome-motion, P5–P7) the page loads under the
 * sign-in page, which holds until the list is there (at most 1000 ms) on a device that remembers
 * nothing; the welcome page then runs the full motion, the overview the cross-fade, and the
 * page's heading takes the focus as it shows.
 */
export default function FormConnectionListPage() {
  const { language } = useLanguage();
  const copy = LIST_COPY[language];
  const welcomeCopy = WELCOME_COPY[language];
  const deleteCopy = DELETE_CONNECTION_COPY[language];
  const editEntryCopy = EDIT_ENTRY_DIALOG_COPY[language];
  // The list loads once per attempt, not per language: a failure's fallback text takes the
  // language of the moment it fails
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const [state, dispatch] = useReducer(listReducer, INITIAL_LIST_STATE);
  const [rowDelete, dispatchDelete] = useReducer(rowDeleteReducer, INITIAL_ROW_DELETE_STATE);
  const [bulkDelete, dispatchBulkDelete] = useReducer(bulkDeleteReducer, INITIAL_BULK_DELETE_STATE);
  // The quiet reload after `409 selection_changed`: an answer that a later change of the list
  // overtook (a deletion, a restore, another reload) is dropped
  const listVersion = useRef(0);
  // Set when the bulk dialog closes without deleting: the focus goes back to the bar's "Delete",
  // or, where the reload emptied the selection, to the search field (or the heading)
  const focusAfterBulkClose = useRef(false);
  const handleUnauthorized = useSignOutOnUnauthorized();
  const location = useLocation();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Set when a delete removed the row whose button had the focus, or on arriving from a delete
  // on the details, whose opener is gone too: the heading takes it once the list is there
  const focusTitleAfterDelete = useRef(
    (location.state as OverviewLocationState | null)?.deleted !== undefined
  );
  const countId = useId();
  const listId = useId();
  const [query, setQuery] = useState('');
  // Read once: the router state is cleared below, so the toast goes at the next navigation
  const [arrival] = useState(() => location.state as OverviewLocationState | null);
  const draftSaved = arrival?.draftSaved ?? null;
  const [savedToast, setSavedToast] = useState<ToastContent | null>(() =>
    arrivalToastOf(arrival, language)
  );
  const [deletion, dispatchDeletion] = useReducer(
    deletionReducer,
    arrival?.deleted,
    initialDeletionOf
  );
  // A deletion's toast replaces the arrival's
  const toast = deletionToastOf(deletion, language) ?? savedToast;
  const dismissToast = useCallback(() => {
    dispatchDeletion({ type: 'dismissed' });
    setSavedToast(null);
  }, []);
  // Set by "Undo": its answer replaces the toast and its button, so the heading takes the focus
  // if the button had it
  const focusTitleAfterRestore = useRef(false);
  // The edit entry question (F48): there once a row asked, keeping its name while it closes
  const [editEntry, setEditEntry] = useState<{
    target: FormConnectionSummary;
    open: boolean;
  } | null>(null);

  const list = state.status === 'loaded' ? state.formConnections : null;
  const shown = useMemo(() => (list === null ? [] : filterConnections(list, query)), [list, query]);
  const shownIds = useMemo(() => shown.map((formConnection) => formConnection.id), [shown]);
  const [selection, dispatchSelection] = useReducer(selectionReducer, NO_SELECTION);
  const selectedCount = shownIds.filter((id) => selection.has(id)).length;
  // Set by "Cancel": the toolbar comes back with the focus in its search field
  const focusSearchAfterCancel = useRef(false);
  const { remembered } = useRememberedHomepage(list === null ? null : list.length > 0);
  // A draft saved on the way here is in the list, whatever the memory says
  const expected = draftSaved !== null ? true : remembered;
  // The loading page is the first load's: "Try again" after a failure stays on the overview
  const view: HomepageView =
    state.status === 'failed' || (list === null && expected === null && state.attempt > 0)
      ? 'overview'
      : list === null && expected === null
        ? 'loading'
        : homepageOf(list, expected);
  useDocumentTitle(view === 'welcome' ? welcomeCopy.pageTitle : copy.pageTitle);
  const { card: arriving } = useSignInDestination(view, titleRef);

  useEffect(() => {
    if (arrival?.draftSaved !== undefined || arrival?.deleted !== undefined) {
      navigate(location.pathname, { replace: true });
    }
  }, [arrival, navigate, location.pathname]);

  useEffect(() => {
    let ignore = false;
    listFormConnections().then(
      (formConnections) => {
        if (!ignore) dispatch({ type: 'loaded', formConnections });
      },
      (error: unknown) => {
        if (!ignore && !handleUnauthorized(error)) {
          dispatch({
            type: 'failed',
            notice: errorNoticeOf(error, LIST_COPY[languageRef.current].errorText),
          });
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, [state.attempt, handleUnauthorized]);

  // After the list changed: the overview's heading, or the welcome page's after the last row
  useEffect(() => {
    if (focusTitleAfterDelete.current && state.status !== 'loading') {
      focusTitleAfterDelete.current = false;
      titleRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (!focusTitleAfterRestore.current || deletion.current?.restoring) {
      return;
    }
    focusTitleAfterRestore.current = false;
    if (document.activeElement === null || document.activeElement === document.body) {
      titleRef.current?.focus();
    }
  }, [deletion]);

  // A row that left the loaded list leaves the selection (EC-12); while the list loads again
  // the selection waits for it
  useEffect(() => {
    if (list !== null) {
      dispatchSelection({ type: 'prune', listedIds: shownIds });
    }
  }, [list, shownIds]);

  // The native dialog gave the focus back to the bar's "Delete"; where the quiet reload took the
  // bar away, the toolbar is back and its search field takes it. With no opener left, the focus
  // stays on the closed dialog's button until the browser moves it to the body
  useEffect(() => {
    if (!focusAfterBulkClose.current || bulkDelete.open) return;
    focusAfterBulkClose.current = false;
    const active = document.activeElement;
    if (active === null || active === document.body || active.closest('dialog:not([open])')) {
      (searchRef.current ?? titleRef.current)?.focus();
    }
  }, [bulkDelete.open]);

  // "Cancel" took its button away with the bar: the search field, back in view, takes the focus
  useEffect(() => {
    if (focusSearchAfterCancel.current && selection.size === 0) {
      focusSearchAfterCancel.current = false;
      searchRef.current?.focus();
    }
  }, [selection]);

  function cancelSelection() {
    focusSearchAfterCancel.current = true;
    dispatchSelection({ type: 'clear' });
  }

  // The bar's "Delete" (FR-041): one row asks its own delete dialog, which gives the focus back
  // to the bar's "Delete" when it closes without deleting; more rows ask the bulk dialog
  function deleteSelected() {
    const rows = shown.filter((formConnection) => selection.has(formConnection.id));
    if (rows.length === 1) {
      dispatchDelete({ type: 'open', target: rows[0] });
    } else if (rows.length > 1) {
      openBulkDelete(rows);
    }
  }

  // The bulk dialog for two or more selected rows, in the list's order (FR-041)
  function openBulkDelete(rows: FormConnectionSummary[]) {
    dispatchBulkDelete({ type: 'open', rows });
  }

  // The list behind the bulk dialog, current again without the skeleton (FR-043): the bar and
  // the rows stay, and the selection follows the answer (`prune`)
  function reloadQuietly() {
    const version = ++listVersion.current;
    listFormConnections().then(
      (formConnections) => {
        if (version === listVersion.current) dispatch({ type: 'loaded', formConnections });
      },
      (error: unknown) => {
        // The dialog already says that nothing was deleted; a failed reload keeps the list
        handleUnauthorized(error);
      }
    );
  }

  // "Delete connections" (FR-043, FR-044): all of them or none
  async function deleteBulk(rows: FormConnectionSummary[]) {
    dispatchBulkDelete({ type: 'start' });
    try {
      const { id: deletionId } = await deleteConnections(deletionItemsOf(rows));
      listVersion.current += 1;
      focusTitleAfterDelete.current = true;
      dispatchBulkDelete({ type: 'done' });
      for (const row of rows) {
        dispatch({ type: 'removed', id: row.id });
      }
      dispatchSelection({ type: 'clear' });
      setSavedToast(null);
      dispatchDeletion({ type: 'deleted', deletionId, names: rows.map((row) => row.name) });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        const failure = bulkDeleteFailureOf(error, rows, language);
        dispatchBulkDelete({ type: 'failed', failure });
        if (failure.stale) {
          reloadQuietly();
        }
      }
    }
  }

  function closeBulkDelete() {
    if (bulkDelete.deleting) return;
    focusAfterBulkClose.current = true;
    dispatchBulkDelete({ type: 'close' });
  }

  // "Clear search" goes with the empty result, so the focus moves to the field it empties
  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  async function deleteRow(target: FormConnectionSummary) {
    dispatchDelete({ type: 'start' });
    try {
      const { id: deletionId } = await (target.status === 'draft'
        ? deleteDraft(target.id)
        : deleteFormConnection(target.id));
      listVersion.current += 1;
      focusTitleAfterDelete.current = true;
      dispatchDelete({ type: 'done' });
      dispatch({ type: 'removed', id: target.id });
      setSavedToast(null);
      dispatchDeletion({ type: 'deleted', deletionId, names: [target.name] });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatchDelete({ type: 'failed', ...rowDeleteFailureOf(error, language) });
      }
    }
  }

  // The toast's "Undo" (FR-034, FR-036): the restored rows go back into the list even when a newer
  // deletion has replaced this toast meanwhile
  async function undo() {
    const deletionId = deletion.current?.id;
    if (!deletionId || !canRestore(deletion)) return;
    focusTitleAfterRestore.current = true;
    dispatchDeletion({ type: 'restoring', deletionId });
    try {
      const { items } = await restoreDeletion(deletionId);
      listVersion.current += 1;
      dispatch({ type: 'restored', items });
      dispatchDeletion({ type: 'restored', deletionId });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatchDeletion({ deletionId, ...restoreFailureOf(error) });
      }
    }
  }

  // Closing after the row turned out gone or published meanwhile loads the list again
  function closeDelete() {
    if (rowDelete.deleting) return;
    dispatchDelete({ type: 'close' });
    if (rowDelete.stale) {
      dispatch({ type: 'retry' });
    }
  }

  if (view === 'loading') {
    return <HomepageLoader />;
  }

  // The delete dialog and the toast outlive the overview: after the last delete they show over
  // the welcome page. The dialog is there once a row asked for it, so that it never has an empty
  // title; it keeps the row's texts while it closes
  const { target } = rowDelete;
  const overlays = (
    <>
      {target && (
        <ConfirmDialog
          open={rowDelete.open}
          {...deleteDialogCopyOf(target, language)}
          confirmLabel={deleteCopy.confirm}
          cancelLabel={deleteCopy.cancel}
          danger
          busyLabel={deleteCopy.busy}
          busy={rowDelete.deleting}
          error={rowDelete.error}
          errorTitle={deleteCopy.errorTitle}
          retryLabel={deleteCopy.retry}
          dismissOnScrim={false}
          onCancel={closeDelete}
          onConfirm={() => void deleteRow(target)}
        />
      )}
      <BulkDeleteDialog
        state={bulkDelete}
        onCancel={closeBulkDelete}
        onConfirm={() => {
          if (bulkDelete.rows) void deleteBulk(bulkDelete.rows);
        }}
      />
      {editEntry && (
        <ConfirmDialog
          open={editEntry.open}
          title={editEntryCopy.title(editEntry.target.name)}
          text={editEntryCopy.text}
          cancelLabel={editEntryCopy.cancel}
          confirmLabel={editEntryCopy.confirm}
          onCancel={() => setEditEntry({ ...editEntry, open: false })}
          onConfirm={() =>
            navigate(generatePath(ROUTES.editFormConnection, { id: editEntry.target.id }), {
              state: EDIT_ENTRY_STATE,
            })
          }
        />
      )}
      <Toast
        toast={toast}
        onAction={() => void undo()}
        onDismiss={dismissToast}
        noFooter={view === 'welcome'}
      />
    </>
  );

  if (view === 'welcome') {
    return (
      <AppLayout>
        {/* Above the page (S3): the banner 32px over the h1 (16 + the column's gap 16), and
            nothing while it's hidden; `contents`, so that the banner is the column's item */}
        <div className={`contents [&>section]:mb-16 ${arriving ? ARRIVAL_CARD_CLASSES.offer : ''}`}>
          <LocalDraftsOffer emptyFocusRef={titleRef} />
        </div>
        <WelcomePage titleRef={titleRef} />
        {overlays}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={OVERVIEW_COLUMN_CLASSES}>
        <PageTitle ref={titleRef} size="x-large" title={copy.title} hint={copy.hint} />

        {state.status === 'failed' && (
          <KernAlert variant="danger" title={copy.errorTitle} className="w-full shrink-0">
            <ErrorNoticeText notice={state.notice} />
            <span className="mt-10 flex flex-wrap items-center gap-x-24 gap-y-8">
              <button
                type="button"
                onClick={() => dispatch({ type: 'retry' })}
                className="kern-btn kern-btn--secondary kern-btn--small"
              >
                <span className="kern-label">{copy.retry}</span>
              </button>
            </span>
          </KernAlert>
        )}

        {/* U16 7362:54543: 16px under the title block and 16px above the toolbar or the
            selection bar (the column's gap; W17); it keeps its height, the list card shrinks
            instead and its rows scroll */}
        <div className="contents [&>section]:shrink-0">
          <LocalDraftsOffer emptyFocusRef={titleRef} />
        </div>

        {state.status === 'loading' && <ListSkeleton />}

        {list !== null && list.length > 0 && (
          <>
            <SearchToolbar
              query={query}
              onQueryChange={setQuery}
              shown={shown.length}
              total={list.length}
              inputRef={searchRef}
              countId={countId}
              listId={listId}
              hidden={selectedCount > 0}
            />
            <SelectionBar
              count={selectedCount}
              onCancel={cancelSelection}
              onDelete={deleteSelected}
            />
            <section id={listId} aria-labelledby={countId} className={LIST_CARD_CLASSES}>
              <ColumnHeaders
                selectAll={{
                  state: selectAllStateOf(selection, shownIds),
                  disabled: shownIds.length === 0,
                  onToggle: () => dispatchSelection({ type: 'toggleAll', listedIds: shownIds }),
                }}
              />
              {shown.length > 0 ? (
                <ul className={ROWS_CLASSES}>
                  {shown.map((formConnection) => (
                    <FormConnectionRow
                      key={formConnection.id}
                      formConnection={formConnection}
                      selected={selection.has(formConnection.id)}
                      onToggle={(id) => dispatchSelection({ type: 'toggle', id })}
                      onDelete={(target) => dispatchDelete({ type: 'open', target })}
                      onEdit={(target) => setEditEntry({ target, open: true })}
                    />
                  ))}
                </ul>
              ) : (
                <NoMatches query={query.trim()} onClear={clearSearch} />
              )}
            </section>
          </>
        )}

        <div className={OVERVIEW_FOOTER_CLASSES.slot}>
          <div className={OVERVIEW_FOOTER_CLASSES.bar}>
            <div className="mx-auto flex w-full max-w-1120 justify-end">
              <Link to={ROUTES.newFormConnection} className="kern-btn kern-btn--primary">
                <span className="kern-label">{copy.createConnection}</span>
                <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {overlays}
    </AppLayout>
  );
}
