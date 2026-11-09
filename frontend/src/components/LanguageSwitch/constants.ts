// "Pill · Language (globe + DE | EN)" (Figma 7341:101654; spec 009, research R2,
// contracts/language-switch.md, design-notes §1)
import { defineTexts, type Language } from '@connection-portal/rules/language';

import { FOCUS_RING_CLASSES, PILL_CLASSES } from '../TopBar/constants';

/** The group's name, in the current language (G§2 "language switch") */
export const LANGUAGE_SWITCH_COPY = defineTexts({ language: 'Language' }, { language: 'Sprache' });

/** Each button's visible label, a prefix of the language's own name (WCAG 2.5.3) */
export const LANGUAGE_LABELS: Record<Language, string> = { de: 'DE', en: 'EN' };

/** The buttons in the design's order: DE, then EN */
export const SWITCH_ORDER: readonly Language[] = ['de', 'en'];

/** The pill: the header's pill base, light blue, 4px inside and between the segments */
export const SWITCH_CLASSES = `${PILL_CLASSES} bg-kern-layout-background-hued gap-4 px-4`;

/** A segment: 40px, round, its label/small text centred (14/24, 600) */
export const SEGMENT_CLASSES = `motion rounded-kern-circle text-kern-static-small flex size-40 items-center justify-center leading-(--kern-typography-line-height-medium-static) font-semibold transition-colors duration-(--duration-colour) ${FOCUS_RING_CLASSES}`;

/**
 * The current language: white with its own shadow, the default ink (D2). White is KERN's
 * `layout-background-default`: the KERN theme resets Tailwind's colours, so `bg-white` is no class
 */
export const CURRENT_SEGMENT_CLASSES =
  'shadow-segment text-kern-layout-text-default bg-kern-layout-background-default';

/** The other language: muted ink (D1, the AA fix), spec 008's hover shade (D3) */
export const OTHER_SEGMENT_CLASSES = 'text-kern-layout-text-muted hover:bg-kern-action-default/8';
