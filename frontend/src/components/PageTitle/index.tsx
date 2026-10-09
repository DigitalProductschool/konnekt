import type { PageTitleProps } from './types';

/** Figma "App/Page title": the page's main heading, with an optional hint. */
export default function PageTitle({ title, hint }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-kern-adaptive-large text-kern-layout-text-default font-semibold">
        {title}
      </h1>
      {hint && <p className="text-kern-static-large text-kern-layout-text-muted">{hint}</p>}
    </div>
  );
}
