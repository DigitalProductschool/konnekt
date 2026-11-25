import type { AccessLevelInfo } from '@konnekt/api-types/agent-access';
import { defineTexts } from '@konnekt/rules/language';

/**
 * The three access levels with the texts of contracts/ui-screens.md S1, for a page that has no
 * `levels` from the API (the consent page); the API's `levels` say the same, in both languages
 * (`backend/app/services/auth.py` `ACCESS_LEVEL_TEXTS`, word for word)
 */
export const ACCESS_LEVELS = defineTexts<AccessLevelInfo[]>(
  [
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
  ],
  [
    {
      level: 'read',
      name: 'Nur lesen',
      allows:
        'Anbindungen, Varianten und Regeln finden und lesen, die Regelprüfung ausführen und ' +
        'fiktive Personen testen. Es ändert sich nichts.',
    },
    {
      level: 'drafts',
      name: 'Lesen und Entwürfe bearbeiten',
      allows:
        'Außerdem Entwürfe erstellen und ändern und Sie bitten, einen Entwurf zu veröffentlichen ' +
        'oder zu löschen. Veröffentlichte Anbindungen können nur gelesen werden.',
    },
    {
      level: 'manage',
      name: 'Lesen, Entwürfe bearbeiten und aktive Anbindungen verwalten',
      allows:
        'Außerdem Sie bitten, veröffentlichte Anbindungen zu deaktivieren, zu reaktivieren oder ' +
        'zu löschen. Dafür ist jeweils hier Ihre Freigabe nötig.',
    },
  ]
);
