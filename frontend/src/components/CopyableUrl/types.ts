export interface CopyableUrlProps {
  url: string;
  /** The id of the text that names the link; it describes the copy button */
  describedBy?: string;
}

export type CopyStatus = 'idle' | 'copied' | 'failed';
