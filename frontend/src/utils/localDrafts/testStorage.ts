// An in-memory StorageLike for the tests of the local drafts; never imported by the app
import type { StorageLike } from './types';

/** A Map-backed fake of `window.localStorage`, in insertion order */
export class MemoryStorage implements StorageLike {
  readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

/** A storage whose quota is used up: reading and removing work, writing throws */
export class FullStorage extends MemoryStorage {
  setItem(): void {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  }
}

/** A blocked storage: every access throws, as in some private windows */
export class BlockedStorage implements StorageLike {
  get length(): number {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }

  key(): string | null {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }

  getItem(): string | null {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }

  setItem(): void {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }

  removeItem(): void {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }
}
