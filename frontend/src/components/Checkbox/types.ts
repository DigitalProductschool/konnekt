export interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  /** Shown as a dash and read as "mixed", for a checkbox that stands for a partial group */
  indeterminate?: boolean;
  /** Greys the row out (40 %) and ignores clicks */
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  /** The id of a message about this checkbox, such as a validation message */
  describedBy?: string;
}
