import loginArt from '../../assets/illustrations/login-art@2x.png';
import { useCopy } from '../../hooks/useLanguage';
import { AUTH_INTRO_CLASSES, AUTH_INTRO_COPY } from './constants';

/**
 * Figma "Hero · picture + tagline" (U10 7363:55408, build note 9 of U02): the login art at
 * 331 × 617 (already cropped, used as it is) and the tagline, 60px apart, centred vertically.
 * Below 1234px the art, which is decorative, is hidden and the tagline stays (note 14). The
 * headline is the signed-out screens' `h1`. The art may reach into the page's 80px padding,
 * so it doesn't make a short window scroll.
 */
export default function AuthIntro() {
  const copy = useCopy(AUTH_INTRO_COPY);
  return (
    <div className={AUTH_INTRO_CLASSES}>
      {/* KERN's own `img` rule sets `display`, so the wrapper is what hides the art */}
      <div className="hidden shrink-0 @min-[1234px]:block">
        <img src={loginArt} alt="" width={331} height={617} className="h-617 w-331 max-w-none" />
      </div>
      <div className="flex min-w-0 flex-col gap-16 @min-[990px]:w-342">
        <h1 className="text-kern-adaptive-2x-large text-kern-layout-text-default font-medium wrap-break-word">
          {copy.headline}
        </h1>
        <p className="text-kern-static-large text-kern-layout-text-muted">{copy.lead}</p>
      </div>
    </div>
  );
}
