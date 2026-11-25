// "Shell/Header · two pills" and "Shell/Header · in a connection" (Figma U11 6699:44242,
// U17 7173:52658, U10 6701:39367; build notes U03 #29–#40)
import { defineTexts } from '@konnekt/rules/language';

/**
 * The second pill's texts (G§2 "connection"): its link home (U17 7173:52658) and its landmark,
 * which says where you are ("Brotkrümelnavigation", as KERN names it)
 */
export const TOP_BAR_COPY = defineTexts(
  { yourConnections: 'Your connections', breadcrumb: 'Breadcrumb' },
  { yourConnections: 'Ihre Anbindungen', breadcrumb: 'Brotkrümelnavigation' }
);

/** A header pill: 48px, fully round, the card's elevation (U11 6699:44242) */
export const PILL_CLASSES = 'rounded-kern-circle shadow-card flex h-48 items-center';

/** Keyboard focus on a link in the header: KERN's 4px ring, 2px off */
export const FOCUS_RING_CLASSES =
  'focus-visible:outline-kern-action-focus-default focus-visible:outline-4 focus-visible:outline-offset-2';

/** Text in the header: 14/24 (label/small, body/small) */
export const SMALL_TEXT_CLASSES =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static) whitespace-nowrap';
