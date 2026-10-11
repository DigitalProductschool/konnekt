import { ROUTES } from '../../constants';
import TopBar from '../TopBar';
import UserMenu from '../UserMenu';
import type { WizardLayoutProps } from './types';

/**
 * The frame of the wizard: Figma "App/Header", the 1120 px content column and the
 * "App/Footer" action bar. The bar sticks to the bottom of the window, so that its
 * actions stay in reach on long steps; it is part of <main>, where the step's content is.
 */
export default function WizardLayout({ title, footer, children }: WizardLayoutProps) {
  return (
    <div className="bg-kern-neutral-025 flex min-h-screen flex-col">
      <TopBar title={title} width="column" logoTo={ROUTES.overview}>
        <UserMenu />
      </TopBar>
      <main className="flex flex-1 flex-col">
        <div className="flex-1 px-16 pt-40 pb-40">
          <div className="mx-auto flex w-full max-w-1120 flex-col gap-32">{children}</div>
        </div>
        <div className="border-kern-neutral-100 bg-kern-layout-background-default sticky bottom-0 flex h-80 border-t px-16">
          <div className="mx-auto flex w-full max-w-1120 items-center gap-16">{footer}</div>
        </div>
      </main>
    </div>
  );
}
