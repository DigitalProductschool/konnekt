import { SKELETON_BARS } from './constants';
import type { SkeletonResultRowProps } from './types';

/**
 * A row of the skeleton result card (S8.8; F14; Figma U74 "row" 7062:51229, 7062:51516): the 16px
 * round placeholder of the status icon, 12px, then the rule column with the name's strong bar
 * and, below it, the statement's light bar (F14: Figma's rows have no statement yet), then the
 * message's light bar. Figma puts the message 60px after each name; here it starts where the
 * message column does, 340px in, as in the result table. The bars are 10px high, their centres
 * level with the icon's; 4px radius, the icon's placeholder round
 */
export default function SkeletonResultRow({ name, statement, message }: SkeletonResultRowProps) {
  const bar = 'rounded-kern-small h-10 max-w-full';
  return (
    <div className="flex items-start gap-12">
      <div className={`rounded-kern-circle size-16 shrink-0 ${SKELETON_BARS.strong}`} />
      <div className="flex w-300 min-w-0 flex-col gap-8 pt-3">
        <div className={`${bar} ${name} ${SKELETON_BARS.strong}`} />
        <div className={`${bar} ${statement} ${SKELETON_BARS.light}`} />
      </div>
      <div className="min-w-0 flex-1 pt-3">
        <div className={`${bar} ${message} ${SKELETON_BARS.light}`} />
      </div>
    </div>
  );
}
