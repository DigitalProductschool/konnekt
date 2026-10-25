/** Router state that the sign-in screen reads */
export interface LoginLocationState {
  /** The route that needed a sign-in; the screen returns there afterwards */
  from?: { pathname: string; search: string; hash: string };
}

/** Router state that the details screen reads */
export interface DetailLocationState {
  /** The connection was just created: the screen confirms that it is live */
  published?: boolean;
  /** The connection was just edited: the screen confirms that the changes are saved */
  saved?: boolean;
}

/** Router state that the edit screen reads */
export interface EditLocationState {
  /**
   * The step to open at; the details' "Edit documents" opens the documents, and their rules
   * card's "Edit rules" the rules (FR-030)
   */
  step?: 'connection' | 'documents' | 'rules';
}
