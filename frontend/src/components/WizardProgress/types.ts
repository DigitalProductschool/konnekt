export type WizardStepState = 'done' | 'current' | 'todo';

export interface WizardProgressProps {
  /** The step names, in order */
  steps: readonly string[];
  /** The index of the current step */
  current: number;
  /** Goes back to a finished step; without it, finished steps aren't links */
  onSelect?: (index: number) => void;
}

export interface WizardStepProps {
  label: string;
  number: number;
  state: WizardStepState;
  onSelect?: () => void;
}
