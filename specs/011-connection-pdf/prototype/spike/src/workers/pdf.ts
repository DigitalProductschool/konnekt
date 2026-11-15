// Spike: the PDF worker. PDFKit, the renderer and the fonts load on the first message only
import regUrl from '@expo-google-fonts/fira-sans/400Regular/FiraSans_400Regular.ttf?url';
import medUrl from '@expo-google-fonts/fira-sans/500Medium/FiraSans_500Medium.ttf?url';
import semiUrl from '@expo-google-fonts/fira-sans/600SemiBold/FiraSans_600SemiBold.ttf?url';
import monoUrl from '@expo-google-fonts/fira-mono/400Regular/FiraMono_400Regular.ttf?url';
import monoMedUrl from '@expo-google-fonts/fira-mono/500Medium/FiraMono_500Medium.ttf?url';

let loading: Promise<any> | null = null;
const bytes = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`font ${r.status}`); return r.arrayBuffer(); });
function load() {
  loading ??= Promise.all([
    import('pdfkit'),
    import('../pdf/render.js'),
    import('../pdf/fingerprint.js'),
    Promise.all([regUrl, medUrl, semiUrl, monoUrl, monoMedUrl].map(bytes)),
  ]).then(([pdfkit, renderer, fp, [reg, med, semi, mono, monoMed]]) => ({
    PDFDocument: pdfkit.default, render: renderer.render, fingerprintOf: fp.fingerprintOf,
    fonts: { reg, med, semi, mono, monoMed },
  }));
  return loading;
}

self.onmessage = async (event: MessageEvent) => {
  const t0 = performance.now();
  try {
    const { PDFDocument, render, fingerprintOf, fonts } = await load();
    const t1 = performance.now();
    const version = await fingerprintOf(event.data.con);
    const t2 = performance.now();
    const result = await render(PDFDocument, fonts, event.data.con, { now: new Date(event.data.now), version });
    const t3 = performance.now();
    (self as any).postMessage({ ok: true, blob: result.blob, pages: result.pages, version, size: result.blob.size,
      loadMs: t1 - t0, fingerprintMs: t2 - t1, renderMs: t3 - t2, totalMs: t3 - t0 });
  } catch (error) {
    (self as any).postMessage({ ok: false, error: String((error as Error)?.stack ?? error) });
  }
};
