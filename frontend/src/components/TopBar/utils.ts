/**
 * The header area's background (U03 #39): white the moment the page has scrolled under it, so
 * that nothing that scrolls up shows between the pills, and transparent at the top. Only the way
 * back to transparent fades (150 ms, `.motion`): a transition takes the after-change style's
 * `transition-*`, so the white set, without one, lands in the frame its class does. A fade into
 * white let a fast scroll from the top show the content under the pills for ~100 ms (bug
 * scroll-flash-under-navbar); at the top nothing is under them any more, so the fade out shows
 * nothing.
 */
export function headerBackgroundClasses(scrolled: boolean): string {
  return scrolled
    ? 'bg-kern-layout-background-default'
    : 'transition-colors duration-(--duration-colour)';
}
