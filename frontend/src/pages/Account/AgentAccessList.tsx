import { useId } from 'react';

import AgentAccessRow from './AgentAccessRow';
import type { AgentAccessListProps } from './types';

/**
 * One section of the user page (S2), "Connected agents" or "Personal access tokens": its heading
 * with an optional action, then a `ul` with one `li` per item, or the empty state. A ⋯ menu that
 * fits on neither side of its ⋯ opens across the section, its nearest positioned box.
 */
export default function AgentAccessList({
  heading,
  empty,
  items,
  levels,
  now,
  action,
  onChangeLevel,
  onRevoke,
}: AgentAccessListProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="relative flex flex-col gap-16">
      <div className="flex flex-wrap items-center justify-between gap-16">
        <h2
          id={headingId}
          className="text-kern-adaptive-large text-kern-layout-text-default leading-(--kern-typography-line-height-large-adaptive) font-semibold"
        >
          {heading}
        </h2>
        {action}
      </div>
      {items.length === 0 ? (
        <p className="text-kern-static-medium text-kern-layout-text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-8">
          {items.map((item) => (
            <AgentAccessRow
              key={item.id}
              item={item}
              levels={levels}
              now={now}
              onChangeLevel={onChangeLevel}
              onRevoke={onRevoke}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
