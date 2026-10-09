import { APP_NAME } from '../../constants';
import type { TopBarProps } from './types';

/** Figma "App/Top bar": the product logo, and on signed-in screens the user. */
export default function TopBar({ children }: TopBarProps) {
  return (
    <header className="border-kern-neutral-100 bg-kern-layout-background-default flex h-64 items-center gap-16 border-b px-16 sm:px-32">
      <div className="gap-kern-space-small flex items-center">
        <span
          aria-hidden="true"
          className="rounded-kern-default bg-kern-layout-text-default size-20"
        />
        <span className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold">
          {APP_NAME}
        </span>
      </div>
      <div className="flex-1" />
      {children}
    </header>
  );
}
