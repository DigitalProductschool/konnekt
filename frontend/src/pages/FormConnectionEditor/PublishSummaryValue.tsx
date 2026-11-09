import type { PublishSummaryValueProps } from './types';

/**
 * One line of a summary row: a document's count, "Personal ID · 7 data items", or a variant's
 * under its current name, "Standard · 2 rules" (FR-044b; a renamed Standard reads "Taxi and
 * rental cars · 5 rules", U63 7112:48859).
 */
export default function PublishSummaryValue({ value }: PublishSummaryValueProps) {
  return <span>{value}</span>;
}
