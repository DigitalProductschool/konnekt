import { describe, expect, it } from 'vitest';

import { INITIAL_COPY_STATE } from './constants';
import { copyReducer, isCut } from './utils';

describe('copyReducer', () => {
  it('reads "Copied" after copying and counts each attempt', () => {
    const copied = copyReducer(INITIAL_COPY_STATE, { type: 'copied' });
    expect(copied).toEqual({ status: 'copied', attempt: 1 });
    expect(copyReducer(copied, { type: 'copied' })).toEqual({ status: 'copied', attempt: 2 });
  });

  it('records a failure and goes back to idle on reset, keeping the count', () => {
    const failed = copyReducer(INITIAL_COPY_STATE, { type: 'failed' });
    expect(failed).toEqual({ status: 'failed', attempt: 1 });
    expect(copyReducer(failed, { type: 'reset' })).toEqual({ status: 'idle', attempt: 1 });
  });
});

describe('isCut', () => {
  it('is true only when the text is wider than its box', () => {
    expect(isCut({ scrollWidth: 700, clientWidth: 571 })).toBe(true);
    expect(isCut({ scrollWidth: 571, clientWidth: 571 })).toBe(false);
    expect(isCut({ scrollWidth: 300, clientWidth: 571 })).toBe(false);
  });
});
