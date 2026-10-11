import { ROUTES } from '../../constants';

/**
 * Where to go after signing in: the route that sent the user here, or else the
 * first-connection screen, which gives way to the overview once connections exist. The
 * app's own address doesn't count as a requested route: the sign-in guard records it as
 * well when someone simply opens the app.
 */
export function redirectTarget(locationState: unknown): string {
  if (typeof locationState !== 'object' || locationState === null) {
    return ROUTES.firstConnection;
  }
  const { from } = locationState as { from?: Partial<Record<string, unknown>> };
  if (
    typeof from?.pathname !== 'string' ||
    from.pathname === ROUTES.login ||
    from.pathname === ROUTES.overview
  ) {
    return ROUTES.firstConnection;
  }
  const search = typeof from.search === 'string' ? from.search : '';
  const hash = typeof from.hash === 'string' ? from.hash : '';
  return `${from.pathname}${search}${hash}`;
}
