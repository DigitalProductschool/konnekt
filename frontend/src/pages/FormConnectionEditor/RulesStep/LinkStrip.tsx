import linkIcon from '../../../assets/icons/link.svg';
import { useLanguage } from '../../../hooks/useLanguage';
import { RULES_STEP_COPY } from './constants';
import type { LinkStripProps } from './types';
import { linkStripSummaryOf } from './utils';

/**
 * Figma "Rules/Link strip" (U18 6344:60020; U47 6344:60085): the first element of a based
 * variant's rules card, flush to its top, saying that what the variant doesn't change follows
 * Standard (FR-021), after what it removed of Standard's: "2 of 3 Standard rules are removed
 * here." or "Group 01 is removed here." (FR-051 (38); `linkStripSummaryOf`). It stays while
 * Standard has no rules (F37). The linked rules themselves carry no icon (FYI #10; decision
 * 2026-10-25, design-notes §4).
 */
export default function LinkStrip({ branch, mainName }: LinkStripProps) {
  const { language } = useLanguage();
  const copy = RULES_STEP_COPY[language];
  const summary = linkStripSummaryOf(branch, mainName, language);
  return (
    <p className="bg-kern-feedback-info-background text-kern-static-small text-kern-feedback-info rounded-t-kern-large flex flex-wrap items-center gap-8 p-16 leading-(--kern-typography-line-height-medium-static)">
      <img src={linkIcon} alt="" className="size-20 shrink-0" />
      <span className="font-semibold">{copy.linkedTo(mainName)}</span>
      {/* A word longer than the column beside the label breaks inside it (R9; at 320px the
          German "aktualisiert." ran past the strip; spec 009, T046) */}
      <span className="min-w-0 flex-1 break-words">
        {summary && `${summary} `}
        {copy.linkedText(mainName)}
      </span>
    </p>
  );
}
