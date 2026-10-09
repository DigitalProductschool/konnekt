import { Navigate, useLocation } from 'react-router';

import LegalFooter from '../../components/LegalFooter';
import PageLoader from '../../components/PageLoader';
import TopBar from '../../components/TopBar';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { LOGIN_COPY } from './constants';
import LoggedOutAlert from './LoggedOutAlert';
import LoginCard from './LoginCard';
import LoginIntro from './LoginIntro';
import { redirectTarget } from './utils';

/** The sign-in screen (Figma "01 Log in", and "U2 Logged out" after logging out). */
export default function LoginPage() {
  useDocumentTitle(LOGIN_COPY.pageTitle);
  const { status, loggedOut } = useCurrentUser();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader />;
  }
  if (status === 'signedIn') {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }

  return (
    <div className="bg-kern-neutral-025 flex min-h-screen flex-col">
      <TopBar />
      <main className="flex flex-1 items-center px-16 py-40">
        {/* Narrow screens stack alert, intro and card. Wide ones put the intro left and the
            alert above the card on the right, with the intro centred against both */}
        <div className="mx-auto grid w-full max-w-1040 gap-40 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-x-40 lg:gap-y-16">
          {loggedOut && (
            <div className="w-full max-w-440 lg:col-start-2 lg:row-start-1">
              <LoggedOutAlert />
            </div>
          )}
          <div className={`lg:col-start-1 lg:row-start-1 ${loggedOut ? 'lg:row-span-2' : ''}`}>
            <LoginIntro />
          </div>
          <div
            className={`w-full max-w-440 lg:col-start-2 ${loggedOut ? 'lg:row-start-2' : 'lg:row-start-1'}`}
          >
            <LoginCard />
          </div>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
