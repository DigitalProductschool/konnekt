import type { SkeletonPillProps } from './types';

/**
 * One of frame 18's skeleton pills (S8.8; Figma "Skeleton pill" 7062:51206–7062:51208), in place
 * of a chip while the personas are first generated: white, 1px decorative border, 40px high,
 * round. Decorative: the row's status reads out the loading
 */
export default function SkeletonPill({ width }: SkeletonPillProps) {
  return (
    <div
      className={`bg-kern-layout-background-default h-40 shrink-0 rounded-full border border-(--kern-color-decorative-border-default) ${width}`}
    />
  );
}
