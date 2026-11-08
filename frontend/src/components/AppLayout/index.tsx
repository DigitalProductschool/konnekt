import { useLocation } from 'react-router';

import { ROUTES } from '../../constants';
import TopBar from '../TopBar';
import UserMenu from '../UserMenu';
import type { AppLayoutProps } from './types';

/**
 * The frame of the signed-in screens outside the wizard (the overview, the welcome page, the
 * consent, account and approval pages; L2): the header pills (TopBar, which stays at the top
 * while the page scrolls, U03 #29, #39), then the page on white in the design's 1120px column,
 * centred, 32px under the 64px header area and its parts 16px apart (U11 6699:44240: "Page title"
 * at 160/96, "Toolbar" at 112, the list at 176). The page scrolls; index.css's
 * `scroll-padding-top` keeps what scrolls into view below the header. A page change fades the page
 * in over 150ms (FR-052c, design-notes §4): the main region is keyed by the route's path, so it
 * starts again when the path changes and the pills stay; App.tsx scrolls to the top.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  return (
    <div className="bg-kern-layout-background-default flex min-h-screen flex-col">
      <TopBar logoTo={ROUTES.overview}>
        <UserMenu />
      </TopBar>
      {/* The column fills the height, so that a page can centre a state in it */}
      <main
        key={pathname}
        className="motion animate-page-in flex flex-1 flex-col px-16 pt-32 pb-48"
      >
        <div className="mx-auto flex w-full max-w-1120 flex-1 flex-col gap-16">{children}</div>
      </main>
    </div>
  );
}
