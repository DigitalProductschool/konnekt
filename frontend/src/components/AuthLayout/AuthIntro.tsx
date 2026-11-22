import logoWhite from '../../assets/illustrations/logo-white.svg';
import { APP_NAME } from '../../constants';
import { useCopy } from '../../hooks/useLanguage';
import { AUTH_INTRO_CLASSES, AUTH_INTRO_COPY } from './constants';
import type { AuthIntroProps } from './types';

/**
 * Figma "Hero" ("New visuals" 7741:61945, bug new-visuals B1): the white logo with the word
 * (7741:61960, 202 × 60), which names the product now that the header has no Konnekt pill, the
 * headline 42px under it, the signed-out screens' `h1` (7741:61958, Fira Sans Medium 56, line
 * height 1.2), and the tagline 16px under that (7741:61959, Regular 20/24), all white on the blue
 * surface. The headline breaks where its 373px column ends, without a break in the copy: Fira
 * Sans sets "Connect to the" 373.3px wide, a fraction more than the column, so the headline may
 * reach 2px past it, which keeps the frame's break after "the" (the hero stays 373px). Stacked
 * (below 1021px) the headline and tagline keep KERN's 40/48 and 18/24, and under 320 CSS px the
 * logo shrinks to the column's width. `className` adds the sign-in motion's fade-out (bug
 * login-welcome-motion).
 */
export default function AuthIntro({ className = '' }: AuthIntroProps) {
  const copy = useCopy(AUTH_INTRO_COPY);
  return (
    <div className={`${AUTH_INTRO_CLASSES} ${className}`}>
      {/* KERN's `img { height: auto }` keeps the logo's proportions where it shrinks */}
      <img src={logoWhite} alt={APP_NAME} width={202} height={60} className="w-202 max-w-full" />
      <h1 className="text-kern-adaptive-2x-large text-kern-layout-text-inverse @min-[1021px]:text-hero-headline mt-42 font-medium wrap-break-word @min-[1021px]:-mr-2">
        {copy.headline}
      </h1>
      <p className="text-kern-static-large text-kern-layout-text-inverse @min-[1021px]:text-hero-tagline mt-16">
        {copy.lead}
      </p>
    </div>
  );
}
