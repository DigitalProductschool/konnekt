// The 2025-era sessions (research R2): in memory, each bound to the SHA-256 of the bearer that
// opened it, and closed after 30 idle minutes. A session asked for with another bearer, or one
// unknown or ended, isn't found, which /mcp answers with 404
import { createHash } from 'node:crypto';

/** How long a session may stay unused before it is closed (research R2). */
export const SESSION_IDLE_MS = 30 * 60_000;

/** How often idle sessions are looked for. */
export const SESSION_SWEEP_MS = 60_000;

/** What a session holds: something that can be closed. */
export interface Closable {
  close(): Promise<void>;
}

interface Entry<T> {
  value: T;
  bearerHash: string;
  lastUsed: number;
}

/** The SHA-256 of a bearer token, hex: the only form in which a session remembers it. */
export function bearerHashOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** The open sessions by their `Mcp-Session-Id`. */
export class SessionStore<T extends Closable> {
  readonly #entries = new Map<string, Entry<T>>();
  #timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly idleMs: number = SESSION_IDLE_MS,
    private readonly now: () => number = Date.now
  ) {}

  /** The number of open sessions. */
  get size(): number {
    return this.#entries.size;
  }

  /** Keeps a new session, bound to the bearer that opened it. */
  add(id: string, bearerHash: string, value: T): void {
    this.#entries.set(id, { value, bearerHash, lastUsed: this.now() });
  }

  /**
   * The session `id` if it was opened with the same bearer, and marks it used; `null` for an
   * unknown or ended session or another bearer's
   */
  find(id: string, bearerHash: string): T | null {
    const entry = this.#entries.get(id);
    if (!entry || entry.bearerHash !== bearerHash) return null;
    entry.lastUsed = this.now();
    return entry.value;
  }

  /** Forgets a session that ended (its transport closed); doesn't close it. */
  remove(id: string): void {
    this.#entries.delete(id);
  }

  /** Closes and forgets the sessions unused for longer than the idle time. */
  async sweep(): Promise<void> {
    const cutoff = this.now() - this.idleMs;
    const idle = [...this.#entries].filter(([, entry]) => entry.lastUsed < cutoff);
    for (const [id] of idle) this.#entries.delete(id);
    await Promise.allSettled(idle.map(([, entry]) => entry.value.close()));
  }

  /** Sweeps every `intervalMs` until `closeAll()`; the timer doesn't keep the process alive. */
  start(intervalMs: number = SESSION_SWEEP_MS): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => void this.sweep(), intervalMs);
    this.#timer.unref();
  }

  /** Stops sweeping, then closes and forgets every session. */
  async closeAll(): Promise<void> {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    const entries = [...this.#entries.values()];
    this.#entries.clear();
    await Promise.allSettled(entries.map((entry) => entry.value.close()));
  }
}
