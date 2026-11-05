import { describe, expect, it } from 'vitest';

import { createRandom } from './random';

/** The first `count` numbers of a generator seeded with `seed` */
function sequence(seed: number, count: number): number[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random.next());
}

describe('createRandom', () => {
  it('gives equal sequences for equal seeds', () => {
    expect(sequence(42, 100)).toEqual(sequence(42, 100));
    const first = createRandom(7);
    const second = createRandom(7);
    expect([first.int(1, 6), first.pick(['a', 'b', 'c']), first.shuffle([1, 2, 3, 4])]).toEqual([
      second.int(1, 6),
      second.pick(['a', 'b', 'c']),
      second.shuffle([1, 2, 3, 4]),
    ]);
  });

  it('gives different sequences for different seeds', () => {
    expect(sequence(1, 20)).not.toEqual(sequence(2, 20));
    expect(sequence(0, 20)).not.toEqual(sequence(0xffffffff, 20));
  });

  it('keeps next() in [0, 1)', () => {
    for (const value of sequence(123, 10000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps int() within its bounds, both included, and reaches both', () => {
    const random = createRandom(5);
    const seen = new Set<number>();
    for (let index = 0; index < 2000; index += 1) {
      const value = random.int(-3, 3);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(3);
      seen.add(value);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(random.int(4, 4)).toBe(4);
    expect(() => random.int(2, 1)).toThrow(RangeError);
  });

  it('picks an item of the list', () => {
    const random = createRandom(9);
    const list = ['B', 'BE', 'AM'];
    for (let index = 0; index < 100; index += 1) {
      expect(list).toContain(random.pick(list));
    }
    expect(() => random.pick([])).toThrow(RangeError);
  });

  it('shuffles into a new array that is a permutation', () => {
    const random = createRandom(11);
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = random.shuffle(list);
    expect(shuffled).not.toBe(list);
    expect(list).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(list);
    const orders = new Set(Array.from({ length: 50 }, () => random.shuffle(list).join()));
    expect(orders.size).toBeGreaterThan(1);
    expect(random.shuffle([])).toEqual([]);
  });

  it('picks by weight, never an item weighing 0', () => {
    const random = createRandom(13);
    const counts = { DE: 0, AT: 0, FR: 0 };
    for (let index = 0; index < 4000; index += 1) {
      counts[random.weighted(['DE', 'AT', 'FR'] as const, [3, 1, 0])] += 1;
    }
    expect(counts.FR).toBe(0);
    expect(counts.DE).toBeGreaterThan(counts.AT * 2);
    expect(counts.AT).toBeGreaterThan(0);
    expect(() => random.weighted(['a'], [1, 2])).toThrow(RangeError);
    expect(() => random.weighted(['a'], [-1])).toThrow(RangeError);
  });
});
