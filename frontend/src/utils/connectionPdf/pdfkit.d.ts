// pdfkit 0.20 ships no types, and @types/pdfkit lacks 0.20's structure and outline calls
// (design-notes 8.2, decision D1). This declaration only lets `import ... from 'pdfkit'` compile:
// its default export is untyped, so each importer (the worker, the smoke test) casts it to
// `PdfKitConstructor` (`types.ts`) where it imports it, and nothing else imports 'pdfkit'
declare module 'pdfkit';
