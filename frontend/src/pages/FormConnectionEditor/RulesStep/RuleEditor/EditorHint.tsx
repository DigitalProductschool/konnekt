import type { EditorHintProps } from './types';

/** Figma "Rules/Hint": a muted note with KERN's info icon. */
export default function EditorHint({ text }: EditorHintProps) {
  return (
    <li className="flex items-center gap-8">
      <span
        aria-hidden="true"
        className="kern-icon kern-icon--info kern-icon--small bg-kern-layout-text-muted! shrink-0"
      />
      <p className="text-kern-static-small text-kern-layout-text-muted min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static)">
        {text}
      </p>
    </li>
  );
}
