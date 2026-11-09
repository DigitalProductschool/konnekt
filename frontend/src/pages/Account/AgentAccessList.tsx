import { useId } from 'react';

import AgentAccessRow from './AgentAccessRow';
import { EMPTY_CARD_CLASSES, LIST_CARD_CLASSES } from './constants';
import type { AgentAccessListProps } from './types';

/**
 * One section of the account page (S20; W16), "Connected agents" or "Personal access tokens":
 * its heading with an optional action, then the list card, a `ul` with one row per item, each
 * with its ⋯ menu as the rule rows have (T021), or, while empty, the sentence in the light blue
 * card (§3 "Empty state"). A ⋯ menu that fits on neither side of its ⋯ opens across the section,
 * its nearest positioned box; nothing between them clips it (V6).
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
        <p className={EMPTY_CARD_CLASSES}>{empty}</p>
      ) : (
        <ul className={LIST_CARD_CLASSES}>
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
