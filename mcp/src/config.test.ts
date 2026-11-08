import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfigError, loadConfig } from './config';

const PRODUCTION = {
  NODE_ENV: 'production',
  BACKEND_URL: 'http://backend:3000',
  PORTAL_URL: 'https://portal.example.org/',
  MCP_URL: 'https://portal.example.org/mcp/',
  OAUTH_ISSUER: 'https://portal.example.org',
};

describe('loadConfig', () => {
  it('uses the development defaults outside production', () => {
    expect(loadConfig({ NODE_ENV: 'development' })).toEqual({
      port: 3100,
      backendUrl: 'http://localhost:3000',
      portalUrl: 'http://localhost:5173',
      mcpUrl: 'http://localhost:3100/mcp',
      oauthIssuer: 'http://localhost:3000',
      mcpOrigin: 'http://localhost:3100',
    });
  });

  it('reads the environment and removes trailing slashes', () => {
    expect(loadConfig({ ...PRODUCTION, PORT: '8080' })).toEqual({
      port: 8080,
      backendUrl: 'http://backend:3000',
      portalUrl: 'https://portal.example.org',
      mcpUrl: 'https://portal.example.org/mcp',
      oauthIssuer: 'https://portal.example.org',
      mcpOrigin: 'https://portal.example.org',
    });
  });

  it.each(['BACKEND_URL', 'PORTAL_URL', 'MCP_URL', 'OAUTH_ISSUER'])(
    'refuses a missing %s in production, naming it',
    (name) => {
      const env: Record<string, string | undefined> = { ...PRODUCTION, [name]: undefined };
      expect(() => loadConfig(env)).toThrow(new ConfigError(`${name} is not set`));
    }
  );

  it('refuses a URL that is not one, and a port that is not one', () => {
    expect(() => loadConfig({ MCP_URL: 'portal/mcp' })).toThrow('MCP_URL is not a URL');
    expect(() => loadConfig({ PORT: 'abc' })).toThrow('PORT is not a port number');
  });
});

describe('config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('ends the process at start with one line naming the missing variable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const [name, value] of Object.entries(PRODUCTION)) vi.stubEnv(name, value);
    vi.stubEnv('PORTAL_URL', '');
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const write = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();

    await expect(import('./config')).rejects.toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(String(write.mock.calls[0][0])).toContain('PORTAL_URL is not set');
  });
});
