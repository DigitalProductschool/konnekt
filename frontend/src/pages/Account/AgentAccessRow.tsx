import ActionMenu from '../../components/ActionMenu';
import { useLanguage } from '../../hooks/useLanguage';
import { ACCOUNT_COPY, ROW_CLASSES } from './constants';
import DatedLine from './DatedLine';
import type { AgentAccessRowProps } from './types';
import { rowTextsOf } from './utils';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * One agent connection or personal access token (S20; 007-S2.3, S2.6): its name (label/default),
 * its access level, then, muted, when it was connected or created, when a token expires and when
 * it was last used, each date a `time` with its timestamp; and its ⋯ menu (`ActionMenu`, T021)
 * with "Change access level" and, after the divider, "Revoke" in red, as the rule menus put the
 * destructive entry last (§3 "Menu").
 */
export default function AgentAccessRow({
  item,
  levels,
  now,
  onChangeLevel,
  onRevoke,
}: AgentAccessRowProps) {
  const { language } = useLanguage();
  const copy = ACCOUNT_COPY[language];
  const texts = rowTextsOf(item, now, language, levels);
  return (
    <li className={ROW_CLASSES}>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words">
          {texts.name}
        </p>
        <p className={`${SMALL_TEXT} text-kern-layout-text-default`}>{texts.level}</p>
        <p className={`${SMALL_TEXT} text-kern-layout-text-muted flex flex-wrap gap-x-16 gap-y-4`}>
          <DatedLine text={texts.since} />
          {texts.expires && <DatedLine text={texts.expires} />}
          {texts.lastUse ? <DatedLine text={texts.lastUse} /> : <span>{copy.neverUsed}</span>}
        </p>
      </div>
      <ActionMenu
        label={copy.menuLabel(texts.name)}
        actions={[
          {
            label: copy.changeLevel,
            icon: { kern: 'kern-icon--edit' },
            onSelect: () => onChangeLevel(item),
          },
          {
            label: copy.revoke,
            icon: { kern: 'kern-icon--delete' },
            danger: true,
            separated: true,
            onSelect: () => onRevoke(item),
          },
        ]}
      />
    </li>
  );
}
