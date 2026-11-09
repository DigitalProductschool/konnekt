// Tiny CDP driver: open the spike page in headless Chromium, wait for window.__results, save PDFs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [, , url, label = 'chromium'] = process.argv;
const port = 9333;
const profile = `${process.env.TMPDIR}/pdf-spike/chrome-profile-${Date.now()}`;
const chrome = spawn('/usr/bin/chromium', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = ''; chrome.stderr.on('data', (d) => { stderr += d; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let version;
for (let i = 0; i < 50; i += 1) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); } }
if (!version) { console.error('no devtools', stderr.slice(-2000)); chrome.kill(); process.exit(1); }
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Runtime.consoleAPICalled') console.log('page:', JSON.stringify(m.params).slice(0, 500)); });
const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable');
const started = Date.now();
let results;
while (Date.now() - started < 240000) {
  const r = await send('Runtime.evaluate', { expression: 'window.__results ? JSON.stringify(window.__results) : null', returnByValue: true });
  if (r.result?.result?.value) { results = JSON.parse(r.result.result.value); break; }
  await sleep(500);
}
console.log('browser', version.Browser);
if (!results) console.log('TIMEOUT');
for (const r of results ?? []) {
  if (r.pdf) { fs.writeFileSync(`out/${label}-${r.name}.pdf`, Buffer.from(r.pdf, 'base64')); delete r.pdf; }
  for (const k of Object.keys(r)) if (typeof r[k] === 'number') r[k] = Math.round(r[k]);
  console.log(JSON.stringify(r));
}
ws.close(); chrome.kill(); fs.rmSync(profile, { recursive: true, force: true });
