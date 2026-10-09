import { ROUTES } from '../../constants';

/** Where to go after signing in: the route that sent the user here, or the overview. */
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
