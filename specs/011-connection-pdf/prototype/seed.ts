// Seeds the test connections A-E of the connection PDF (spec 011, quickstart §0; task T028) into
// a running backend and prints their ids. A sketch-folder script: not shipped, imported by
// nothing, holds no secret. The bodies are SEED_BODIES from the frontend's test data (T018).
//
// Run from the repository root (vite-node resolves the workspace packages from there):
//
//   npx vite-node specs/011-connection-pdf/prototype/seed.ts -- <base-url> <username> <password>
//
// The base URL is the backend itself (http://127.0.0.1:3000), not nginx: E's create body is about
// 1.56 MB, above nginx's default client_max_body_size of 1 MB.
//
// A: published and active. B: a second copy of A, then deactivated. C, D: drafts. E: published.
import { SEED_BODIES } from '../../../frontend/src/utils/connectionPdf/testData';

interface Answer {
  data: Record<string, unknown> | null;
  message?: string;
}

interface Seeded {
  letter: string;
  id: string;
  status: string;
  state: string;
  version: string;
}

function usage(): never {
  process.stderr.write(
    'Usage: npx vite-node specs/011-connection-pdf/prototype/seed.ts -- <base-url> <username> <password>\n'
  );
  process.exit(2);
}

function argumentsOf(argv: string[]): { base: string; username: string; password: string } {
  const args = argv.slice(2).filter((arg) => arg !== '--');
  if (args.length !== 3) usage();
  const [base, username, password] = args;
  return { base: base.replace(/\/+$/, ''), username, password };
}

async function signIn(base: string, username: string, password: string): Promise<string> {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(`Sign-in failed: ${response.status}`);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';', 1)[0]);
  if (cookies.length === 0) throw new Error('Sign-in set no cookie');
  return cookies.join('; ');
}

function client(base: string, cookie: string) {
  return async function call(method: 'GET' | 'POST', path: string, body?: unknown) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Cookie: cookie,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${method} ${path} answered ${response.status}: ${text.slice(0, 600)}`);
    }
    const answer = JSON.parse(text) as Answer;
    if (answer.data === null) throw new Error(`${method} ${path} answered no data`);
    return answer.data;
  };
}

async function main(): Promise<void> {
  const { base, username, password } = argumentsOf(process.argv);
  const call = client(base, await signIn(base, username, password));

  const created: Array<{ letter: string; id: string }> = [];
  const create = async (letter: string, path: string, body: unknown): Promise<string> => {
    const data = await call('POST', path, body);
    const id = String(data.id);
    created.push({ letter, id });
    process.stdout.write(`${letter} created: ${id}\n`);
    return id;
  };

  await create('A', SEED_BODIES.A.path, SEED_BODIES.A.body);
  // B: a second connection with A's body, name included (names needn't be unique)
  const b = await create('B', SEED_BODIES.A.path, SEED_BODIES.A.body);
  await call('POST', `/api/form-connections/${b}/deactivate`, {});
  await create('C', SEED_BODIES.C.path, SEED_BODIES.C.body);
  await create('D', SEED_BODIES.D.path, SEED_BODIES.D.body);
  await create('E', SEED_BODIES.E.path, SEED_BODIES.E.body);

  const seeded: Seeded[] = [];
  for (const { letter, id } of created) {
    const data = await call('GET', `/api/form-connections/${id}`);
    seeded.push({
      letter,
      id,
      status: String(data.status),
      state: String(data.state),
      version: String(data.version_fingerprint),
    });
  }
  process.stdout.write('\n| Letter | Id | Status | State | Version |\n|---|---|---|---|---|\n');
  for (const row of seeded) {
    process.stdout.write(
      `| ${row.letter} | \`${row.id}\` | ${row.status} | ${row.state} | \`${row.version}\` |\n`
    );
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
