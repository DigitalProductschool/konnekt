import documentSmallIcon from '../../assets/icons/document-small.svg';
import IconTile from '../../components/IconTile';
import type { UpcomingDocumentItemProps } from './types';

/** A document that the wallet doesn't hold yet: greyed out, with nothing to click. */
export default function UpcomingDocumentItem({ name }: UpcomingDocumentItemProps) {
  return (
    <li className="flex items-center gap-10 px-10 py-4">
      <IconTile glyph={documentSmallIcon} size={28} tone="grey" />
      <span className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
        {name}
      </span>
    </li>
  );
}
