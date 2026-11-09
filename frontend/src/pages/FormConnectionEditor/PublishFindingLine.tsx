import { BANNER_ICONS } from './RulesStep/constants';
import type { PublishFindingLineProps } from './types';

/**
 * A variant's findings in the publish and save dialog (spec 003, S5; W10; FR-017, FR-019;
 * FR-022), Figma `Rules/Finding item` in "Rule findings" (U77 6760:47354, 6760:47372; U63
 * 7112:48859): the 20 px kind icon, 8 px, then the text in body/small and the default text colour,
 * as C4's sentence ("Ambulance: no citizen can meet these rules. 2 rules contradict each other,
 * and 1 rule is a duplicate."). KERN's warning triangle in `feedback-warning` when the variant has
 * a conflict or no citizen can meet it, its info icon in `feedback-info` otherwise. The icon sits
 * in the middle of the text's lines, as the frame's centred row draws it. The text names the
 * variant and says what its findings are, so the icon is decorative. The approval page lists its
 * findings with it too (spec 007, S3).
 */
export default function PublishFindingLine({ line }: PublishFindingLineProps) {
  return (
    <li className="flex items-center gap-8">
      <span
        aria-hidden="true"
        className={`kern-icon ${BANNER_ICONS[line.tone]} kern-icon--small shrink-0`}
      />
      <p className="text-kern-static-small text-kern-layout-text-default min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static) break-words">
        {line.text}
      </p>
    </li>
  );
}
