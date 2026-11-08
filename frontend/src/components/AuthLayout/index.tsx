import TopBar from '../TopBar';
import AuthIntro from './AuthIntro';
import {
  AUTH_CARD_SLOT_CLASSES,
  AUTH_MAIN_CLASSES,
  AUTH_PAGE_BACKGROUND_CLASSES,
} from './constants';
import type { AuthLayoutProps } from './types';

/**
 * The frame of the signed-out screens L1 (Figma U10 "1 · Log in" 6401:27994 and "4 · Forgot
 * password" 6401:28457; build notes U02 #11–#14, U03 #33): the white Konnekt pill and no
 * account pill, the login art and the tagline pinned to the left edge, the page's card 153px
 * from the right edge, both centred vertically in the window (under the header pills). Narrower
 * pages slide the art left, then hide it with the tagline and the card 80px from the edges;
 * below 990px the tagline sits above the card, full width at 320px (W2). No DE/EN switch (F6).
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={`${AUTH_PAGE_BACKGROUND_CLASSES} @container flex min-h-dvh flex-col`}>
      <TopBar signedOut />
      {/* Starts under the 64px header area, so that the content centres in the whole window */}
      <main className={`-mt-64 ${AUTH_MAIN_CLASSES}`}>
        <AuthIntro />
        <div className={AUTH_CARD_SLOT_CLASSES}>{children}</div>
      </main>
    </div>
  );
}
