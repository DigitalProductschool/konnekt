import type { CopyStatus } from './types';

export const COPYABLE_URL_COPY = {
  copy: 'Copy link',
  copied: 'Copied',
};

// What the status region announces after each attempt
export const ANNOUNCEMENTS: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Link copied',
  failed: 'Copying didn’t work. The link is selected, so you can copy it yourself.',
};

// How long the button says "Copied"
export const COPIED_RESET_MS = 3000;
