import type { IconTileProps } from './types';

// The fill and the shape per tone: the design's square tiles have the 8px radius (Figma U19
// 6699:45330), its round tile is a circle (U11 6699:44495)
const TONE_CLASSES: Record<IconTileProps['tone'], string> = {
  action: 'rounded-kern-default bg-kern-action-default',
  plain: 'rounded-kern-circle bg-kern-layout-background-default',
  blue: 'rounded-kern-default bg-kern-darkblue-050',
  grey: 'rounded-kern-default bg-kern-neutral-050',
  outline: 'rounded-kern-default border border-kern-neutral-100 bg-kern-layout-background-default',
};

const SIZE_CLASSES: Record<IconTileProps['size'], string> = {
  28: 'size-28',
  40: 'size-40',
  48: 'size-48',
};

/** Figma "Icon tile": a glyph centred on a tile (U19 6699:45330, U11 6699:44495). Decorative. */
export default function IconTile({ glyph, size, tone }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]}`}
    >
      <img src={glyph} alt="" />
    </span>
  );
}
