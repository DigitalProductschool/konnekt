import { KernLoader } from '@kern-ux-annex/kern-react-kit';

/** Fills the screen while the app finds out whether someone is signed in. */
export default function PageLoader() {
  return (
    <div className="bg-kern-neutral-025 flex min-h-screen items-center justify-center">
      <KernLoader />
    </div>
  );
}
