import { LOADING_RING_CLASSES } from './constants';

/**
 * The 16px loading ring of a chip whose persona is generated anew (S8.8; spec 008 Q32, F45;
 * Figma U74 "Loading" 7062:51495 in the chip 7062:51295), in place of its outcome icon, 8px before
 * the name, which stays: a circle of radius 7 with a 2px stroke in the skeleton's strong grey
 * (`#e4e8ef`), as drawn, with no arc and no motion, like the skeleton cards beside it (design-notes
 * §3 "Skeleton"); not spec 001's `FeedbackLoader`. Decorative: the row's status reads out the
 * loading ("Creating new data for Mia…")
 */
export default function LoadingRing() {
  return (
    <span
      aria-hidden="true"
      className={`rounded-kern-circle size-16 shrink-0 ${LOADING_RING_CLASSES}`}
    />
  );
}
