import type { DescriptionLineProps } from './types';

/**
 * The connection's description as the details header shows it (spec 006, R6): one line at every
 * width, cut with "…", with no `title` attribute, since the element holds the whole text for
 * assistive technology. The caller leaves it out when the description is empty.
 */
export default function DescriptionLine({ description }: DescriptionLineProps) {
  return (
    <p className="text-kern-static-medium text-kern-layout-text-muted max-w-full min-w-0 truncate">
      {description}
    </p>
  );
}
