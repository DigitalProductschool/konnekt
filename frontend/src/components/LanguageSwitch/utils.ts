import { LANGUAGE_SWITCH_ATTRIBUTE } from './constants';

/**
 * Whether an event's target is in the header's language switch (spec 009): a popup that closes on
 * a press outside it treats a press on the switch as none, so that switching keeps the popup and
 * what is typed into it (FR-003)
 */
export function isLanguageSwitchTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${LANGUAGE_SWITCH_ATTRIBUTE}]`) !== null;
}
