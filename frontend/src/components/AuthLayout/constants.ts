import { defineTexts } from '@connection-portal/rules/language';

/** The signed-out screens' tagline (G§2 "wallet, EUDI Wallet") */
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

/**
 * Figma "Rectangle 1" (U10 6685:103961): the light blue page with a green glow from the bottom
 * left, the gradient over `layout-background-hued`
 */
export const AUTH_PAGE_BACKGROUND_CLASSES =
  'bg-kern-layout-background-hued bg-[linear-gradient(249.8deg,rgb(255_255_255/0)_29.524%,rgb(164_209_225/0.15)_61.246%,rgb(73_195_128/0.3)_92.968%)]';

/*
 * The widths of build note 14 (U02), as container queries on the page's width (the scrollbar
 * gutter excluded): from 990px the tagline and the card sit side by side, 80px from the edges
 * and at least 48px apart (80 + 342 + 48 + 440 + 80); from 1234px the art shows, pinned to the
 * left edge, and the card moves to 153px from the right edge. Below 1374px the art and the
 * tagline slide left (up to 140px, reached at 1234px) so that the tagline keeps 48px from the
 * card: `100% - 1221px` is the page width less 153 (the card's margin) less 1221, as
 * 1374 - 153 (= 331 + 60 + 342 + 48 + 440 + 153 - 153).
 */
export const AUTH_MAIN_CLASSES =
  'flex min-h-dvh flex-col justify-center gap-40 px-16 pt-104 pb-40 @min-[990px]:flex-row @min-[990px]:items-center @min-[990px]:justify-between @min-[990px]:gap-48 @min-[990px]:px-80 @min-[990px]:py-80 @min-[1234px]:pr-153 @min-[1234px]:pl-0';

export const AUTH_INTRO_CLASSES =
  'mx-auto flex w-full max-w-440 items-center gap-60 @min-[990px]:mx-0 @min-[990px]:w-auto @min-[990px]:max-w-none @min-[990px]:shrink-0 @min-[1234px]:-my-80 @min-[1234px]:ml-[clamp(-140px,100%_-_1221px,0px)]';

export const AUTH_CARD_SLOT_CLASSES =
  'mx-auto w-full max-w-440 @min-[990px]:mx-0 @min-[990px]:w-440 @min-[990px]:shrink-0';
