import type { FeedbackLoaderProps } from './types';

/**
 * KERN's loader with what is loading under it, announced politely (design-notes §2, option
 * a + b). At 56 px, the screens' "Loader/Spinner 56" (Figma U10 6401:28661, U78 6387:65280):
 * the scoped override `.kern-loader--56` in `index.css` draws the blue arc on its light track; at
 * 96 px, KERN's loader as the kit's P22 draws it. Under reduced motion the arc stands still.
 */
export default function FeedbackLoader({ label, size = 56 }: FeedbackLoaderProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-16">
      <div
        aria-hidden="true"
        className={`kern-loader kern-loader--visible motion ${size === 56 ? 'kern-loader--56' : ''}`}
      />
      <p className="text-kern-adaptive-medium text-kern-layout-text-default text-center leading-(--kern-typography-line-height-medium-adaptive) font-semibold">
        {label}
      </p>
    </div>
  );
}
