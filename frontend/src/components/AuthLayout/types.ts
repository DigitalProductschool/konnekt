import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  /** The card on the right: the sign-in form, or the forgot-password note */
  children: ReactNode;
}

export interface AuthIntroProps {
  /** Classes added to the hero: the sign-in motion's fade-out (bug login-welcome-motion) */
  className?: string;
}
