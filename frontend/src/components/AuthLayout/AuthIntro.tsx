import { AUTH_INTRO_COPY } from './constants';
import WalletScene from './WalletScene';

/** Figma "Auth/Intro": what the product does, with a decorative wallet scene. */
export default function AuthIntro() {
  return (
    // A size container, so that the scene shows only where its 600px fit
    <div className="@container flex w-full max-w-600 flex-col gap-16">
      <h1 className="text-kern-adaptive-2x-large text-kern-layout-text-default font-medium">
        {AUTH_INTRO_COPY.headline}
      </h1>
      <p className="text-kern-static-large text-kern-layout-text-muted">{AUTH_INTRO_COPY.lead}</p>
      <WalletScene />
    </div>
  );
}
