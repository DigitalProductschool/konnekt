import type { PageTitleProps } from './types';

/**
 * Figma "App/Page title" (V2): the page's main heading, with an optional hint. The heading
 * can take the focus from script, which a page uses after its content changed.
 */
export default function PageTitle({ title, hint, ref }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-8">
      <h1
        ref={ref}
        tabIndex={-1}
        className="text-kern-adaptive-2x-large text-kern-layout-text-default font-medium break-words focus:outline-none"
      >
        {title}
      </h1>
      {hint && (
        <p className="text-kern-static-medium text-kern-layout-text-muted break-words">{hint}</p>
      )}
    </div>
  );
}
