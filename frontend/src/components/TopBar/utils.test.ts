import { describe, expect, it } from 'vitest';

import { headerBackgroundClasses } from './utils';

function classesOf(scrolled: boolean): string[] {
  return headerBackgroundClasses(scrolled).split(/\s+/).filter(Boolean);
}

describe('headerBackgroundClasses: the header area under the pills (U03 #39)', () => {
  it('is white once the page has scrolled, at once: no transition into white', () => {
    const classes = classesOf(true);
    expect(classes).toContain('bg-kern-layout-background-default');
    expect(classes.filter((name) => /^(transition|duration-|ease-|delay-)/.test(name))).toEqual([]);
  });

  it('is transparent at the top and fades back over the colour duration', () => {
    const classes = classesOf(false);
    expect(classes.filter((name) => name.startsWith('bg-'))).toEqual([]);
    expect(classes).toEqual(['transition-colors', 'duration-(--duration-colour)']);
  });
});
