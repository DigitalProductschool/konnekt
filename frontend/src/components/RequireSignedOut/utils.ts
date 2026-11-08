import { ROUTES } from '../../constants';

/**
 * Where to go after signing in: the route that sent the user here, or else the homepage "/",
 * which is the welcome page while no connection or draft exists and the overview otherwise
 * (FR-027). The sign-in page itself doesn't count as a requested route. After "Log out", `from`
 * is the page logged out of, so signing in again returns there; the `loggedOut` flag beside it
 * plays no part here.
 */
export function redirectTarget(locationState: unknown): string {
  if (typeof locationState !== 'object' || locationState === null) {
    return ROUTES.overview;
  }
  const { from } = locationState as { from?: Partial<Record<string, unknown>> };
  if (typeof from?.pathname !== 'string' || from.pathname === ROUTES.login) {
    return ROUTES.overview;
  }
  const search = typeof from.search === 'string' ? from.search : '';
  const hash = typeof from.hash === 'string' ? from.hash : '';
  return `${from.pathname}${search}${hash}`;
}
