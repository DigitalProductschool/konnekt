import linkIcon from '../../../assets/icons/link.svg';
import { RULES_COPY } from './constants';
import type { LinkStripProps } from './types';

/**
 * Figma "Rules/Link strip" (U18 6344:60020): the first element of a based variant's rules card,
 * flush to its top, saying that what the variant doesn't change follows Standard (FR-021). The
 * linked rules themselves carry no icon (FYI #10; decision 2026-10-25, design-notes §4).
 */
export default function LinkStrip({ mainName }: LinkStripProps) {
  return (
    <p className="bg-kern-feedback-info-background text-kern-static-small text-kern-feedback-info rounded-t-kern-large flex flex-wrap items-center gap-8 p-16 leading-(--kern-typography-line-height-medium-static)">
      <img src={linkIcon} alt="" className="size-20 shrink-0" />
      <span className="font-semibold">{RULES_COPY.linkedTo(mainName)}</span>
      <span className="min-w-0 flex-1">{RULES_COPY.linkedText(mainName)}</span>
    </p>
  );
}
