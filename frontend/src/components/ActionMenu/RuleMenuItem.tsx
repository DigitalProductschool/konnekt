import type { RuleMenuItemProps } from './types';

/**
 * One action of a ⋯ menu (U14 6113:28988): an icon and a label/small text; "Restore rule" has
 * no icon (U23 6185:8802). A label that wraps, such as "Reset to" a long variant name, starts
 * every line at the text column, with the icon beside its first line: (24px line − 20px) / 2.
 */
export default function RuleMenuItem({ label, icon, danger = false, onSelect }: RuleMenuItemProps) {
  const colour = danger ? 'text-kern-feedback-danger' : 'text-kern-layout-text-default';
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onSelect}
      className={`${colour} text-kern-static-small hover:bg-kern-neutral-050 focus-visible:bg-kern-neutral-050 focus-visible:outline-kern-action-focus-default rounded-kern-small flex w-full cursor-pointer items-start gap-8 p-8 text-left leading-(--kern-typography-line-height-medium-static) font-semibold focus-visible:outline-4 focus-visible:-outline-offset-4`}
    >
      {icon &&
        ('kern' in icon ? (
          <span
            aria-hidden="true"
            className={`kern-icon kern-icon--small mt-2 ${icon.kern} ${danger ? 'bg-kern-feedback-danger!' : 'bg-kern-layout-text-default!'}`}
          />
        ) : (
          <img src={icon.src} alt="" className="mt-2 size-20" />
        ))}
      <span className="wrap-anywhere">{label}</span>
    </button>
  );
}
