import documentIcon from '../../assets/icons/document.svg';
import IconTile from '../../components/IconTile';
import { EDITOR_COPY } from './constants';

/** Figma "Doc/Empty setup": no document added yet. */
export default function EmptySetup() {
  return (
    <div className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-col items-center gap-8 border px-24 py-40 text-center">
      <IconTile glyph={documentIcon} size={48} tone="grey" />
      <p className="text-kern-static-medium text-kern-layout-text-default font-semibold">
        {EDITOR_COPY.emptyTitle}
      </p>
      <p className="text-kern-static-small text-kern-layout-text-muted max-w-420 leading-(--kern-typography-line-height-medium-static)">
        {EDITOR_COPY.emptyText}
      </p>
    </div>
  );
}
