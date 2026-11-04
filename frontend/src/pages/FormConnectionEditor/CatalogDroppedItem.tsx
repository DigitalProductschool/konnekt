import type { CatalogDroppedItemProps } from './types';

/** One item of the note on dropped data (S8): "Personal ID – eye_colour", or a document's key. */
export default function CatalogDroppedItem({ item }: CatalogDroppedItemProps) {
  return <li>{item.label}</li>;
}
