import type { PageTitleProps, PageTitleSize } from './types';

/**
 * KERN's heading class per size. The frames draw the page title's text boxes without KERN's
 * baseline paddings (U11 6699:44244: the 40px heading and the 24px hint make the 64px block), so
 * `py-0!` takes them off; KERN's unlayered rule would beat a plain utility.
 */
const HEADING_CLASSES: Record<PageTitleSize, string> = {
  display: 'kern-heading-display',
  'x-large': 'kern-heading-x-large',
  large: 'kern-heading-large',
};

/** The hint under the heading: body/default (16/24) under the big headings, body/small (14/24)
 * under the step header's `large` one */
const HINT_CLASSES: Record<PageTitleSize, string> = {
  display: 'text-kern-static-medium',
  'x-large': 'text-kern-static-medium',
  large: 'text-kern-static-small',
};

/**
 * The page's main heading in the kit's text style (P31: `heading/display`, `heading/x-large` or
 * `heading/large`), with an optional hint in `body` muted right under it. The heading can take
 * the focus from script, which a page uses after its content changed; it is no control, so it
 * shows no focus ring.
 */
export default function PageTitle({
  title,
  hint,
  size = 'display',
  ref,
  className = '',
}: PageTitleProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <h1
        ref={ref}
        tabIndex={-1}
        className={`${HEADING_CLASSES[size]} py-0! break-words outline-none`}
      >
        {title}
      </h1>
      {hint && (
        <p
          className={`${HINT_CLASSES[size]} text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
