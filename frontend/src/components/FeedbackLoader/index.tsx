import loaderIcon from '../../assets/icons/loader.svg';
import type { FeedbackLoaderProps } from './types';

/** Figma "Feedback/Loader": a spinner and what is loading, announced politely. */
export default function FeedbackLoader({ label }: FeedbackLoaderProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-16 py-40">
      <img src={loaderIcon} alt="" className="motion-safe:animate-spin" />
      <p className="text-kern-adaptive-medium text-kern-layout-text-default text-center font-semibold">
        {label}
      </p>
    </div>
  );
}
