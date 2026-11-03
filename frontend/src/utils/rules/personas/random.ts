// A small seeded generator (specs/004-rule-test-personas, research R7 "Randomness"): mulberry32,
// pure and without a dependency. The hook seeds each run with `crypto.getRandomValues()`, and the
// tests use fixed seeds, so equal seeds give equal personas. Never `Math.random()`

/** A seeded source of random choices */
export interface Random {
  /** A number in [0, 1) */
  next(): number;
  /** A whole number from `min` to `max`, both included */
  int(min: number, max: number): number;
  /** One item of a list that isn't empty */
  pick<T>(list: readonly T[]): T;
  /** A new array with the list's items in random order */
  shuffle<T>(list: readonly T[]): T[];
  /** One item of a list that isn't empty, each as likely as its weight; weights are at least 0 */
  weighted<T>(list: readonly T[], weights: readonly number[]): T;
}

/** A generator seeded with `seed`, whose 32 lower bits count */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }

  function int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`No whole number from ${min} to ${max}`);
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(list: readonly T[]): T {
    if (list.length === 0) {
      throw new RangeError('Nothing to pick from');
    }
    return list[int(0, list.length - 1)];
  }

  function shuffle<T>(list: readonly T[]): T[] {
    const shuffled = [...list];
    // Fisher–Yates
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const other = int(0, index);
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
  }

  function weighted<T>(list: readonly T[], weights: readonly number[]): T {
    if (list.length === 0 || weights.length !== list.length) {
      throw new RangeError('Every item needs one weight');
    }
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
      throw new RangeError('Weights are finite and at least 0');
    }
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total === 0) {
      return pick(list);
    }
    let point = next() * total;
    for (let index = 0; index < list.length; index += 1) {
      point -= weights[index];
      if (point < 0) {
        return list[index];
      }
    }
    // Rounding can leave the point at the very end: the last item with a weight
    let last = list.length - 1;
    while (weights[last] === 0) {
      last -= 1;
    }
    return list[last];
  }

  return { next, int, pick, shuffle, weighted };
}
