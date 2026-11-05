import type { EditLocationState } from '@connection-portal/api-types/routing';
import { Link } from 'react-router';

import { DETAIL_COPY } from './constants';
import type { DraftCardProps } from './types';
import { savedLineOf } from './utils';

/**
 * A draft's card in place of the status card (spec 005, S6, W7), which the design has no frame
 * for: when the draft was saved, "Continue" to its flow at the step it was saved in, and "Delete
 * draft", which asks first. A draft can't be deactivated or reactivated (FR-007). Both actions
 * name the draft for screen readers.
 */
export default function DraftCard({ name, editPath, step, updatedAt, onDelete }: DraftCardProps) {
  const continueState: EditLocationState = { step };
  return (
    <section
      aria-labelledby="draft-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default border"
    >
      <div className="border-kern-neutral-100 flex flex-col gap-2 border-b px-24 pt-24 pb-20">
        <h2
          id="draft-title"
          className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
        >
          {DETAIL_COPY.draftTitle}
        </h2>
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {savedLineOf(updatedAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-16 p-24">
        <Link to={editPath} state={continueState} className="kern-btn kern-btn--primary">
          <span className="kern-label">
            {DETAIL_COPY.continue}
            <span className="sr-only"> {name}</span>
          </span>
        </Link>
        <button type="button" onClick={onDelete} className="kern-btn kern-btn--tertiary">
          <span aria-hidden="true" className="kern-icon kern-icon--delete" />
          <span className="kern-label">
            {DETAIL_COPY.deleteDraft}
            <span className="sr-only"> {name}</span>
          </span>
        </button>
      </div>
    </section>
  );
}
