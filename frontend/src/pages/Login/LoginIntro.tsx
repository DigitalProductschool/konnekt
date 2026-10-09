import BenefitItem from './BenefitItem';
import { BENEFITS, LOGIN_COPY } from './constants';

/** Figma "Auth/Intro": who BridgeID is for and what it does. */
export default function LoginIntro() {
  return (
    <div className="flex flex-col gap-16">
      <h1 className="text-kern-adaptive-2x-large text-kern-layout-text-default font-medium">
        {LOGIN_COPY.headline}
      </h1>
      <p className="text-kern-static-large text-kern-layout-text-muted">{LOGIN_COPY.lead}</p>
      <ul className="flex flex-col gap-16 pt-24">
        {BENEFITS.map((benefit) => (
          <BenefitItem key={benefit.title} benefit={benefit} />
        ))}
      </ul>
    </div>
  );
}
