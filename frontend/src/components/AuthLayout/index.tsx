import TopBar from '../TopBar';
import AuthIntro from './AuthIntro';
import { CARD_ALIGN_CLASSES } from './constants';
import type { AuthLayoutProps } from './types';

/**
 * The frame of the signed-out screens (Figma "01 Log in" and "01b Forgot password"): the
 * top bar, then the intro on the left and the page's card on the right. Narrow screens
 * stack them.
 */
export default function AuthLayout({ children, cardAlign = 'center' }: AuthLayoutProps) {
  return (
    <div className="bg-kern-neutral-025 flex min-h-screen flex-col">
      <TopBar />
      <main className="flex flex-1 items-center px-16 py-40">
        <div
          className={`mx-auto grid w-full max-w-1120 gap-40 min-[1152px]:grid-cols-[600px_440px] min-[1152px]:gap-x-80 ${CARD_ALIGN_CLASSES[cardAlign]}`}
        >
          <AuthIntro />
          <div className="w-full max-w-440">{children}</div>
        </div>
      </main>
    </div>
  );
}
