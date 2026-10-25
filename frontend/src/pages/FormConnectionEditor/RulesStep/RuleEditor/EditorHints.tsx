import EditorHint from './EditorHint';
import type { EditorHintsProps } from './types';

/** The notes under the check row (U11 6348:40753): hints, and F4's date notes. */
export default function EditorHints({ hints }: EditorHintsProps) {
  return (
    <ul className="flex flex-col gap-4">
      {hints.map((hint) => (
        <EditorHint key={hint} text={hint} />
      ))}
    </ul>
  );
}
