export interface IconTileProps {
  /** The glyph's image (24 × 24 on the design's tiles), in the colour that goes with the tone */
  glyph: string;
  /** 40 for a card header's tile, 48 for a step's round tile */
  size: 40 | 48;
  /**
   * The design's tiles: action = the card header's square in the action blue at 12 % (an
   * action-blue glyph), plain = the white round tile of the welcome page's steps (an ink glyph)
   */
  tone: 'action' | 'plain';
}
