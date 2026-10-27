import checkIcon from '../../assets/icons/done-action-small.svg';
import { CONNECTOR_LABELS } from './constants';
import type { ConnectorOptionProps } from './types';

/**
 * An operator of Figma "Rules/Connector menu" (U14 6094:7052): its label and what it means. The
 * chosen one is tinted, in the action colour and ticked.
 */
export default function ConnectorOption({
  operator,
  description,
  checked,
  onChoose,
}: ConnectorOptionProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      onClick={onChoose}
      className={`text-kern-static-small rounded-kern-small focus-visible:outline-kern-action-focus-default flex w-full cursor-pointer items-center gap-8 p-8 text-left leading-(--kern-typography-line-height-medium-static) focus-visible:outline-4 focus-visible:-outline-offset-4 ${checked ? 'bg-kern-layout-background-hued' : 'hover:bg-kern-neutral-050 focus-visible:bg-kern-neutral-050'}`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`font-semibold ${checked ? 'text-kern-action-default' : 'text-kern-layout-text-default'}`}
        >
          {CONNECTOR_LABELS[operator]}
        </span>
        <span className="text-kern-layout-text-muted">{description}</span>
      </span>
      {checked && <img src={checkIcon} alt="" className="size-20 shrink-0" />}
    </button>
  );
}
