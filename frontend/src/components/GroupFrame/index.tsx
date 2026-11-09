import { BRANCH_MARK_TINTS, INACTIVE_OPACITY } from '../BranchMark/constants';
import Connector from '../Connector';
import FindingNote from '../FindingNote';
import { FINDING_LOOKS, FINDING_NOTE_ID_SUFFIX } from '../FindingNote/constants';
import ProblemNote from '../RuleRow/ProblemNote';
import {
  GROUP_FINDING_NOTE_SPACING,
  GROUP_FRAME_BORDERS,
  GROUP_FRAME_FADED_BORDERS,
  GROUP_FRAME_FADED_FILLS,
  GROUP_FRAME_FADED_TINTS,
  GROUP_FRAME_FILLS,
  GROUP_HEADER_ID_SUFFIX,
} from './constants';
import GroupHeader from './GroupHeader';
import GroupMessage from './GroupMessage';
import type { GroupFrameProps } from './types';

/**
 * A group or sub-group (S9; Figma U34 6094:6411, 6094:6318) in its "Group wrap" (padding 8 16):
 * a frame 8px above its header with the action colour's 3px left border, the page's light blue
 * for a group and white with radius 8 for a sub-group. Under its header: its own message card,
 * if it has one (U35 6324:39410; W6, FR-037), a note such as the one after switching its AND or
 * OR (U34 6329:19219; FR-051 (32)), then its members with the group's AND or OR between them
 * (FR-038), and a footer. The Rules step adds the ⋯ menu, inline renaming, the editable message,
 * the note and "Add rule"; the details add the identifier (W1); in select mode the step passes the
 * group's checkbox (F33), and the selected group looks unchanged.
 *
 * In a variant based on Standard, the header shows its mark (FR-023): a changed group is tinted
 * purple and keeps its blue border (U58 6522:32997), an added one is tinted with a purple border
 * (U38 6163:5269). A removed group, or one dissolved there (F13; U47 6185:41165), keeps its frame,
 * mark and ⋯ in full colour while its name and subtitle fade and the name is struck through; its
 * message and connectors fade, and its members fade themselves (the call site passes them
 * `faded`). Inside a removed group (`faded`), the frame's fill, border and divider fade too (U47
 * 6185:41171). Nothing here fades a box around the members: opacity makes a stacking context,
 * which would fade their marks (F36) and any menu opened inside (V6).
 *
 * In the Rules step, a group with a finding of spec 003 is outlined all round in the finding's
 * colour, in place of its left border, with the note under its header (U44 6171:7561, U45
 * 6753:40525): a conflict's note right under the divider, a duplicate, covered or always-met
 * group's 8px below it. The note describes the frame and the header, where the findings banner's
 * name links move the focus (FR-012; W19); a flag wins over a finding (W11). Nothing in it is
 * positioned, so that the Rules step's select boxes line up with the rules card.
 */
export default function GroupFrame({
  group,
  subGroup,
  id,
  nameSlot,
  showIdentifier = false,
  actions,
  messageField,
  note,
  flag,
  finding = null,
  members,
  onSwitchOperator,
  footer,
  mark = null,
  inactive = false,
  faded = false,
  selectBox,
}: GroupFrameProps) {
  const level = subGroup ? 'subGroup' : 'group';
  const tint = mark ? (faded ? GROUP_FRAME_FADED_TINTS : BRANCH_MARK_TINTS)[mark] : '';
  const fill = tint
    ? `${tint} ${subGroup ? 'rounded-kern-default' : ''}`
    : (faded ? GROUP_FRAME_FADED_FILLS : GROUP_FRAME_FILLS)[level];
  const border = (faded ? GROUP_FRAME_FADED_BORDERS : GROUP_FRAME_BORDERS)[
    mark === 'added' ? 'added' : 'default'
  ];
  // Its own parts fade when it is removed, dissolved, or inside a removed group
  const dimmed = inactive || faded;
  // A flagged group shows its problem and no finding (W11)
  const shownFinding = flag ? null : finding;
  const problemId = flag && id ? `${id}-problem` : undefined;
  const findingId = shownFinding && id ? `${id}${FINDING_NOTE_ID_SUFFIX}` : undefined;
  // With a finding: the outline's colour all round, 1px, in place of the left border (U44
  // 6171:7561, U45 6753:40525). The frame keeps its corners: a sub-group's are rounded, a group's
  // square, as Figma draws both
  const frameBorder = shownFinding
    ? `${FINDING_LOOKS[shownFinding.kind].outline} border`
    : `${border} border-l-3`;
  return (
    <div className="px-16 py-8">
      {selectBox}
      <div
        id={id}
        tabIndex={id ? -1 : undefined}
        role="group"
        aria-label={group.name}
        aria-describedby={problemId ?? findingId}
        className={`${frameBorder} ${fill} focus-visible:outline-kern-action-focus-default pt-8 focus-visible:outline-4 focus-visible:outline-offset-2`}
      >
        <GroupHeader
          id={id ? `${id}${GROUP_HEADER_ID_SUFFIX}` : undefined}
          describedBy={problemId ?? findingId}
          name={group.name}
          subGroup={subGroup}
          operator={group.operator}
          nameSlot={nameSlot}
          identifier={showIdentifier ? group.id : undefined}
          actions={actions}
          mark={inactive ? 'removed' : mark}
          inactive={dimmed}
          faded={faded}
        />
        {flag && (
          <div className="pt-8">
            <ProblemNote id={problemId} message={flag} />
          </div>
        )}
        {shownFinding && (
          <div className={GROUP_FINDING_NOTE_SPACING[shownFinding.kind]}>
            <FindingNote id={findingId} kind={shownFinding.kind} text={shownFinding.text} />
          </div>
        )}
        {group.message !== null && (
          <GroupMessage message={group.message} field={messageField} faded={dimmed} />
        )}
        {note && <div className={dimmed ? INACTIVE_OPACITY : undefined}>{note}</div>}
        <ul>
          {members.map((member, index) => (
            <li key={member.key}>
              {index > 0 && (
                <Connector
                  operator={group.operator}
                  levelName={group.name}
                  onSwitch={onSwitchOperator}
                  faded={dimmed || member.faded}
                />
              )}
              {member.node}
            </li>
          ))}
        </ul>
        {footer}
      </div>
    </div>
  );
}
