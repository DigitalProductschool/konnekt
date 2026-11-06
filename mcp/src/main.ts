// The MCP server's entry: listens on PORT (research R2, R3) and stops cleanly on SIGTERM (the
// container's stop) or SIGINT
import { config } from './config';
import { logError } from './log';
import { startServer } from './server';

startServer({ port: config.port }).then(
  (running) => {
    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
      process.once(signal, () => {
        running.close().finally(() => process.exit(0));
      });
    }
  },
  () => {
    logError('The MCP server could not start');
    process.exit(1);
  }
);
