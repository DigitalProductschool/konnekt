import { afterEach, describe, expect, it, vi } from 'vitest';

import { logError, logRequest } from './log';

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes one line per request with the four fields and nothing else', () => {
    const write = vi.spyOn(console, 'error').mockImplementation(() => {});
    logRequest({ method: 'tools/call', tool: 'get_connection', status: 'ok', durationMs: 12.6 });

    expect(write).toHaveBeenCalledTimes(1);
    const line = String(write.mock.calls[0][0]);
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toEqual({
      method: 'tools/call',
      tool: 'get_connection',
      status: 'ok',
      durationMs: 13,
    });
  });

  it('ignores anything passed beyond the four fields', () => {
    const write = vi.spyOn(console, 'error').mockImplementation(() => {});
    const entry = {
      method: 'tools/list',
      tool: null,
      status: 200,
      durationMs: 1,
      token: 'cp_at_x',
    };
    logRequest(entry);

    expect(Object.keys(JSON.parse(String(write.mock.calls[0][0])))).toEqual([
      'method',
      'tool',
      'status',
      'durationMs',
    ]);
  });

  it('writes an error as one line', () => {
    const write = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('The backend did not answer');

    expect(JSON.parse(String(write.mock.calls[0][0]))).toEqual({
      level: 'error',
      message: 'The backend did not answer',
    });
  });
});
