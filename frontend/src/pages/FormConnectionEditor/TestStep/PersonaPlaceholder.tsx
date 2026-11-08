import { SKELETON_BARS, SKELETON_RESULT_ROWS, SKELETON_VALUE_WIDTHS } from './constants';
import SkeletonDataRow from './SkeletonDataRow';
import SkeletonResultRow from './SkeletonResultRow';

/** The cards' shells, as the data and result cards: white, 1px decorative border, 8px radius */
const CARD =
  'rounded-kern-large bg-kern-layout-background-default h-317 overflow-clip border border-(--kern-color-decorative-border-default) p-16';

/**
 * The skeleton data and result cards (S8.8; FR-004, FR-013; F14; Figma U11 "Citizen data"
 * 7062:51018 with "Skeleton · data" 7062:51211 / 7062:51498, and "Result" 7062:51040 with
 * "Skeleton · result" 7062:51226 / 7062:51513), in the cards' places: 317px high, the data card
 * 410px wide from `lg`, the result card filling the rest. Frame 18 shows them while the personas
 * are first generated (and after "Generate all again" or "Try again"), frame 19 for the selected
 * persona while it is generated anew or filled with data for new fields (FR-020; the status in
 * the citizens row tells which); there is nothing to edit and no "Edit data" or "Generate
 * again". Hidden from assistive technology: the citizens row's status reads out the loading.
 * - Data: the title's strong bar (110 × 14px), 42px, then four rows 18px apart.
 * - Result: the heading's strong bar (200 × 14px), 36px, then four rule rows 16px apart, each with
 *   a placeholder for its statement (F14)
 */
export default function PersonaPlaceholder() {
  return (
    <>
      <div aria-hidden="true" className={`${CARD} lg:w-410 lg:shrink-0`}>
        <div className="flex flex-col gap-18">
          <div className={`rounded-kern-default mb-24 h-14 w-110 ${SKELETON_BARS.strong}`} />
          {SKELETON_VALUE_WIDTHS.map((width) => (
            <SkeletonDataRow key={width} value={width} />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-col gap-16">
          <div
            className={`rounded-kern-default mb-20 h-14 w-200 max-w-full ${SKELETON_BARS.strong}`}
          />
          {SKELETON_RESULT_ROWS.map((row) => (
            <SkeletonResultRow key={row.name} {...row} />
          ))}
        </div>
      </div>
    </>
  );
}
