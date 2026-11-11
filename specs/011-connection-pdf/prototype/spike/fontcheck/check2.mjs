import fs from 'node:fs';
import PDFDocument from 'pdfkit';
const K = 'node_modules/@kern-ux/native/dist/fonts/fira-sans';
async function make(out, text) {
  return new Promise((res, rej) => {
    try {
      const doc = new PDFDocument({ size: 'A4' });
      doc.registerFont('R', fs.readFileSync(`${K}/FiraSans-Regular.woff2`));
      doc.font('R').fontSize(12).text(text, 50, 60);
      const st = fs.createWriteStream(out); doc.pipe(st); st.on('finish', res); doc.end();
    } catch (e) { rej(e); }
  });
}
for (const t of ['Taxi and private hire driver licence rule-7', 'ß', 'ä', 'Ä', 'é', '„', '…', '›', 'fi', '0123456789']) {
  try { await make('out/w.pdf', t); console.log(JSON.stringify(t), 'ok', fs.statSync('out/w.pdf').size); } catch (e) { console.log(JSON.stringify(t), 'FAIL', e.message); }
}
