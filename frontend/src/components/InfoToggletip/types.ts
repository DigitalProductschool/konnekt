export interface InfoToggletipProps {
  /** The button's accessible name, such as "About the form name" */
  label: string;
  /** One or two sentences that explain the field or link */
  text: string;
  /** Which side the arrow sits on; "end" for an icon near the right edge */
  arrow?: 'start' | 'end';
  /** The (i) icon: 24px next to field labels, 20px next to link titles */
  iconSize?: 'default' | 'small';
}
