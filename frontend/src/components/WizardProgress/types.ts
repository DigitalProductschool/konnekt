export type WizardStepState = 'done' | 'current' | 'todo';

export interface WizardProgressProps {
  /** The step names, in order (`CONNECTION_STEPS`: four, FR-025) */
  steps: readonly string[];
  /**
   * The index of the current step. Past the last step (the details, where Publish has been a
   * dialog) there is no step line (FR-025)
   */
  current: number;
  /**
   * Leads to a step: pass it in the edit flow of a published connection only, where the line
   * shows every step's name and each one but the current is a button (F25). Without it, while
   * creating, the line is the progress bar "Step n of 4", which is not clickable
   */
  onSelect?: (index: number) => void;
}

export interface WizardStepProps {
  label: string;
  state: WizardStepState;
  /**
   * The edit flow's step (Figma "Shell/Step link"): the segment with the step's name under it,
   * leading to the step unless it is the current one. Without it, the bare segment of the
   * progress bar
   */
  onSelect?: () => void;
  /** The edit flow's step, whose name shows under its segment */
  labelled?: boolean;
}
