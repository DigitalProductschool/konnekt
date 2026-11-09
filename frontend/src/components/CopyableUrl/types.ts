import type { ReactNode, RefObject } from 'react';

import type { TooltipPlacement } from '../InfoTooltip/types';

/** "link": the details' URL row (U80); "field": a labelled read-only input, the account's token */
export type CopyableUrlVariant = 'link' | 'field';

/** The button's labels and what the status region announces after each attempt */
export interface CopyTexts {
  /** The button's label, such as "Copy link" */
  copy: string;
  /** The button's label for 2 s after copying, after the ✓ */
  copied: string;
  /** Announced after copying, such as "Link copied" */
  announced: string;
  /** Announced when copying failed; the text is then selected */
  failed: string;
}

interface CopyableUrlBaseProps {
  /**
   * The ids of the texts that say what is copied: the link card's title and the variant's name,
   * read after the copy button's label (its description is the explanation while it is off); for
   * the field, the texts that describe the field, such as the dialog's warning
   */
  describedBy?: string;
  /**
   * While true, the copy button is off (`aria-disabled`, focusable) and explains why in the
   * tooltip: the connection is deactivated (FR-046, W21)
   */
  deactivated?: boolean;
  /** The variant's texts to replace, such as the token's "Token copied" */
  texts?: Partial<CopyTexts>;
}

/** The details' URL row: the URL on one line, cut with "…", and "Copy link" */
export interface CopyableLinkProps extends CopyableUrlBaseProps {
  variant?: 'link';
  /** The URL; it copies in full, however it is cut */
  url: string;
}

/** A labelled read-only field with its copy button, such as the new token (S20) */
export interface CopyableFieldProps extends CopyableUrlBaseProps {
  variant: 'field';
  /** The text to copy, such as the token */
  value: string;
  /** The field's visible label, such as "Token" */
  label: string;
}

export type CopyableUrlProps = CopyableLinkProps | CopyableFieldProps;

export type CopyStatus = 'idle' | 'copied' | 'failed';

/** The last attempt's result; `attempt` counts them, so that copying again restarts the 2 s */
export interface CopyState {
  status: CopyStatus;
  attempt: number;
}

export type CopyAction = { type: 'copied' } | { type: 'failed' } | { type: 'reset' };

/** The full URL's bubble: open while the mouse is over a cut URL, and where it opens */
export interface FullUrlState {
  open: boolean;
  placement: TooltipPlacement;
}

export interface FullUrlBubbleProps {
  text: string;
  placement: TooltipPlacement;
}

export interface FullUrlFrameProps {
  text: string;
  /** The box whose text may be cut */
  boxRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export interface CopyButtonProps {
  copied: boolean;
  texts: CopyTexts;
  /** The ids of the texts that name what it copies, read after its label */
  labelledBy?: string;
  deactivated: boolean;
  onCopy: () => void;
}
