export interface IconTileProps {
  /** The glyph's image, in the colour that goes with the tone */
  glyph: string;
  /** 28 for a small list item, 40 for a document, 48 for a card header */
  size: 28 | 40 | 48;
  /** blue = available or chosen, grey = not available yet, outline = not chosen yet */
  tone: 'blue' | 'grey' | 'outline';
}
