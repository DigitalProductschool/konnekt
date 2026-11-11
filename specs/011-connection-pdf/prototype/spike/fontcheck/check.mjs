import fs from 'node:fs';
import * as fontkit from 'fontkit';
import PDFDocument from 'pdfkit';
const K = 'node_modules/@kern-ux/native/dist/fonts/fira-sans';
const E = 'node_modules/@expo-google-fonts/fira-sans';
const text = 'Taxi and private hire driver licence – Fahrerlaubnis zur Fahrgastbeförderung „ÄÖÜ äöü ß“ ‹›…·€ rule-7 › ✓';
for (const w of ['Regular', 'Medium', 'SemiBold']) {
  const f = fontkit.create(fs.readFileSync(`${K}/FiraSans-${w}.woff2`));
  console.log(w, f.constructor.name, f.postscriptName, 'glyphs', f.numGlyphs, 'has ß/„/›/…:', ['ß','„','›','…','✓'].map(c => f.hasGlyphForCodePoint(c.codePointAt(0))).join(','));
}
function make(out, files) {
  return new Promise((res) => {
    const doc = new PDFDocument({ size: 'A4', tagged: true, subset: 'PDF/UA', lang: 'de-DE', displayTitle: true, info: { Title: 't' }, pdfVersion: '1.7' });
    files.forEach(([n, p]) => doc.registerFont(n, fs.readFileSync(p)));
    const s = doc.struct('Document'); doc.addStructure(s);
    files.forEach(([n], i) => { s.add(doc.struct('P', [() => doc.font(n).fontSize(12).text(text, 50, 60 + i * 40)])); });
    s.end();
    const st = fs.createWriteStream(out); doc.pipe(st); st.on('finish', res); doc.end();
  });
}
await make('out/font-kern-woff2.pdf', ['Regular','Medium','SemiBold'].map(w => [w, `${K}/FiraSans-${w}.woff2`]));
await make('out/font-expo-ttf.pdf', [['Regular',`${E}/400Regular/FiraSans_400Regular.ttf`],['Medium',`${E}/500Medium/FiraSans_500Medium.ttf`],['SemiBold',`${E}/600SemiBold/FiraSans_600SemiBold.ttf`]]);
for (const f of ['out/font-kern-woff2.pdf','out/font-expo-ttf.pdf']) console.log(f, fs.statSync(f).size);
