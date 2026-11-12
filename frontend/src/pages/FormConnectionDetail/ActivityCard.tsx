import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useReducer, useRef, useState } from 'react';

import { errorNoticeOf } from '../../api/client';
import { getActivity } from '../../api/form-connections';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import ActivityRow from './ActivityRow';
import { ACTIVITY_COPY, ACTIVITY_LIST_CLASSES, INITIAL_ACTIVITY_CARD_STATE } from './constants';
import DetailAccordion from './DetailAccordion';
import type { ActivityCardProps } from './types';
import {
  activityCardReducer,
  activityClosedLineOf,
  activityEntriesOf,
  activityRequestOf,
  activityStatusOf,
  hasOlderActivity,
} from './utils';

/**
 * The details' third card (S15 "The Activity card", S16; FR-022–FR-024, FR-031, W10; U86
 * 6396:48520, U95 7246:53937, U97 7246:56374, 6809:46582), a `DetailAccordion` whose open state
 * the page keeps (one card open at a time). Closed, "Activity", the line from `last_activity`
 * ("Last edited by <person> · <date>, <time>", "Deactivated by …" while deactivated, or the time
 * alone) and "View activity". Open, "Hide activity" and the list "Activity, newest first", one
 * `ActivityRow` per entry. The first page loads when the card first opens; the list scrolls inside
 * the card, takes the keyboard focus so that it scrolls with the arrow keys, and loads the next
 * page when its last entry comes into view (`IntersectionObserver` with the list as its root;
 * R15 V6), down to the oldest entry. "Loading activity…" and "Loading earlier activity…" show in
 * the card and are announced (a polite status that stays in the card); a failure shows KERN's
 * danger alert with the reason, a `5xx`'s error ID and "Try again", keeping the entries loaded
 * before it. When `reloadKey` changes, the list loads again from the newest entry. Entries,
 * names and dates are never logged.
 */
export default function ActivityCard({
  formConnectionId,
  lastActivity,
  state: connectionState,
  open,
  onToggle,
  reloadKey,
}: ActivityCardProps) {
  const { language } = useLanguage();
  const copy = ACTIVITY_COPY[language];
  const [state, dispatch] = useReducer(activityCardReducer, INITIAL_ACTIVITY_CARD_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();
  // A failure's fallback in the language it arrives in
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const listRef = useRef<HTMLOListElement>(null);

  // An action on the page changed the connection: forget the pages, which load again below
  const [seenReloadKey, setSeenReloadKey] = useState(reloadKey);
  if (seenReloadKey !== reloadKey) {
    setSeenReloadKey(reloadKey);
    dispatch({ type: 'reset' });
  }
  // The first page when the card first opens (or opens after a reset)
  if (open && state.kind === 'closed') {
    dispatch({ type: 'load' });
  }

  const request = activityRequestOf(state);
  const requesting = request !== null;
  const cursor = request?.cursor ?? null;
  useEffect(() => {
    if (!requesting) {
      return;
    }
    // An answer for a list that was reset or closed meanwhile is dropped
    let current = true;
    getActivity(formConnectionId, cursor ?? undefined).then(
      (page) => {
        if (current) {
          dispatch({ type: 'pageLoaded', page });
        }
      },
      (error: unknown) => {
        if (!current || handleUnauthorized(error)) {
          return;
        }
        const notice = errorNoticeOf(error, ACTIVITY_COPY[languageRef.current].errorText);
        dispatch({ type: 'pageFailed', error: notice });
      }
    );
    return () => {
      current = false;
    };
  }, [requesting, cursor, formConnectionId, reloadKey, handleUnauthorized]);

  const entries = activityEntriesOf(state);
  // The next page when the list's last entry comes into view inside the scrolling list
  const canLoadMore = open && hasOlderActivity(state);
  useEffect(() => {
    const list = listRef.current;
    const lastRow = list?.lastElementChild;
    if (!canLoadMore || !list || !lastRow) {
      return;
    }
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          dispatch({ type: 'loadMore' });
        }
      },
      { root: list }
    );
    observer.observe(lastRow);
    return () => observer.disconnect();
  }, [canLoadMore, entries.length]);

  const status = activityStatusOf(state, language);
  return (
    <DetailAccordion
      title={copy.title}
      counts={activityClosedLineOf(lastActivity, connectionState, language) ?? ''}
      viewLabel={copy.viewActivity}
      hideLabel={copy.hideActivity}
      open={open}
      onToggle={onToggle}
    >
      <div className="px-24 pb-16">
        {entries.length > 0 && (
          // Focusable so that it scrolls with the keyboard (S15); the name says the order
          <ol
            ref={listRef}
            aria-label={copy.listName}
            tabIndex={0}
            className={ACTIVITY_LIST_CLASSES}
          >
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
        <p
          role="status"
          className={
            status
              ? 'text-kern-static-small text-kern-layout-text-muted py-8 leading-(--kern-typography-line-height-medium-static)'
              : 'sr-only'
          }
        >
          {status}
        </p>
        {state.kind === 'failed' && (
          <div className="flex flex-col items-start gap-16 py-8">
            <KernAlert variant="danger" title={copy.errorTitle} className="w-full">
              <ErrorNoticeText notice={state.error} />
            </KernAlert>
            <button
              type="button"
              onClick={() => dispatch({ type: 'retry' })}
              className="kern-btn kern-btn--secondary"
            >
              <span className="kern-label">{copy.retry}</span>
            </button>
          </div>
        )}
      </div>
    </DetailAccordion>
  );
}
