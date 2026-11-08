import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { ReactNode } from 'react';

import type { FormConnectionState } from '../../hooks/types';
import type { SKELETON_VALUE_WIDTHS } from './constants';

export interface FormConnectionLoadStateProps {
  /** Every state but the loaded one */
  state: Exclude<FormConnectionState, { status: 'loaded' }>;
  onRetry: () => void;
  /** Why loading failed, with a 5xx answer's error ID; the alert's own sentence without it */
  notice?: ErrorNotice;
  /** The frame's actions; a link home without them */
  footer?: ReactNode;
}

export interface LoadFailedProps {
  onRetry: () => void;
  notice?: ErrorNotice;
}

export interface SkeletonRowProps {
  /** The value bar's width class */
  value: (typeof SKELETON_VALUE_WIDTHS)[number];
}
