import { BANNER_ICONS } from './RulesStep/constants';
import type { PublishFindingLineProps } from './types';

/**
 * A branch's findings in the publish and save dialog (spec 003, S5; W10; FR-017, FR-019), built
 * from spec 002's warnings line (U33 6376:26181, "1 warning on Ambulance"): the 20 px kind icon,
 * 8 px, then the text in body/default, top-aligned so that a long line wraps under itself. In the
 * warning style, as drawn, when the branch has a conflict or no citizen can meet it: KERN's
 * warning triangle and the text in label/default and `feedback-warning`. In the info style
 * otherwise, less prominently: KERN's info icon and the text in regular weight and
 * `feedback-info`. The text names the branch and says what its findings are, so the icon is
 * decorative.
 */
export default function PublishFindingLine({ line }: PublishFindingLineProps) {
  const warning = line.tone === 'warning';
  return (
    <li className="flex items-start gap-8">
      {/* The 24 px line box centres the icon on the first line, as Figma's centred row does */}
      <span className="flex h-24 shrink-0 items-center">
        <span
          aria-hidden="true"
          className={`kern-icon ${BANNER_ICONS[line.tone]} kern-icon--small`}
        />
      </span>
      <p
        className={`text-kern-static-medium min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static) break-words ${warning ? 'text-kern-feedback-warning font-semibold' : 'text-kern-feedback-info'}`}
      >
        {line.text}
      </p>
    </li>
  );
}
