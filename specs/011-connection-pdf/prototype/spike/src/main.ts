// Spike page: runs the scenarios in the worker, reports timings on window.__results
import { connection, draftOf } from './pdf/data.js';
import { bigConnection } from './pdf/big.js';

const now = '2026-11-09T15:45:00Z';
const scenarios: [string, unknown][] = [
  ['published', connection],
  ['draft', draftOf(connection)],
  ['published-warm', connection],
  ['big', bigConnection()],
  ['big-warm', bigConnection()],
];
let worker: Worker | null = null;
function run(con: unknown): Promise<any> {
  worker ??= new Worker(new URL('./workers/pdf.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve) => {
    const start = performance.now();
    const w = worker!;
    w.onmessage = (e) => resolve({ ...e.data, wallMs: performance.now() - start });
    w.onerror = (e) => resolve({ ok: false, error: `worker error: ${e.message}` });
    w.postMessage({ con, now });
  });
}
const toBase64 = async (blob: Blob) => {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
};
(async () => {
  const out: any[] = [];
  // a heartbeat on the main thread, to show the page keeps responding
  let beats = 0; let maxGap = 0; let last = performance.now();
  const timer = setInterval(() => { const t = performance.now(); maxGap = Math.max(maxGap, t - last); last = t; beats += 1; }, 50);
  for (const [name, con] of scenarios) {
    maxGap = 0; last = performance.now();
    const r = await run(con);
    const entry: any = { name, ...r, mainThreadMaxGapMs: Math.round(maxGap) };
    if (r.blob) { entry.pdf = await toBase64(r.blob); delete entry.blob; }
    out.push(entry);
  }
  clearInterval(timer);
  (window as any).__results = out;
  await fetch('/results', { method: 'POST', body: JSON.stringify(out) }).catch(() => {});
  document.title = 'DONE';
  document.body.dataset.done = '1';
})();
