// The same renderer under PDFKit's Node build, as a Vitest smoke test would run it
import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { render } from './src/pdf/render.js';
import { connection, draftOf } from './src/pdf/data.js';
const E = 'node_modules/@expo-google-fonts';
const read = (p) => fs.readFileSync(p);
const fonts = { reg: read(`${E}/fira-sans/400Regular/FiraSans_400Regular.ttf`), med: read(`${E}/fira-sans/500Medium/FiraSans_500Medium.ttf`), semi: read(`${E}/fira-sans/600SemiBold/FiraSans_600SemiBold.ttf`), mono: read(`${E}/fira-mono/400Regular/FiraMono_400Regular.ttf`), monoMed: read(`${E}/fira-mono/500Medium/FiraMono_500Medium.ttf`) };
const t = performance.now();
const { blob, pages } = await render(PDFDocument, fonts, draftOf(connection), { now: new Date('2026-11-09T15:45:00Z'), version: '1A79-536D-D067' });
const bytes = Buffer.from(await blob.arrayBuffer());
fs.writeFileSync('out/node-draft.pdf', bytes);
const latin1 = bytes.toString('latin1');
console.log({ pages, size: bytes.length, ms: Math.round(performance.now() - t), lang: /\/Lang \(en-GB\)/.test(latin1), structTreeRoot: latin1.includes('/StructTreeRoot') });
