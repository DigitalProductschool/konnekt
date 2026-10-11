/** Router state that the sign-in screen reads */
export interface LoginLocationState {
  /** The route that needed a sign-in; the screen returns there afterwards */
  from?: { pathname: string; search: string; hash: string };
}

/** Router state that the details screen reads */
export interface DetailLocationState {
  /** The connection was just created: the screen confirms that it is live */
  published?: boolean;
}
