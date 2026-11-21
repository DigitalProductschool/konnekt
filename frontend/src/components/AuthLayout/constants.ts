import { defineTexts } from '@connection-portal/rules/language';

/** The signed-out screens' headline and tagline (G§2 "wallet, EUDI Wallet") */
export const AUTH_INTRO_COPY = defineTexts(
  {
    headline: 'Connect to the EUDI Wallet',
    lead: 'Receive verified citizen data with ease',
  },
  {
    headline: 'Mit der EUDI-Wallet verbinden',
    lead: 'Geprüfte Daten von Bürgerinnen und Bürgern einfach empfangen',
  }
);

/*
 * The widths of the sign-in screens (bug new-visuals B1; Figma "New visuals" 7741:61919 draws
 * 1440 × 900 only), as container queries on the page's width (the scrollbar gutter excluded).
 * From 1125px the hero sits 120px from the left edge and the card 144px from the right (120 +
 * 373 + 48 + 440 + 144 = 1125); from 1021px both are 80px from the edges, at least 48px apart
 * (80 + 373 + 48 + 440 + 80); below, the hero stacks above the card in one column of at most
 * 440px. Side by side the hero is centred in the window and the card 15px lower, as every state
 * draws it (its 30px top margin): the main region starts under the 64px header area.
 */
export const AUTH_MAIN_CLASSES =
  'flex min-h-dvh flex-col justify-center gap-40 px-16 pt-104 pb-40 @min-[1021px]:flex-row @min-[1021px]:items-center @min-[1021px]:justify-between @min-[1021px]:gap-48 @min-[1021px]:px-80 @min-[1021px]:py-80 @min-[1125px]:pr-144 @min-[1125px]:pl-120';

/** The hero (7741:61945): the logo, 42px to the headline, 16px to the tagline; 373px wide */
export const AUTH_INTRO_CLASSES =
  'mx-auto flex w-full max-w-440 flex-col items-start @min-[1021px]:mx-0 @min-[1021px]:w-373 @min-[1021px]:max-w-none @min-[1021px]:shrink-0';

export const AUTH_CARD_SLOT_CLASSES =
  'mx-auto w-full max-w-440 @min-[1021px]:mx-0 @min-[1021px]:mt-30 @min-[1021px]:w-440 @min-[1021px]:shrink-0';

/*
 * The chain (7756:105819, `chain-login-white`, 1552 × 1552) in its clip layer: top −191, and
 * pinned 458px past the right edge (left 100% − 1094px) from 1400px. In narrower pages it holds
 * where its first visible pixel (x 211 of its box) stays 24px right of the hero: at left 306px
 * from 1125px (120 + 373 + 24 − 211) and 266px from 1021px (80 + 373 + 24 − 211). The stacked
 * layout shows no chain, which would lie under the white text there
 */
export const AUTH_CHAIN_LAYER_CLASSES =
  'pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden @min-[1021px]:block';
export const AUTH_CHAIN_CLASSES =
  'absolute -top-191 left-[max(100%-1094px,266px)] h-1552! w-1552 max-w-none! @min-[1125px]:left-[max(100%-1094px,306px)]';
