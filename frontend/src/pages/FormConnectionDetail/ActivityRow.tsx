import { useLanguage } from '../../hooks/useLanguage';
import { ACTIVITY_ROW_CLASSES } from './constants';
import type { ActivityRowProps } from './types';
import { activityDateTimeOf, activityEventOf, activityPersonOf } from './utils';

/**
 * One entry of the Activity card's list (S15, W10; U86 6396:48528, U95 7246:54526, U97
 * 7246:58071): "date and time · event · person" in a row, 16 apart, the date and time 160 wide,
 * the event in label/small taking the rest, the person at the right end (a third of the row at
 * most, then it wraps); an entry without a person (the middleware's, a backfilled one; FR-027,
 * FR-032) leaves the place empty. Below `sm` the three parts stack (W16)
 */
export default function ActivityRow({ entry }: ActivityRowProps) {
  const { language } = useLanguage();
  const person = activityPersonOf(entry.actor, language);
  return (
    <li className={ACTIVITY_ROW_CLASSES}>
      <time dateTime={entry.at} className="shrink-0 sm:w-160">
        {activityDateTimeOf(entry, language)}
      </time>
      <span className="font-semibold sm:min-w-px sm:flex-[1_0_0]">
        {activityEventOf(entry, language)}
      </span>
      {person && <span className="sm:max-w-1/3 sm:shrink-0 sm:text-right">{person}</span>}
    </li>
  );
}
