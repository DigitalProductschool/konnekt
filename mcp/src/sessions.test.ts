import { describe, expect, it, vi } from 'vitest';

import { bearerHashOf, type Closable, SESSION_IDLE_MS, SessionStore } from './sessions';

function session(): Closable & { close: ReturnType<typeof vi.fn> } {
  return { close: vi.fn(async () => undefined) };
}

function storeAt(clock: { now: number }): SessionStore<Closable> {
  return new SessionStore<Closable>(SESSION_IDLE_MS, () => clock.now);
}

describe('bearerHashOf', () => {
  it('is the hex SHA-256 of the token, never the token', () => {
    const hash = bearerHashOf('secret-token');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('secret-token');
    expect(bearerHashOf('secret-token')).toBe(hash);
    expect(bearerHashOf('other-token')).not.toBe(hash);
  });
});

describe('SessionStore', () => {
  it('finds a session with the bearer that opened it', () => {
    const store = storeAt({ now: 0 });
    const value = session();
    store.add('s-1', bearerHashOf('anna'), value);
    expect(store.find('s-1', bearerHashOf('anna'))).toBe(value);
  });

  it("doesn't find it with another bearer, nor an unknown or ended session", () => {
    const store = storeAt({ now: 0 });
    store.add('s-1', bearerHashOf('anna'), session());
    expect(store.find('s-1', bearerHashOf('ben'))).toBeNull();
    expect(store.find('s-2', bearerHashOf('anna'))).toBeNull();
    store.remove('s-1');
    expect(store.find('s-1', bearerHashOf('anna'))).toBeNull();
  });

  it('closes and forgets the sessions idle for longer than 30 minutes', async () => {
    const clock = { now: 0 };
    const store = storeAt(clock);
    const idle = session();
    const used = session();
    store.add('idle', 'h', idle);
    store.add('used', 'h', used);
    clock.now = SESSION_IDLE_MS - 1;
    expect(store.find('used', 'h')).toBe(used);
    clock.now = SESSION_IDLE_MS + 1;
    await store.sweep();
    expect(idle.close).toHaveBeenCalledOnce();
    expect(used.close).not.toHaveBeenCalled();
    expect(store.find('idle', 'h')).toBeNull();
    expect(store.size).toBe(1);
  });

  it('closes every session on closeAll', async () => {
    const store = storeAt({ now: 0 });
    const values = [session(), session()];
    store.add('a', 'h', values[0]);
    store.add('b', 'h', values[1]);
    store.start(10);
    await store.closeAll();
    expect(values.every((value) => value.close.mock.calls.length === 1)).toBe(true);
    expect(store.size).toBe(0);
  });
});
