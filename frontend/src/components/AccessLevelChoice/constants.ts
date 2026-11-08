import type { AccessLevelInfo } from '@connection-portal/api-types/agent-access';

/**
 * The three access levels with the texts of contracts/ui-screens.md S1, for a page that has no
 * `levels` from the API (the consent page); the API's `levels` say the same
 */
export const ACCESS_LEVELS: AccessLevelInfo[] = [
  {
    level: 'read',
    name: 'Read only',
    allows:
      'Find and read connections, variants and rules, run the rule checks and test fictitious ' +
      'citizens. Nothing changes.',
  },
  {
    level: 'drafts',
    name: 'Read and edit drafts',
    allows:
      'Also create and change drafts, and ask you to publish or delete a draft. Published ' +
      'connections stay read-only.',
  },
  {
    level: 'manage',
    name: 'Read, edit drafts and manage live connections',
    allows:
      'Also ask you to deactivate, reactivate or delete published connections. Each of these ' +
      'needs your approval here.',
  },
];
