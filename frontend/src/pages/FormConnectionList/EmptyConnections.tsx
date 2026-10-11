import documentIcon from '../../assets/icons/document.svg';
import IconTile from '../../components/IconTile';
import { LIST_COPY } from './constants';

/** No connections yet: the pattern of Figma "Doc/Empty setup", prompting the first one. */
export default function EmptyConnections() {
  return (
    <div className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-col items-center gap-8 border px-24 py-40 text-center">
      <IconTile glyph={documentIcon} size={48} tone="grey" />
      <h2 className="text-kern-static-medium text-kern-layout-text-default font-semibold">
        {LIST_COPY.emptyTitle}
      </h2>
      <p className="text-kern-static-small text-kern-layout-text-muted max-w-420 leading-(--kern-typography-line-height-medium-static)">
        {LIST_COPY.emptyText}
      </p>
    </div>
  );
}
