import chainLoginWhite from '../../assets/illustrations/chain-login-white@2x.webp';
import chainWelcomeCard from '../../assets/illustrations/chain-welcome-card@2x.webp';
import { CHAIN_TRAVEL_CLASSES } from './constants';

/**
 * The chain's travel in the full motion (bug login-welcome-motion, P1, P3), inside the welcome
 * card's surface, which clips it: one wrapper, on the sign-in page's chain at the start, moves
 * and shrinks onto the card's top right in 800 ms; in it the white chain fades out while a copy
 * of the card's picture fades in (240–560 ms), so there is never a second chain elsewhere. No
 * picture turns, and the transform and the opacities sit on the wrappers, not on the pictures.
 * At the end the copy lies on the card's own picture at its natural size, which takes its place
 */
export default function ChainTravel() {
  return (
    <div className={CHAIN_TRAVEL_CLASSES.wrapper}>
      <div className={CHAIN_TRAVEL_CLASSES.white}>
        <img
          src={chainLoginWhite}
          alt=""
          aria-hidden="true"
          width={1552}
          height={1552}
          className={CHAIN_TRAVEL_CLASSES.picture}
        />
      </div>
      <div className={CHAIN_TRAVEL_CLASSES.copy}>
        <img
          src={chainWelcomeCard}
          alt=""
          aria-hidden="true"
          width={480}
          height={320}
          className={CHAIN_TRAVEL_CLASSES.picture}
        />
      </div>
    </div>
  );
}
