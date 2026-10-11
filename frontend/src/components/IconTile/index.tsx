import type { IconTileProps } from './types';

const TONE_CLASSES: Record<IconTileProps['tone'], string> = {
  blue: 'bg-kern-darkblue-050',
  grey: 'bg-kern-neutral-050',
  outline: 'border border-kern-neutral-100 bg-kern-layout-background-default',
};

const SIZE_CLASSES: Record<IconTileProps['size'], string> = {
  28: 'size-28',
  40: 'size-40',
  48: 'size-48',
};

/** Figma "Icon/Tile": a document's or form's glyph on a rounded tile. Decorative. */
export default function IconTile({ glyph, size, tone }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={`rounded-kern-large flex shrink-0 items-center justify-center ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]}`}
    >
      <img src={glyph} alt="" />
    </span>
  );
}
