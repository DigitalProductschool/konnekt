import { KERN_TRANSLATIONS } from '../../constants';

export const CONFIRM_DIALOG_COPY = {
  // The kit's own word for the ×, so that the React kit's dialogs and this one agree
  close: KERN_TRANSLATIONS.closeDialog,
};

/**
 * The dialog's width: the screens' dialogs are 480px wide (U14 6699:44480, U17 7173:52682, U25
 * 7299:52174, U90 6417:31599), the kit's set 600px (P12 2:12865); 16px from the window's edges
 * on a narrow screen. The `!`s beat kern.css's small-screen bottom sheet (min-width and
 * max-width 100%, no bottom margin, top corners only), which the kit's mobile dialog doesn't draw
 */
export const DIALOG_WIDTH_CLASSES = {
  default: 'w-480',
  wide: 'w-600',
} as const;

/**
 * The buttons (P33 dialog-actions): side by side in equal columns while they fit, their labels
 * wrapping inside; stacked full-width in their order (cancel, secondary, confirm) where they
 * don't. Measured on the footer's inner width (a container query), so that a narrow window and
 * the 480px dialog stack three buttons and the 600px dialog doesn't: two buttons from 384px (the
 * 480px dialog's footer is 416 wide), three from 528px (the 600px dialog's is 536). A grid, not
 * flex: an outlined button's border would make it 2px wider than a filled one in a flex row.
 * kern.css's `.kern-dialog__footer .kern-btn` stretches each button across a stacked column
 */
export const DIALOG_ACTIONS_CLASSES = {
  1: 'flex-col',
  2: 'flex-col @min-[24rem]:grid @min-[24rem]:auto-cols-[minmax(0,1fr)] @min-[24rem]:grid-flow-col',
  3: 'flex-col @min-[33rem]:grid @min-[33rem]:auto-cols-[minmax(0,1fr)] @min-[33rem]:grid-flow-col',
} as const;
