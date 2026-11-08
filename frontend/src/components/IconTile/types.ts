export interface IconTileProps {
  /** The glyph's image (24 × 24 on the design's tiles), in the colour that goes with the tone */
  glyph: string;
  /** 40 for a card header's tile, 48 for a step's round tile; 28 for a small list item */
  size: 28 | 40 | 48;
  /**
   * The design's tiles: action = the action-blue square of a card header (a white glyph), plain =
   * the white round tile of the welcome page's steps (an ink glyph). The tones of the old design
   * until their pages are rebuilt: blue = available or chosen, grey = not available yet, outline
   * = not chosen yet
   */
  tone: 'action' | 'plain' | 'blue' | 'grey' | 'outline';
}
