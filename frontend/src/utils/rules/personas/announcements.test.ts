import { describe, expect, it } from 'vitest';

import { announcementOf } from './announcements';

const MIA = { name: 'Mia Schulz' };
const BRANCHES = [
  { key: 'main', name: 'Standard' },
  { key: 'amb', name: 'Ambulance' },
];

describe('announcementOf (FR-017)', () => {
  it('is empty when nothing changed', () => {
    const met = { main: true, amb: false };
    expect(announcementOf(met, { ...met }, MIA, BRANCHES)).toBe('');
  });

  it('announces a persona who now meets a branch', () => {
    expect(
      announcementOf({ main: false, amb: true }, { main: true, amb: true }, MIA, BRANCHES)
    ).toBe('Mia Schulz now meets the rules of Standard.');
  });

  it('announces a persona who no longer meets a branch', () => {
    expect(
      announcementOf({ main: true, amb: true }, { main: false, amb: true }, MIA, BRANCHES)
    ).toBe('Mia Schulz no longer meets the rules of Standard.');
  });

  it('joins several changes with a space, in tab order', () => {
    expect(
      announcementOf({ main: true, amb: false }, { main: false, amb: true }, MIA, BRANCHES)
    ).toBe(
      'Mia Schulz no longer meets the rules of Standard. Mia Schulz now meets the rules of Ambulance.'
    );
    expect(
      announcementOf({ main: true, amb: false }, { main: false, amb: true }, MIA, [
        BRANCHES[1],
        BRANCHES[0],
      ])
    ).toBe(
      'Mia Schulz now meets the rules of Ambulance. Mia Schulz no longer meets the rules of Standard.'
    );
  });

  it('leaves out a branch without an outcome on either side', () => {
    expect(announcementOf({ main: true }, { main: true, amb: true }, MIA, BRANCHES)).toBe('');
    expect(announcementOf({ main: true, amb: true }, { amb: true }, MIA, BRANCHES)).toBe('');
  });
});
