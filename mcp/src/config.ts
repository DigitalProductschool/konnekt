// The MCP server's settings, read once from the environment at start (data-model §10)
import { logError } from './log';

export interface Config {
  port: number;
  backendUrl: string;
  portalUrl: string;
  mcpUrl: string;
  oauthIssuer: string;
  mcpOrigin: string;
}

type Environment = Record<string, string | undefined>;

// The URLs a production server must be given: their development defaults would point at
// localhost, so a missing one stops the server instead
const URL_DEFAULTS = {
  BACKEND_URL: 'http://localhost:3000',
  PORTAL_URL: 'http://localhost:5173',
  MCP_URL: 'http://localhost:3100/mcp',
  OAUTH_ISSUER: 'http://localhost:3000',
} as const;

type UrlVariable = keyof typeof URL_DEFAULTS;

const DEFAULT_PORT = 3100;

/** A setting the server can't start without, or one it can't read. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function withoutTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function urlFrom(env: Environment, name: UrlVariable, production: boolean): string {
  const value = env[name]?.trim();
  if (value) {
    try {
      new URL(value);
    } catch {
      throw new ConfigError(`${name} is not a URL`);
    }
    return withoutTrailingSlashes(value);
  }
  if (production) throw new ConfigError(`${name} is not set`);
  return URL_DEFAULTS[name];
}

function portFrom(env: Environment): number {
  const value = env.PORT?.trim();
  if (!value) return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError('PORT is not a port number');
  }
  return port;
}

/**
 * Reads the settings from `env`. The development defaults apply only when `NODE_ENV` isn't
 * `production`; in production a missing URL throws a `ConfigError` naming the variable.
 */
export function loadConfig(env: Environment): Config {
  const production = env.NODE_ENV === 'production';
  const mcpUrl = urlFrom(env, 'MCP_URL', production);
  return {
    port: portFrom(env),
    backendUrl: urlFrom(env, 'BACKEND_URL', production),
    portalUrl: urlFrom(env, 'PORTAL_URL', production),
    mcpUrl,
    oauthIssuer: urlFrom(env, 'OAUTH_ISSUER', production),
    mcpOrigin: new URL(mcpUrl).origin,
  };
}

function configOrExit(): Config {
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    logError(error.message);
    process.exit(1);
  }
}

export const config: Config = configOrExit();
