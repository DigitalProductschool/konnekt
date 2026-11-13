import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { SKELETON_BARS } from '../../components/FormConnectionLoadState/constants';
import type { FormConnectionState } from '../../hooks/types';
import { useConnectionPdf } from '../../hooks/useConnectionPdf';
import { useFormConnection } from '../../hooks/useFormConnection';
import ConnectionDetails from './ConnectionDetails';
import DetailFooter from './DetailFooter';
import DraftDetails from './DraftDetails';
import type { PdfGoneMark } from './types';
import { arrivalOf } from './utils';

/**
 * An accordion's closed header as a skeleton (U80 6809:46486: the card radius 12 with its 1px
 * line, padding 24, 102 high): the title's 14px bar on its 24px line, the counts' 10px bar on
 * the line 4px under it
 */
function SkeletonAccordion() {
  return (
    <div className="rounded-kern-large bg-kern-layout-background-default border border-(--kern-color-decorative-border-default) p-24">
      <div className={`rounded-kern-small mt-5 h-14 w-160 max-w-full ${SKELETON_BARS.strong}`} />
      <div
        className={`rounded-kern-small mt-16 mb-7 h-10 w-200 max-w-full ${SKELETON_BARS.light}`}
      />
    </div>
  );
}

/**
 * The details' skeleton (§3 "Skeleton", U06 #95: "skeletons in the final layout"; T017's bars):
 * the status band without its colour (U89's `layout-background-hued`, the status unknown yet),
 * its icon's circle and the bars on the title's and the sub-line's lines, then the three cards
 * (Links, Summary and Activity on a published connection; Summary, Links and Activity on a draft;
 * spec 010 S15, S16) closed, 16px apart, so that the page keeps its length once it loads
 */
function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-16">
      <div className="rounded-kern-large bg-kern-layout-background-hued flex items-start gap-16 p-16 sm:p-32">
        <div className={`rounded-kern-circle size-32 shrink-0 ${SKELETON_BARS.strong}`} />
        <div className="min-w-0 flex-1">
          <div
            className={`rounded-kern-small mt-9 h-14 w-240 max-w-full ${SKELETON_BARS.strong}`}
          />
          <div
            className={`rounded-kern-small mt-20 mb-7 h-10 w-360 max-w-full ${SKELETON_BARS.light}`}
          />
        </div>
      </div>
      <SkeletonAccordion />
      <SkeletonAccordion />
      <SkeletonAccordion />
    </div>
  );
}

/**
 * The details at /form-connections/:id, in the details' frame (L4: the wizard's page without a
 * step line, the 832px column). Every state keeps the frame, so the header doesn't jump.
 * - A published connection (S15): the status band with the status sentence as the h1 and the
 *   connection's ⋯ menu, the Links accordion with the URLs to copy into serviceBW, open right
 *   after publishing, and the Summary accordion with the documents, the rules as variant tabs and
 *   the rule checks' findings, open on every other arrival. After an edit a toast confirms that
 *   the changes are saved.
 * - A stored draft (S16, T081): "This connection is a draft" as the h1 with "Delete draft" in the
 *   band, the Summary open first and the Links card without any URL (FR-006), and the footer's
 *   "Edit connection" and "Go to connections". Once the draft turns out to be published, "Open the
 *   connection" loads the details again, which then show the connection.
 * - While it loads, the details' skeleton; a deleted or unknown connection shows "Page not found"
 *   and a failed load the error state with the server's error ID and "Try again" (W2), both with
 *   the way back to the overview, in the same frame.
 * - "Download PDF" (spec 011) is kept here, above both details, so that a run survives the swap
 *   when its fetch finds a draft published meanwhile (FR-005): the fetched connection replaces the
 *   loaded one, and a 404 shows "Page not found". The option sets and the catalog aren't handed
 *   to it: they live in the Summary's own hooks, so the run fetches them once per language.
 */
export default function FormConnectionDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, retry, replace } = useFormConnection(id);
  const loaded = state.status === 'loaded' ? state.formConnection : null;
  // Set when a PDF run found the connection gone; it counts only for what was shown then
  const [gone, setGone] = useState<PdfGoneMark | null>(null);
  const pdf = useConnectionPdf({
    id,
    onFetched: replace,
    onGone: () => setGone({ id, formConnection: loaded }),
  });
  const shown: FormConnectionState =
    gone !== null && gone.id === id && gone.formConnection === loaded
      ? { status: 'notFound', attempt: state.attempt }
      : state;
  // Read once: the router state is cleared below, so that a reload shows the plain links
  const [arrival] = useState(() => arrivalOf(location.state));

  useEffect(() => {
    if (arrival) {
      navigate(location.pathname, { replace: true });
    }
  }, [arrival, navigate, location.pathname]);

  if (shown.status !== 'loaded') {
    return (
      <FormConnectionLoadState
        state={shown}
        onRetry={retry}
        variant="details"
        skeleton={<DetailsSkeleton />}
        // While it loads, the loaded page's "Go to connections", where it will stay; the error
        // state and "Page not found" hold their own way back (W2), so no second one
        footer={shown.status === 'loading' ? <DetailFooter /> : null}
      />
    );
  }
  if (shown.formConnection.status === 'draft') {
    return <DraftDetails draft={shown.formConnection} onReload={retry} pdf={pdf} />;
  }
  return (
    <ConnectionDetails
      formConnection={shown.formConnection}
      arrival={arrival}
      onChange={replace}
      pdf={pdf}
    />
  );
}
