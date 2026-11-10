import checkIcon from '../../assets/icons/done-action-small.svg';
import { useCopy } from '../../hooks/useLanguage';
import { CONNECTOR_COPY, CONNECTOR_OPTION_STATES } from './constants';
import type { ConnectorOptionProps } from './types';

/**
 * An operator of Figma "Rules/Connector menu" (U34 6094:7052): its label (label/small) over what
 * it means (body/small, muted), 8px padding, radius 4. The chosen one is tinted
 * (`layout-background-hued`), its label in the action colour, with the 20px tick. Hover and
 * pressed are the kit's "states" layers; keyboard focus fills it with the focus colour and turns
 * its texts and tick white (P33 2:2406), as the ⋯ menus' entries do.
 */
export default function ConnectorOption({
  operator,
  description,
  checked,
  onChoose,
}: ConnectorOptionProps) {
  const copy = useCopy(CONNECTOR_COPY);
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      onClick={onChoose}
      className={`group text-kern-static-small rounded-kern-small flex w-full shrink-0 cursor-pointer items-center gap-8 p-8 text-left leading-(--kern-typography-line-height-medium-static) ${CONNECTOR_OPTION_STATES} ${checked ? 'bg-kern-layout-background-hued' : ''}`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`group-focus-visible:text-kern-layout-text-inverse font-semibold ${checked ? 'text-kern-action-default' : 'text-kern-layout-text-default'}`}
        >
          {copy.labels[operator]}
        </span>
        <span className="text-kern-layout-text-muted group-focus-visible:text-kern-layout-text-inverse">
          {description}
        </span>
      </span>
      {checked && (
        <img
          src={checkIcon}
          alt=""
          className="size-20 shrink-0 group-focus-visible:brightness-0 group-focus-visible:invert"
        />
      )}
    </button>
  );
}
