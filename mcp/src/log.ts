// The server's log: one line per request on stderr, and errors (research R18). The only module
// that may use `console`; nothing else (claims, tokens, inputs, results) is ever written

/** The four fields of a request's log line, and nothing else. */
export interface RequestLog {
  method: string;
  tool: string | null;
  status: string | number;
  durationMs: number;
}

/** Writes one line for a request: its method, tool, status and duration. */
export function logRequest({ method, tool, status, durationMs }: RequestLog): void {
  console.error(JSON.stringify({ method, tool, status, durationMs: Math.round(durationMs) }));
}

/** Writes one error line: a fixed description, never an exception's text or a value. */
export function logError(message: string): void {
  console.error(JSON.stringify({ level: 'error', message }));
}
