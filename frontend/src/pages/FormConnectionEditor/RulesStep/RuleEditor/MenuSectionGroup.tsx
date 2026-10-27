import MenuChoiceItem from './MenuChoiceItem';
import type { MenuSectionGroupProps } from './types';

/**
 * One section of a menu: a divider after the section before it, its heading, such as "Time ago"
 * (F3), and its choices. A list box holds only groups and options, so the heading names the
 * group and is hidden itself.
 */
export default function MenuSectionGroup({
  idBase,
  section,
  divided,
  selectedKey,
  onChoose,
  onKeyDown,
}: MenuSectionGroupProps) {
  const headingId = `${idBase}-${section.key}`;
  return (
    <>
      {divided && (
        <div
          aria-hidden="true"
          className="h-px w-full shrink-0 bg-(--kern-color-decorative-border-default)"
        />
      )}
      {section.heading && (
        <p
          id={headingId}
          aria-hidden="true"
          className="text-kern-static-small text-kern-layout-text-muted pt-8 pb-2 pl-8 leading-(--kern-typography-line-height-medium-static)"
        >
          {section.heading}
        </p>
      )}
      <ul
        role={section.heading ? 'group' : 'presentation'}
        aria-labelledby={section.heading ? headingId : undefined}
        className="flex flex-col gap-2"
      >
        {section.choices.map((choice) => (
          <MenuChoiceItem
            key={choice.key}
            id={`${idBase}-${choice.key}`}
            choice={choice}
            selected={choice.key === selectedKey}
            onChoose={() => onChoose(choice.key)}
            onKeyDown={(event) => onKeyDown(event, choice.key)}
          />
        ))}
      </ul>
    </>
  );
}
