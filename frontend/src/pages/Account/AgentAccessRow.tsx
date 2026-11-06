import ActionMenu from '../../components/ActionMenu';
import { ACCOUNT_COPY } from './constants';
import DatedLine from './DatedLine';
import type { AgentAccessRowProps } from './types';
import { rowTextsOf } from './utils';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * One agent connection or personal access token (S2): its name and access level, when it was
 * connected or created, when a token expires, when it was last used, and its ⋯ menu with
 * "Change access level" and "Revoke". Each date is a `time` with its timestamp.
 */
export default function AgentAccessRow({
  item,
  levels,
  now,
  onChangeLevel,
  onRevoke,
}: AgentAccessRowProps) {
  const texts = rowTextsOf(item, now, levels);
  return (
    <li className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex items-start gap-16 border py-12 pr-12 pl-16">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-kern-static-medium text-kern-layout-text-default font-semibold break-words">
          {texts.name}
        </p>
        <p className={`${SMALL_TEXT} text-kern-layout-text-default`}>{texts.level}</p>
        <p className={`${SMALL_TEXT} text-kern-layout-text-muted flex flex-wrap gap-x-16 gap-y-4`}>
          <DatedLine text={texts.since} />
          {texts.expires && <DatedLine text={texts.expires} />}
          {texts.lastUse ? (
            <DatedLine text={texts.lastUse} />
          ) : (
            <span>{ACCOUNT_COPY.neverUsed}</span>
          )}
        </p>
      </div>
      <ActionMenu
        label={ACCOUNT_COPY.menuLabel(texts.name)}
        actions={[
          {
            label: ACCOUNT_COPY.changeLevel,
            icon: { kern: 'kern-icon--edit' },
            onSelect: () => onChangeLevel(item),
          },
          {
            label: ACCOUNT_COPY.revoke,
            icon: { kern: 'kern-icon--delete' },
            danger: true,
            onSelect: () => onRevoke(item),
          },
        ]}
      />
    </li>
  );
}
