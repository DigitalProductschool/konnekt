// Keyboard navigation of menus (WAI-ARIA menu pattern), shared by the menus of the rules

/** The keys that move the focus between a menu's items */
export const MENU_NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/** The menu item that an arrow key, Home or End moves the focus to. */
export function nextMenuIndex(key: string, current: number, count: number): number {
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowUp':
      return current <= 0 ? count - 1 : current - 1;
    default:
      return current < 0 || current >= count - 1 ? 0 : current + 1;
  }
}
