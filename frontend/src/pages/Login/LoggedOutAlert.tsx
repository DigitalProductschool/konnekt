import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import { LOGIN_COPY } from './constants';

/** Figma "Logged out alert" (frame U2), shown above the card after logging out. */
export default function LoggedOutAlert() {
  return (
    <KernAlert title={LOGIN_COPY.loggedOutTitle} variant="info">
      {LOGIN_COPY.loggedOutText}
    </KernAlert>
  );
}
