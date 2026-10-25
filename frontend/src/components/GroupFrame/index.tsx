import Connector from '../Connector';
import ProblemNote from '../RuleRow/ProblemNote';
import GroupHeader from './GroupHeader';
import GroupMessage from './GroupMessage';
import type { GroupFrameProps } from './types';

/**
 * A group or sub-group (S2, S6; Figma U14 6094:6411, 6094:6318; U16 6344:53610), in its "Group
 * wrap": a frame with the action colour's left border, tinted for a group and white and rounded
 * for a sub-group. Under its header: its own message, if it has one (U14 6324:39410; W6), a
 * note, then its members with the group's AND or OR between them, and a footer. The Rules step
 * adds the ⋯ menu, inline renaming, the editable message, the note after switching and "Add
 * rule"; the details add the identifier (W1). Nothing in it is positioned, so that the Rules
 * step's select boxes line up with the rules card.
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
  members,
  onSwitchOperator,
  footer,
}: GroupFrameProps) {
  return (
    <div className="px-16 py-8">
      <div
        id={id}
        tabIndex={id ? -1 : undefined}
        role="group"
        aria-label={group.name}
        className={`border-kern-action-default focus-visible:outline-kern-action-focus-default border-l-3 pt-8 focus-visible:outline-4 focus-visible:outline-offset-2 ${
          subGroup
            ? 'rounded-kern-default bg-kern-layout-background-default'
            : 'bg-kern-layout-background-hued'
        }`}
      >
        <GroupHeader
          name={group.name}
          subGroup={subGroup}
          operator={group.operator}
          nameSlot={nameSlot}
          identifier={showIdentifier ? group.id : undefined}
          actions={actions}
        />
        {flag && (
          <div className="pt-8">
            <ProblemNote message={flag} />
          </div>
        )}
        {group.message !== null && <GroupMessage message={group.message} field={messageField} />}
        {note}
        <ul>
          {members.map((member, index) => (
            <li key={member.key}>
              {index > 0 && (
                <Connector
                  operator={group.operator}
                  levelName={group.name}
                  onSwitch={onSwitchOperator}
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
