import { SKELETON_BARS } from './constants';
import type { SkeletonDataRowProps } from './types';

/**
 * A row of the skeleton data card (S8.8; Figma "row" 7062:51214, 7062:51501): the label's light
 * bar, 90px, then 24px further the value's strong bar; 10px high, 4px radius
 */
export default function SkeletonDataRow({ value }: SkeletonDataRowProps) {
  return (
    <div className="flex items-start gap-24">
      <div className={`rounded-kern-default h-10 w-90 min-w-0 ${SKELETON_BARS.light}`} />
      <div className={`rounded-kern-default h-10 min-w-0 ${value} ${SKELETON_BARS.strong}`} />
    </div>
  );
}
