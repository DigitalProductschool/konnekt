import TopBar from '../TopBar';
import UserMenu from '../UserMenu';
import type { AppLayoutProps } from './types';

/** The frame of every signed-in screen: top bar with the user's menu, then the page. */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="bg-kern-neutral-025 flex min-h-screen flex-col">
      <TopBar>
        <UserMenu />
      </TopBar>
      <main className="flex-1 px-16 pt-40 pb-48">
        <div className="mx-auto flex w-full max-w-1040 flex-col gap-24">{children}</div>
      </main>
    </div>
  );
}
