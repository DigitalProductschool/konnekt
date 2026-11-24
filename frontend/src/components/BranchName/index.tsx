import { tabLabelOf } from '@konnekt/rules/checks/findingMessages';

import { useLanguage } from '../../hooks/useLanguage';
import InfoTooltip from '../InfoTooltip';
import { BRANCH_NAME_COPY, FINDINGS_ICONS, TAB_BUTTON, TAB_INDICATOR, TAB_TEXT } from './constants';
import FindingsSegment from './FindingsSegment';
import type { BranchIconProps, BranchNameProps, BranchTabButtonProps } from './types';

/**
 * The icon after a variant's name (FR-041, build note 26): with findings or a problem, their icon
 * (the warning triangle, the blue ⓘ, the red error diamond), named "Ambulance has findings", its
 * tooltip the description, if any, then the findings segment (U46 6758:43524); without them, the
 * grey ⓘ of the description (F31); nothing without a description (FR-035c; FR-041 as clarified on
 * 2026-11-18, which drops FR-041b's "No findings." ⓘ). The tooltip opens on hover, keyboard focus
 * and a tap (T022)
 */
function BranchIcon({ label, description, findings }: BranchIconProps) {
  const { language } = useLanguage();
  const copy = BRANCH_NAME_COPY[language];
  if (findings) {
    return (
      <InfoTooltip
        label={tabLabelOf(label, language)}
        icon={FINDINGS_ICONS[findings.kind]}
        iconSize="small"
        text={
          <>
            {description && <span className="break-words">{description}</span>}
            <FindingsSegment findings={findings} divided={Boolean(description)} />
          </>
        }
      />
    );
  }
  return description ? (
    <InfoTooltip label={copy.about(label)} text={description} iconSize="small" />
  ) : null;
}

/**
 * The tab itself: one control holding the name only, the icon and the ⋯ being buttons beside it
 * (the component's note: no control inside a tab). With findings, its accessible name says so,
 * "Ambulance has findings" (W13, 003-S4.4), so that moving through the tabs tells it
 */
function BranchTabButton({
  id,
  panelId,
  selected,
  onSelect,
  onKeyDown,
  name,
  label,
}: BranchTabButtonProps) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      aria-label={label}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`${TAB_BUTTON} ${selected ? TAB_TEXT.selected : TAB_TEXT.unselected}`}
    >
      {name}
    </button>
  );
}

/**
 * A variant's name with the icon after it (FR-041, FR-046; Figma "Rules/Variant tab · fixes"
 * 6529:39174, a KERN extension: kit P29 Tabs draws no tab). Given `tab`, it is the variant tab
 * (design-notes §3 "Tabs"): the label row (the tab with the name, 4px, the 20px icon, 4px, the
 * `actions` such as the active tab's ⋯) 4px under the tab's top, then, 8px under it, the 2px
 * indicator across the tab, black while selected (U38 6134:9153, U46 6758:43058, U59
 * 6523:37256, U71 7058:61618). Without `tab`, `children` show the name, such as a heading, and
 * the icon sits beside them, out of their name.
 */
export default function BranchName({
  name,
  description,
  findings,
  tab,
  actions,
  children,
}: BranchNameProps) {
  const { language } = useLanguage();
  const label = name.trim();
  const icon = (
    <BranchIcon label={label} description={description?.trim() ?? ''} findings={findings} />
  );
  if (!tab) {
    return (
      <div className="flex min-w-0 items-center gap-4">
        {children ?? <span className="min-w-0 break-words">{name}</span>}
        {icon}
        {actions}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-8 pt-4">
      <div className="flex min-h-24 min-w-0 items-center gap-4">
        <BranchTabButton
          {...tab}
          name={name}
          label={findings ? tabLabelOf(label, language) : undefined}
        />
        {icon}
        {actions}
      </div>
      <span
        aria-hidden="true"
        className={`h-2 w-full ${tab.selected ? TAB_INDICATOR.selected : TAB_INDICATOR.unselected}`}
      />
    </div>
  );
}
