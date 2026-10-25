import type { ReactNode } from 'react';

import type { RuleItem } from '../../types/form-connections';
import type { PredicateParts, RuleContext, StatementParts } from '../../utils/rules/types';

export interface RuleRowProps {
  /** The row's element id; the focus moves there after a refused Publish or Save (F11) */
  id?: string;
  /** The rule: its name, what it checks, its condition and its error message */
  rule: RuleItem;
  /**
   * Where its labels come from. Pass the whole catalog as the documents, so that a rule on data
   * no longer requested still reads
   */
  context: RuleContext;
  /** Replaces the name while it is renamed inline (U15) */
  nameSlot?: ReactNode;
  /** Shows the rule's identifier, read-only, next to its name: on the details only (W1) */
  showIdentifier?: boolean;
  /**
   * An inline problem, such as "Rule 02 in Standard checks data that’s no longer requested." The
   * row is then outlined in red with the message under it (U27 6197:10704)
   */
  flag?: string | null;
  /** The Rules step's ⋯ menu; the details show none */
  actions?: ReactNode;
}

export interface RuleNameProps {
  name: string;
  /** The identifier to show next to the name, if any (W1) */
  identifier?: string;
}

export interface RuleSentenceProps {
  parts: StatementParts;
  /** The whole statement, read by assistive technologies instead of the laid-out parts */
  text: string;
}

export interface RulePredicateProps {
  predicate: PredicateParts;
}

export interface ValueChipProps {
  value: string;
}

export interface RuleMessageProps {
  message: string;
}

export interface ProblemNoteProps {
  message: string;
}
