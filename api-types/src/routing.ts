/** Router state that the sign-in screen reads */
export interface LoginLocationState {
  /** The route that needed a sign-in; the screen returns there afterwards */
  from?: { pathname: string; search: string; hash: string };
  /**
   * Set by "Log out" (the user menu): the screen shows the toast "You’re logged out." once
   * (FR-051 (30)); `from` stays the page the user logged out of. An expired session sets none
   */
  loggedOut?: boolean;
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
   * card's "Edit rules" the rules (FR-030); a draft's details may also open the test step
   */
  step?: 'connection' | 'documents' | 'rules' | 'test';
  /**
   * Opened by a draft conflict's "Reload" from a resumed local draft (spec 005, S2): the draft
   * opens at its stored step, with the focus on the page title
   */
  reloaded?: boolean;
}

/** Router state that the overview reads */
export interface OverviewLocationState {
  /** The name of the draft "Save and exit" just stored: the overview confirms it (W1) */
  draftSaved?: string;
  /**
   * The deletion the details just made: the overview's toast names it and offers "Undo" with its
   * id (spec 010, FR-033; S4 "After a deletion"); `names` holds the deleted connection's or draft's
   * name, `deletionId` the answer's `Deletion.id` (null: nothing can restore it, no "Undo")
   */
  deleted?: OverviewDeletion;
}

/** A deletion the overview's toast reports (spec 010, FR-033) */
export interface OverviewDeletion {
  names: string[];
  deletionId: string | null;
}
