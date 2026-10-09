import checkIcon from '../../assets/icons/check.svg';
import dotGridImage from '../../assets/illustrations/dot-grid.svg';
import CheckChip from './CheckChip';
import { SCENE_CHECKS, SCENE_CREDENTIALS } from './constants';
import CredentialCard from './CredentialCard';

/**
 * Figma "wallet scene" in "Auth/Intro": two documents and three passed checks. It is
 * decorative, so screen readers skip it, and it needs its full 600px width: narrower
 * intros leave it out. Positions are Figma's, inside the 1px border.
 */
export default function WalletScene() {
  return (
    <div
      aria-hidden="true"
      // Figma paints an 8% success tint over white, so both are background layers
      className="rounded-kern-large border-kern-feedback-success/40 bg-kern-layout-background-default from-kern-feedback-success/8 to-kern-feedback-success/8 relative mt-32 hidden h-300 w-full overflow-clip border bg-linear-to-r @min-[600px]:block"
    >
      <img src={dotGridImage} alt="" className="absolute top-7 left-7" />
      {/* Each wrapper is the bounding box of its rotated card, as in Figma */}
      <div className="absolute top-29 left-[152.71px] flex h-[186.036px] w-[273.304px] items-center justify-center">
        <CredentialCard credential={SCENE_CREDENTIALS.licence} className="rotate-5" />
      </div>
      <div className="absolute top-[93.39px] left-35 flex h-[177.383px] w-[268.227px] items-center justify-center">
        <CredentialCard credential={SCENE_CREDENTIALS.id} className="-rotate-3" />
      </div>
      <span className="rounded-kern-circle border-kern-layout-background-default bg-kern-feedback-success absolute top-83 left-271 flex size-48 items-center justify-center border-4">
        <img src={checkIcon} alt="" className="size-24" />
      </span>
      <div className="absolute top-76 left-399 flex flex-col items-end gap-10 overflow-clip">
        {SCENE_CHECKS.map((check) => (
          <CheckChip key={check} label={check} />
        ))}
      </div>
    </div>
  );
}
