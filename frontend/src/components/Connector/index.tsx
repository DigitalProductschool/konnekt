import { CONNECTOR_LABELS } from './constants';
import type { ConnectorProps } from './types';

/**
 * Figma "Connector · AND" (U14 6094:6511): the level's AND or OR on the line between two of its
 * rules and groups, with the row's padding. Read-only: the design's chevron, which opens the menu
 * that switches the level, comes with switching (FR-007).
 */
export default function Connector({ operator }: ConnectorProps) {
  return (
    <div className="flex px-24 py-8">
      <div className="flex flex-1 items-center gap-8">
        {/* Figma's `circle` radius on a pill: KERN 2.8's 50% would draw an ellipse */}
        <span className="bg-kern-action-default text-kern-static-small text-kern-action-on-default rounded-full px-16 py-2 leading-(--kern-typography-line-height-medium-static) font-semibold">
          {CONNECTOR_LABELS[operator]}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-(--kern-color-decorative-brand-default)"
        />
      </div>
    </div>
  );
}
