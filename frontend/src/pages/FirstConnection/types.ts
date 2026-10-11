/**
 * What /get-started shows: the loader while it checks whether a connection exists, then
 * the wizard (none exists) or the overview (some exist, or the check failed)
 */
export type FirstConnectionState = 'checking' | 'wizard' | 'overview';
