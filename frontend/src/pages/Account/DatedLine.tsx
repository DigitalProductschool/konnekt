import type { DatedLineProps } from './types';

/** "Connected 05.10.2026, 14:32", "Last used 3 days ago": the words, then the date in a `time` */
export default function DatedLine({ text }: DatedLineProps) {
  return (
    <span>
      {text.prefix} <time dateTime={text.datetime}>{text.date}</time>
    </span>
  );
}
