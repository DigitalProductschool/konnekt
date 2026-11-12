import { EXAMPLE_BANNER_CLASSES } from './constants';
import type { ExampleBannerProps } from './types';

/**
 * The example banner (C4, FR-058; U18 1h 6798:122695, 1i 7344:96396, 1i-c 7344:96451): an
 * instance of "Rules/Findings banner" in its info look, single state: KERN's info icon and one
 * sentence the caller gives (`EXAMPLE_BANNER_COPY`), no action and no close button. Like the
 * findings banner's info variant it has no role and isn't a live region: it is information that
 * is there when the step opens. The icon is decorative and hidden from assistive technologies.
 * The caller shows it while the loaded draft's `example` is set, never for a published
 * connection (FR-059)
 */
export default function ExampleBanner({ text }: ExampleBannerProps) {
  return (
    <div data-example-banner="" className={EXAMPLE_BANNER_CLASSES.box}>
      <span aria-hidden="true" className={EXAMPLE_BANNER_CLASSES.icon} />
      <p className={EXAMPLE_BANNER_CLASSES.text}>{text}</p>
    </div>
  );
}
