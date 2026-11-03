/**
 * The 16px loading ring of a chip whose persona is generated anew (S8.8; Figma "Loading"
 * 7062:51495 in 7062:51295, design-notes §10.3, §10.4), in place of its outcome icon: a 2px track
 * in the skeleton's strong grey with an arc in `action-default`, as spec 001's `FeedbackLoader`;
 * still under `prefers-reduced-motion`. Decorative: the row's status reads out the loading
 */
export default function LoadingRing() {
  return (
    <span
      aria-hidden="true"
      className="rounded-kern-circle border-t-kern-action-default size-16 shrink-0 border-2 border-(--kern-color-feedback-default-background) motion-safe:animate-spin"
    />
  );
}
