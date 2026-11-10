import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';
import type { OverviewLocationState } from '@connection-portal/api-types/routing';
import type { Language } from '@connection-portal/rules/language';
import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react';
import { generatePath, Link, useLocation, useNavigate } from 'react-router';

import { errorNoticeOf } from '../../api/client';
import { deleteDraft, deleteFormConnection, listFormConnections } from '../../api/form-connections';
import AppLayout from '../../components/AppLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import LocalDraftsOffer from '../../components/LocalDraftsOffer';
import PageLoader from '../../components/PageLoader';
import PageTitle from '../../components/PageTitle';
import Toast from '../../components/Toast';
import type { ToastContent } from '../../components/Toast/types';
import TopBar from '../../components/TopBar';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { useRememberedHomepage } from '../../hooks/useRememberedHomepage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { EDIT_ENTRY_DIALOG_COPY, EDIT_ENTRY_STATE } from '../FormConnectionEdit/constants';
import {
  COLUMN_HEADER_CLASSES,
  COLUMN_HEADERS,
  DELETE_CONNECTION_COPY,
  INITIAL_LIST_STATE,
  INITIAL_ROW_DELETE_STATE,
  LIST_CARD_CLASSES,
  LIST_COPY,
  OVERVIEW_COLUMN_CLASSES,
  OVERVIEW_FOOTER_CLASSES,
  ROWS_CLASSES,
  SEARCH_COPY,
  SKELETON_ROW_COUNT,
  WELCOME_COPY,
} from './constants';
import FormConnectionRow, { FormConnectionRowSkeleton } from './FormConnectionRow';
import SearchToolbar from './SearchToolbar';
import type { HomepageView, NoMatchesProps } from './types';
import {
  deleteDialogCopyOf,
  filterConnections,
  homepageOf,
  listReducer,
  rowDeleteFailureOf,
  rowDeleteReducer,
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
 * The list card's column headers (U11 6699:44583): for the eye, the rows say what each value is
 * (F14: no select-all checkbox); hidden where the rows wrap
 */
function ColumnHeaders() {
  const headers = useCopy(COLUMN_HEADERS);
  return (
    <div aria-hidden="true" className={COLUMN_HEADER_CLASSES}>
      <span className="w-280 shrink-0">{headers.name}</span>
      <span className="w-130 shrink-0">{headers.status}</span>
      <span className="w-160 shrink-0">{headers.date}</span>
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
 * The toast of an arrival: after "Save and exit" the success toast "Draft saved. …" (U17
 * 6699:48002); after a delete on the details the toast a row delete shows, "“<name>” deleted."
 * (U90 6699:48098, neutral, no Undo: F4)
 */
function arrivalToastOf(
  arrival: OverviewLocationState | null,
  language: Language
): ToastContent | null {
  if (arrival?.draftSaved !== undefined) {
    return { id: 1, kind: 'success', message: LIST_COPY[language].draftSaved };
  }
  if (arrival?.deleted !== undefined) {
    return { id: 1, message: LIST_COPY[language].deleted(arrival.deleted) };
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
 * the footer bar with "Create connection" (cosmetic 1). No row can be selected (F14). While the
 * list loads, skeleton rows stand for it (001-S3.5). A row's "Delete" asks the one delete dialog
 * (FR-028, FR-029c); after the delete the row leaves the list, a toast says so, without Undo
 * (F4), and the focus moves to the page's heading, since the button that opened the dialog is
 * gone; after the last one the welcome page shows. A delete on the details arrives here with the
 * same toast. After "Save and exit" the success toast
 * "Draft saved. You can pick it up any time." confirms the saved draft (U17 6699:48002); a saved
 * draft also means that the list holds something, so the overview shows at once. A published
 * connection's "Edit" asks "Edit “<name>”?" first (S17, F48; U15 6699:47905): "Edit connection"
 * opens the edit flow at step 1, and "Cancel", the ×, Escape and the scrim keep the overview.
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
  const [toast, setToast] = useState<ToastContent | null>(() => arrivalToastOf(arrival, language));
  const dismissToast = useCallback(() => setToast(null), []);
  // The edit entry question (F48): there once a row asked, keeping its name while it closes
  const [editEntry, setEditEntry] = useState<{
    target: FormConnectionSummary;
    open: boolean;
  } | null>(null);

  const list = state.status === 'loaded' ? state.formConnections : null;
  const shown = list === null ? [] : filterConnections(list, query);
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

  // "Clear search" goes with the empty result, so the focus moves to the field it empties
  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  async function deleteRow(target: FormConnectionSummary) {
    dispatchDelete({ type: 'start' });
    try {
      await (target.status === 'draft' ? deleteDraft(target.id) : deleteFormConnection(target.id));
      focusTitleAfterDelete.current = true;
      dispatchDelete({ type: 'done' });
      dispatch({ type: 'removed', id: target.id });
      setToast((shown) => ({ id: (shown?.id ?? 0) + 1, message: copy.deleted(target.name) }));
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatchDelete({ type: 'failed', ...rowDeleteFailureOf(error, language) });
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
      <Toast toast={toast} onDismiss={dismissToast} noFooter={view === 'welcome'} />
    </>
  );

  if (view === 'welcome') {
    return (
      <AppLayout>
        {/* Above the page (S3): the banner 32px over the h1 (16 + the column's gap 16), and
            nothing while it's hidden; `contents`, so that the banner is the column's item */}
        <div className="contents [&>section]:mb-16">
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

        {/* U16 7362:54543: 16px under the title block and 16px above the toolbar (the column's
            gap); it keeps its height, the list card shrinks instead and its rows scroll */}
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
            />
            <section id={listId} aria-labelledby={countId} className={LIST_CARD_CLASSES}>
              <ColumnHeaders />
              {shown.length > 0 ? (
                <ul className={ROWS_CLASSES}>
                  {shown.map((formConnection) => (
                    <FormConnectionRow
                      key={formConnection.id}
                      formConnection={formConnection}
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
