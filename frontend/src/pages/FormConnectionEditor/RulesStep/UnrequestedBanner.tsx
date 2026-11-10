import { useCopy } from '../../../hooks/useLanguage';
import { RULES_STEP_COPY, UNREQUESTED_BANNER_CLASSES } from './constants';
import type { UnrequestedBannerProps } from './types';
import UnrequestedRuleLine from './UnrequestedRuleLine';

/**
 * The unrequested-data banner (F11, F58, C5; Figma U50 6863:47363, 7173:52333: "Rules/Findings
 * banner" in the danger kind, no title), first in the rules card's list: one line per rule that
 * checks data no longer requested, in every variant, each naming its variant (FR-023c), then
 * "Add it in Documents", which opens the documents step and asks "Save changes to Rule 01?" first
 * while a rule is open (FR-023f, 002-S2.25). It stays while such a rule remains; a refused
 * attempt adds the server's message above the card and moves the focus to the rule (002-S2.24).
 * It is announced when it appears (`role="alert"`, as the baseline's KERN alert was).
 */
export default function UnrequestedBanner({ rules, onAddData }: UnrequestedBannerProps) {
  const copy = useCopy(RULES_STEP_COPY);
  return (
    <div role="alert" className={UNREQUESTED_BANNER_CLASSES}>
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-8">
        {rules.map(({ key, text }) => (
          <UnrequestedRuleLine key={key} text={text} />
        ))}
      </div>
      <button
        type="button"
        onClick={onAddData}
        className="text-kern-action-default rounded-kern-small focus-visible:outline-kern-action-focus-default text-kern-static-small shrink-0 cursor-pointer leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap hover:underline focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        {copy.addInDocuments}
      </button>
    </div>
  );
}
