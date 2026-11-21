import chainLoginWhite from '../../assets/illustrations/chain-login-white@2x.webp';
import TopBar from '../TopBar';
import AuthIntro from './AuthIntro';
import {
  AUTH_CARD_SLOT_CLASSES,
  AUTH_CHAIN_CLASSES,
  AUTH_CHAIN_LAYER_CLASSES,
  AUTH_MAIN_CLASSES,
} from './constants';
import type { AuthLayoutProps } from './types';

/**
 * The frame of the signed-out screens L1 (Figma "New visuals" 7741:61919 and its states
 * 7771:69071, 7771:69113, 7771:69166, 7771:69220, 7771:69274; bug new-visuals B1), for sign-in
 * and forgot password: the blue surface (`action-default`, 7741:61920) over the whole window, the
 * white chain at its top right (`chain-login-white`, 1552px, decorative), the hero on the left
 * and the page's card on the right, 120px and 144px from the edges (constants.ts has the
 * narrower pages). The chain lies in a clip layer of its own, so that nothing clips the sticky
 * header, and behind everything else on the surface (`isolate`, `-z-10`), also where the header
 * scrolls away with the page. The header holds only the language switch (spec 009), and turns
 * the surface's blue once the page has scrolled.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-kern-action-default @container relative isolate flex min-h-dvh flex-col">
      <div aria-hidden="true" className={AUTH_CHAIN_LAYER_CLASSES}>
        <img
          src={chainLoginWhite}
          alt=""
          aria-hidden="true"
          width={1552}
          height={1552}
          className={AUTH_CHAIN_CLASSES}
        />
      </div>
      <TopBar brandSurface />
      {/* Starts under the 64px header area, so that the content centres in the whole window */}
      <main className={`-mt-64 ${AUTH_MAIN_CLASSES}`}>
        <AuthIntro />
        <div className={AUTH_CARD_SLOT_CLASSES}>{children}</div>
      </main>
    </div>
  );
}
