import type { ReactNode } from 'react';

/** How the card lines up with the intro when they sit side by side */
export type CardAlign = 'center' | 'end';

export interface AuthLayoutProps {
  /** The card on the right: the sign-in form, or the forgot-password note */
  children: ReactNode;
  /** "end" lines the card up with the bottom of the intro, where the illustration is */
  cardAlign?: CardAlign;
}

/** A document in the illustration, drawn as a card with two placeholder lines */
export interface SceneCredential {
  title: string;
  /** Background and border colour of the card */
  cardClassName: string;
  /** Colour of the placeholder lines */
  lineClassName: string;
  /** Widths of the two placeholder lines */
  lineWidths: [string, string];
}

export interface CredentialCardProps {
  credential: SceneCredential;
  /** The card's rotation */
  className: string;
}

export interface CheckChipProps {
  label: string;
}
