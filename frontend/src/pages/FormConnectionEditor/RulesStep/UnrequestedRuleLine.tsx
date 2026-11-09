import type { UnrequestedRuleLineProps } from './types';

/**
 * One rule of the unrequested-data banner (F11, F58; U50 6863:47363, 7173:52333): the 20px error
 * diamond (`icon-emergency_home-small` in `feedback-danger`), 8px, then the sentence in
 * body/small and `layout-text-default`, which names the rule and its variant (FR-023c), and the
 * document when the whole document is no longer requested (8.4b). The icon is decoration, on the
 * text's first line when it wraps.
 */
export default function UnrequestedRuleLine({ text }: UnrequestedRuleLineProps) {
  return (
    <div className="flex items-start gap-8">
      <span
        aria-hidden="true"
        className="kern-icon kern-icon--danger kern-icon--small bg-kern-feedback-danger! mt-2 shrink-0"
      />
      <p className="text-kern-layout-text-default min-w-px flex-1 text-(length:--kern-font-size-14) leading-(--kern-typography-line-height-medium-static) wrap-anywhere">
        {text}
      </p>
    </div>
  );
}
