import type { SwitchNoteProps } from './types';

/**
 * Figma "Rules/Note" (U14 6329:19219): after switching a level's AND or OR, the note that says
 * what it now needs, under the group's header. The top level's has no frame: it sits at the top
 * of the rules card, clear of its edges. Its region stays in the page, so that the note is
 * announced.
 */
export default function SwitchNote({ text, topLevel = false }: SwitchNoteProps) {
  return (
    <div role="status" className={text && topLevel ? 'px-16 pt-16 pb-8' : undefined}>
      {text && (
        <p className="rounded-kern-default bg-kern-feedback-info-background text-kern-static-small text-kern-layout-text-default flex items-center gap-8 px-16 py-8 leading-(--kern-typography-line-height-medium-static)">
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--info kern-icon--small bg-kern-feedback-info! shrink-0"
          />
          {text}
        </p>
      )}
    </div>
  );
}
