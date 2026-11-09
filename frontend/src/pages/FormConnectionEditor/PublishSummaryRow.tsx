import PublishSummaryValue from './PublishSummaryValue';
import type { PublishSummaryRowProps } from './types';

/**
 * A row of the publish dialog's summary ("Row · Documents" / "Row · Rules", U73 7058:62120,
 * U77 6760:47979): padding 8 16, the 112 px label in label/default and the action colour, 16 px,
 * then its lines in body/default, which are one definition of the label. Below 640px the lines go
 * under the label, which would leave them too little room beside it.
 */
export default function PublishSummaryRow({
  label,
  values,
  divided = false,
}: PublishSummaryRowProps) {
  return (
    <div
      className={`text-kern-static-medium flex items-start gap-16 px-16 py-8 leading-(--kern-typography-line-height-medium-static) max-sm:flex-col max-sm:gap-4 ${divided ? 'border-b border-(--kern-color-decorative-border-default)' : ''}`}
    >
      <dt className="text-kern-action-default w-112 shrink-0 font-semibold max-sm:w-auto">
        {label}
      </dt>
      <dd className="text-kern-layout-text-default flex min-w-0 flex-1 flex-col">
        {values.map((value) => (
          <PublishSummaryValue key={value} value={value} />
        ))}
      </dd>
    </div>
  );
}
