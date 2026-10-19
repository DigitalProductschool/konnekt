import type { ReactNode } from 'react';

import type { FormConnectionState } from '../../hooks/types';

export interface FormConnectionLoadStateProps {
  /** Every state but the loaded one */
  state: Exclude<FormConnectionState, { status: 'loaded' }>;
  onRetry: () => void;
  /** The frame's actions; a link home without them */
  footer?: ReactNode;
}

export interface LoadFailedProps {
  onRetry: () => void;
}
