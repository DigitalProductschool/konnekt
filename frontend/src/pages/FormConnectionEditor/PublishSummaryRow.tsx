import PublishSummaryValue from './PublishSummaryValue';
import type { PublishSummaryRowProps } from './types';

/** A row of the publish dialog's summary (U33): its label in the action colour, then its lines. */
export default function PublishSummaryRow({
  label,
  values,
  divided = false,
}: PublishSummaryRowProps) {
  return (
    <div
      className={`text-kern-static-medium flex items-start gap-16 px-16 py-8 leading-(--kern-typography-line-height-medium-static) ${divided ? 'border-b border-(--kern-color-decorative-border-default)' : ''}`}
    >
      <dt className="text-kern-action-default w-112 shrink-0 font-semibold">{label}</dt>
      <div className="text-kern-layout-text-default flex min-w-0 flex-1 flex-col">
        {values.map((value) => (
          <PublishSummaryValue key={value} value={value} />
        ))}
      </div>
    </div>
  );
}
