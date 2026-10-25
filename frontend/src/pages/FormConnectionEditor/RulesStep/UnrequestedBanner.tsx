import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import { RULES_COPY } from './constants';
import type { UnrequestedBannerProps } from './types';
import UnrequestedRuleLine from './UnrequestedRuleLine';

/**
 * Figma "Problems banner" (U27 6197:10696): the rules that check data that is no longer
 * requested, each named with its branch (F11). Publishing and saving stay available and are
 * refused while they remain.
 */
export default function UnrequestedBanner({ rules }: UnrequestedBannerProps) {
  return (
    <div className="p-8">
      <KernAlert
        variant="danger"
        title={RULES_COPY.unrequestedTitle(rules.length)}
        className="w-full"
      >
        {rules.map(({ rule, branchName }) => (
          <UnrequestedRuleLine
            key={`${branchName}-${rule.id}`}
            ruleName={rule.name}
            branchName={branchName}
          />
        ))}
      </KernAlert>
    </div>
  );
}
