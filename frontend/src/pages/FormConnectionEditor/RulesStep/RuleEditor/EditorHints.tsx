import EditorHint from './EditorHint';
import type { EditorHintsProps } from './types';

/**
 * The notes under the check row (U30 6348:40753: 4px apart): hints, and the date notes. The
 * design keeps the 24px row while no note shows (U30 6350:41185, U31 6350:41426), so that the
 * message doesn't jump when the first one appears.
 */
export default function EditorHints({ hints }: EditorHintsProps) {
  if (hints.length === 0) {
    return <div aria-hidden="true" className="h-24 shrink-0" />;
  }
  return (
    <ul className="flex flex-col gap-4">
      {hints.map((hint) => (
        <EditorHint key={hint} text={hint} />
      ))}
    </ul>
  );
}
