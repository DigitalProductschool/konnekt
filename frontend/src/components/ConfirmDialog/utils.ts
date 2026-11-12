import type { DIALOG_ACTIONS_CLASSES } from './constants';

/**
 * How many buttons the dialog's footer holds, which picks its layout (P33 dialog-actions): the
 * cancel button and the secondary action where the dialog has them, and the confirm button
 * unless it is hidden. At least one, so that a footer always has a layout
 */
export function dialogButtonCountOf(
  hasCancel: boolean,
  hasSecondary: boolean,
  hideConfirm: boolean
): keyof typeof DIALOG_ACTIONS_CLASSES {
  const count = (hasCancel ? 1 : 0) + (hasSecondary ? 1 : 0) + (hideConfirm ? 0 : 1);
  return Math.min(3, Math.max(1, count)) as keyof typeof DIALOG_ACTIONS_CLASSES;
}
