import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { ReactNode } from 'react';

import type { FormConnectionState } from '../../hooks/types';
import type { WizardLayoutVariant } from '../WizardLayout/types';
import type { SKELETON_VALUE_WIDTHS } from './constants';

export interface FormConnectionLoadStateProps {
  /** Every state but the loaded one */
  state: Exclude<FormConnectionState, { status: 'loaded' }>;
  onRetry: () => void;
  /** The frame's actions; a link home without them, no footer for null */
  footer?: ReactNode;
  /**
   * The loaded screen's frame, so that nothing jumps when it arrives: the steps' (default) or the
   * details' (L4)
   */
  variant?: WizardLayoutVariant;
  /**
   * The loading skeleton in the loaded screen's shape (U06 #95), such as the details' band and
   * accordions; the kit's skeleton rows in a card without it. Only visual: screen readers hear
   * the status
   */
  skeleton?: ReactNode;
}

export interface LoadFailedProps {
  onRetry: () => void;
  /** Why loading failed, with a 5xx answer's error ID; the alert's own sentence without it */
  notice: ErrorNotice | null;
}

export interface LoadingSkeletonProps {
  skeleton?: ReactNode;
}

export interface SkeletonRowProps {
  /** The value bar's width class */
  value: (typeof SKELETON_VALUE_WIDTHS)[number];
}
