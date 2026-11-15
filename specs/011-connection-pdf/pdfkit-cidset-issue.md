# PDFKit issues to file (foliojs/pdfkit)

Two reports for a person to file at <https://github.com/foliojs/pdfkit/issues>, one issue each.
Search the open and closed issues for `CIDSet` and for `outline XYZ` first; if a report exists,
add the reproduction below to it instead. Everything below was observed with `pdfkit` 0.20.2
(its `fontkit` is 2.0.4) on Node 20.19.2. Where a statement is our reading of PDFKit's code rather
than an observation, it says so. Nothing project-specific needs to go into the issues.

---

## Issue 1: PDF/UA (and PDF/A-1) subset: `CIDSet` misses the components of composite glyphs

### Title

`subset: 'PDF/UA'` writes a CIDSet that misses the glyphs composite glyphs pull into the font
subset (veraPDF: ISO 14289-1 7.21.4.2 test 2)

### Summary

With `subset: 'PDF/UA'`, PDFKit 0.20.2 writes a `/CIDSet` stream into the `FontDescriptor` of
every embedded TrueType (CID) font. The set lists only the glyphs that the text used. When a used
glyph is a composite glyph (for example "ü" in Fira Sans, built from "u" and a dieresis), the font
subset also contains the component glyphs, but the `CIDSet` doesn't list them. veraPDF's PDF/UA-1
profile then fails:

> ISO 14289-1:2014, clause 7.21.4.2, test 2 (tags: font): "If the FontDescriptor dictionary of an
> embedded CID font contains a CIDSet stream, then it shall identify all CIDs which are present in
> the font program, regardless of whether a CID in the font is referenced or used by the PDF or
> not"

### Reproduction

`repro.mjs`, with any TrueType font that has composite glyphs (we used Fira Sans Regular, from
`@expo-google-fonts/fira-sans` 0.4.1, OFL):

```js
import fs from 'node:fs';
import PDFDocument from 'pdfkit'; // 0.20.2

const [font, text, out] = process.argv.slice(2);
const doc = new PDFDocument({
  pdfVersion: '1.7',
  subset: 'PDF/UA',
  tagged: true,
  lang: 'en-GB',
  displayTitle: true,
  info: { Title: 'CIDSet repro' },
  font: null,
});
doc.pipe(fs.createWriteStream(out));
doc.font(font).fontSize(12);
doc.addStructure(doc.struct('P', () => doc.text(text, 72, 72)));
doc.end();
```

```bash
node repro.mjs FiraSans-Regular.ttf "ü" u.pdf
node repro.mjs FiraSans-Regular.ttf "ß" sz.pdf
docker run --rm --network none -v "$PWD":/data:ro verapdf/cli:v1.28.1 --flavour ua1 --format text /data/u.pdf /data/sz.pdf
```

Observed with veraPDF 1.28.1:

| Text | Glyph in Fira Sans | veraPDF `ua1` |
|---|---|---|
| `ü` | `udieresis`, composite of `u` and a dieresis | FAIL: 105 rules passed, 1 failed (7.21.4.2 test 2, 1 check) |
| `Ä` | `Adieresis`, composite | FAIL |
| `é` | `eacute`, composite | FAIL |
| `ß` | `germandbls`, simple | PASS |
| `Hello world` | simple glyphs only | PASS |

For "ü", `fontkit`'s subset holds four glyphs after `encode()` (`.notdef`, `udieresis` and its two
components), while only `.notdef` and `udieresis` are passed to `includeGlyph()` with a width.

### Cause (our reading of the code, not confirmed by a maintainer)

In `js/pdfkit.js` (0.20.2), `EmbeddedFont.embed()` builds the `CIDSet` from `this.widths`:

```js
if (this.document.subset && this.document.subset === 1) {
  const maxCID = this.widths.length - 1;
  // ...
  for (let cid = 0; cid <= maxCID; cid++) {
    if (this.widths[cid] != null) {
      cidSetBuffer[Math.floor(cid / 8)] |= 0x80 >> cid % 8;
    }
  }
  // ...
  descriptor.data.CIDSet = CIDSetRef;
}
```

`this.widths` is filled in `encode()` only for the glyphs the text uses. The component glyphs are
added to the subset later, by `fontkit`'s TrueType subsetting in `subset.encode()`, and get CIDs
that `this.widths` never holds. `initPDFUA()` sets `this.subset = 1`, the same value as PDF/A-1, so
PDF/UA takes this branch too. (Not tested: whether PDF/A-1 output fails veraPDF's PDF/A-1 profile
for the same reason.)

### Suggested fixes

- Build the `CIDSet` from the subset's glyphs after `subset.encode()` (every CID in the subset),
  rather than from `this.widths`; or
- leave the `CIDSet` out for PDF/UA: PDF/UA-1 doesn't require it (the rule above applies only
  when the stream is present).

### Our workaround

We finalise each font with the document's subset level hidden, so that the `CIDSet` branch is
skipped while the `pdfuaid:part` metadata is still written. It touches the private
`_fontFamilies`, so we pin PDFKit exactly and test that no `/CIDSet` comes back:

```js
function withoutCidSet(doc) {
  for (const font of new Set(Object.values(doc._fontFamilies))) {
    const finalize = font.finalize.bind(font);
    font.finalize = () => {
      const level = doc.subset;
      doc.subset = 0;
      try {
        finalize();
      } finally {
        doc.subset = level;
      }
    };
  }
}
// ... draw ..., then
withoutCidSet(doc);
doc.end();
```

With it, the "ü" file above has no `/CIDSet`, keeps `<pdfuaid:part>1</pdfuaid:part>`, and passes
veraPDF 1.28.1's `ua1` profile. Our real documents (up to 764 pages, five Fira fonts, English and
German) pass it with 106 rules and 0 failed checks.

---

## Issue 2: an outline item's `/XYZ` left is written as `pageWidth − left`

### Title

`outline.addItem(title, { left })` writes `/XYZ` with `pageWidth − left` instead of `left`

### Summary

PDFKit 0.20.2's `PDFOutline` converts both `top` and `left` from PDFKit's coordinates to PDF's:

```js
const destWidth = dest.data.MediaBox[2];
const destHeight = dest.data.MediaBox[3];
const top = destHeight - (options.top || 0);
const left = destWidth - (options.left || 0);
const zoom = options.zoom || 0;
this.outlineData['Dest'] = options.fit ? [dest, 'Fit'] : [dest, 'XYZ', left, top, zoom];
```

Flipping `top` is right (PDF's y axis points up). Flipping `left` is not: PDF's x axis points
right, as PDFKit's does, so `left: 0` should give 0, and gives the page's width. A viewer that
honours the destination's left scrolls the view to the page's right edge. For comparison,
`addNamedDestination()` in the same file converts only the y value (`args[2] = this.page.height -
args[2]`).

### Reproduction

```js
const doc = new PDFDocument({ compress: false, size: 'A4' });
doc.outline.addItem('Section', { top: 100, left: 0, zoom: 0 }); // no `fit`, so /XYZ
doc.end();
```

Observed in the uncompressed output: `/Dest [7 0 R /XYZ 595.28 741.89 0]`; expected
`/Dest [7 0 R /XYZ 0 741.89 0]` (A4 is 595.28 × 841.89 pt).

### Our workaround

We pass the page's width as `left`, which comes out as 0:

```js
doc.outline.addItem(title, { top, left: pageWidth, zoom: 0, expanded: true });
```

### Suggested fix

`const left = options.left || 0;` (a change in output for anyone who relies on the workaround).
