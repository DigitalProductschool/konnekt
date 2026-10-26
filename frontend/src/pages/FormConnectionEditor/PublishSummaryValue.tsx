import type { PublishSummaryValueProps } from './types';

/** One line of a summary row, such as "Personal ID · 7 data items" or "Standard · 2 rules". */
export default function PublishSummaryValue({ value }: PublishSummaryValueProps) {
  return <span>{value}</span>;
}
