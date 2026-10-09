import { APP_NAME } from '../../constants';

/**
 * Figma "App/Legal footer". The design also links Imprint, Privacy and
 * Accessibility; they are added once those pages exist.
 */
export default function LegalFooter() {
  return (
    <div className="px-16">
      <footer className="border-kern-neutral-100 mx-auto flex h-56 w-full max-w-1040 items-center gap-24 border-t">
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </footer>
    </div>
  );
}
