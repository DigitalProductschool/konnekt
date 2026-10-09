import type { CardAlign, SceneCredential } from './types';

export const AUTH_INTRO_COPY = {
  headline: 'Connect your forms to the EUDI Wallet',
  lead: 'Sharing verified data made easy.',
};

// Intro and card sit side by side from 1152px, where 600 + 80 + 440 and the page padding fit
export const CARD_ALIGN_CLASSES: Record<CardAlign, string> = {
  center: 'min-[1152px]:items-center',
  end: 'min-[1152px]:items-end',
};

// The documents of the Figma "wallet scene", back to front
export const SCENE_CREDENTIALS: Record<'licence' | 'id', SceneCredential> = {
  licence: {
    title: 'Driving licence',
    cardClassName: 'border-kern-feedback-success bg-kern-feedback-success-background',
    lineClassName: 'bg-kern-feedback-success',
    lineWidths: ['w-130', 'w-88'],
  },
  id: {
    title: 'Personal ID',
    cardClassName:
      'border-(--kern-color-decorative-border-default) bg-kern-layout-background-default',
    lineClassName: 'bg-(--kern-color-decorative-border-default)',
    lineWidths: ['w-160', 'w-100'],
  },
};

export const SCENE_CHECKS = ['Identity verified', 'Age checked', 'Eligible to apply'];
