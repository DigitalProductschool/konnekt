import fs from 'node:fs';
import PDFDocument from 'pdfkit';
const E = 'node_modules/@expo-google-fonts';
const text = 'Taxi and private hire driver licence – Fahrerlaubnis zur Fahrgastbeförderung „ÄÖÜ äöü ß“ é ‹›…·€ rule-7 ›';
const files = [['R',`${E}/fira-sans/400Regular/FiraSans_400Regular.ttf`],['M',`${E}/fira-sans/500Medium/FiraSans_500Medium.ttf`],['S',`${E}/fira-sans/600SemiBold/FiraSans_600SemiBold.ttf`],['MR',`${E}/fira-mono/400Regular/FiraMono_400Regular.ttf`],['MM',`${E}/fira-mono/500Medium/FiraMono_500Medium.ttf`]];
for (const n of [1, 5]) await new Promise((res) => {
  const doc = new PDFDocument({ size: 'A4' });
  files.slice(0, n).forEach(([k, p]) => doc.registerFont(k, fs.readFileSync(p)));
  files.slice(0, n).forEach(([k], i) => doc.font(k).fontSize(12).text(text, 50, 60 + i * 40));
  const st = fs.createWriteStream(`out/font-ttf-${n}.pdf`); doc.pipe(st); st.on('finish', res); doc.end();
});
for (const n of [1,5]) console.log(n, 'fonts', fs.statSync(`out/font-ttf-${n}.pdf`).size, 'bytes');
