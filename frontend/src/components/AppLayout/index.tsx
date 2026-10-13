import { ROUTES } from '../../constants';
import TopBar from '../TopBar';
import UserMenu from '../UserMenu';
import type { AppLayoutProps } from './types';

/**
 * The frame of every signed-in screen: top bar with the user's menu, then the page. The top
 * bar stays at the top while the page scrolls (decision 2026-10-12); index.css keeps what
 * scrolls into view out from under it.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="bg-kern-neutral-025 flex min-h-screen flex-col">
      {/* Above the page's tooltips (z-20); the user menu opens inside it */}
      <div className="sticky top-0 z-30">
        <TopBar logoTo={ROUTES.overview}>
          <UserMenu />
        </TopBar>
      </div>
      {/* The column fills the height, so that a page can centre a state in it */}
      <main className="flex flex-1 flex-col px-16 pt-40 pb-48">
        <div className="mx-auto flex w-full max-w-1040 flex-1 flex-col gap-24">{children}</div>
      </main>
    </div>
  );
}
