// Writes public/THIRD-PARTY-NOTICES.txt: the licence texts of the third-party packages that reach
// the built frontend, and hand-kept sections for what carries no licence file of its own (spec
// 012, research R4, "The built frontend"; FR-023). Vite copies public/ to the output's root, so
// nginx serves the file at /THIRD-PARTY-NOTICES.txt beside the app.
//
// Run it with `npm run notices -w frontend` after any change to the packages below, and commit the
// result. It uses Node's built-in modules only, and its output depends on nothing but the installed
// files (no date, no absolute path), so a rerun leaves the committed file unchanged.
//
// It fails when a listed package is missing, when one has neither a licence file nor a hand-kept
// section, or when a package that a hand-kept section was checked against has another version.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(FRONTEND, '..');
const OUTPUT = path.join(FRONTEND, 'public', 'THIRD-PARTY-NOTICES.txt');
const FONTS = path.join(FRONTEND, 'src', 'assets', 'fonts');

// The packages whose code or styles reach the build: the node_modules paths that the build's
// source maps name, plus the three stylesheets index.css imports (tailwindcss, @kern-ux/native,
// the Tailwind theme). Kept by hand, not read from package.json or the lockfile, so that moving a
// package between dependencies and devDependencies changes nothing here. `dir` is the folder under
// node_modules (base64-js 0.0.8 is nested under linebreak).
const PACKAGES = [
  { dir: '@digitalservicebund/kern-ux-tailwind-theme', use: 'design tokens in the stylesheet' },
  { dir: '@kern-ux-annex/kern-react-kit', use: 'components in the main script' },
  { dir: '@kern-ux/native', use: 'styles in the stylesheet; the Fira Sans web fonts' },
  { dir: '@noble/ciphers', use: 'inside the PDF script (pdfkit)' },
  { dir: '@noble/hashes', use: 'inside the PDF script (pdfkit)' },
  { dir: '@swc/helpers', use: 'inside the PDF script (fontkit)' },
  { dir: 'base64-js', use: 'inside the PDF script (brotli, unicode-properties)' },
  { dir: 'linebreak/node_modules/base64-js', use: 'inside the PDF script (linebreak)' },
  { dir: 'brotli', use: 'inside the PDF script (fontkit)' },
  { dir: 'clone', use: 'inside the PDF script (fontkit)' },
  { dir: 'dfa', use: 'inside the PDF script (fontkit)' },
  { dir: 'fast-deep-equal', use: 'inside the PDF script (fontkit)' },
  { dir: 'fflate', use: 'inside the PDF script (pdfkit)' },
  { dir: 'fontkit', use: 'inside the PDF script (pdfkit)' },
  { dir: 'linebreak', use: 'inside the PDF script (pdfkit)' },
  { dir: 'pdfkit', use: 'the PDF script' },
  { dir: 'png-js', use: 'inside the PDF script (pdfkit)' },
  { dir: 'react', use: 'the main script' },
  { dir: 'react-dom', use: 'the main script' },
  { dir: 'react-router', use: 'the main script' },
  { dir: 'restructure', use: 'inside the PDF script (fontkit)' },
  { dir: 'scheduler', use: 'the main script (react-dom)' },
  { dir: 'tailwindcss', use: 'base styles and utilities in the stylesheet' },
  { dir: 'tiny-inflate', use: 'inside the PDF script (fontkit, unicode-trie)' },
  { dir: 'unicode-properties', use: 'inside the PDF script (fontkit)' },
  { dir: 'unicode-trie', use: 'inside the PDF script (fontkit, linebreak, unicode-properties)' },
];

const RULE = '='.repeat(80);
const THIN = '-'.repeat(80);

const LICENCE_FILE = /^(licen[cs]e|copying)([.-].*)?$/i;

/** Stops the run with a message and a non-zero exit code. */
function fail(message) {
  console.error(`third-party-notices: ${message}`);
  process.exit(1);
}

/** Reads a text file, with its trailing newlines reduced to none. */
function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\n+$/, '');
}

/** The installed package in `dir`, looked up as Node would from frontend/. */
function installed(dir) {
  for (const base of [path.join(FRONTEND, 'node_modules'), path.join(ROOT, 'node_modules')]) {
    const folder = path.join(base, dir);
    if (fs.existsSync(path.join(folder, 'package.json'))) {
      const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8'));
      return { folder, manifest };
    }
  }
  return fail(`node_modules/${dir} is missing; run npm install first`);
}

/** A package's licence field, in the old `licenses` array form too. */
function licenceField(manifest) {
  if (typeof manifest.license === 'string') return manifest.license;
  if (manifest.license?.type) return manifest.license.type;
  if (Array.isArray(manifest.licenses)) return manifest.licenses.map((l) => l.type).join(' OR ');
  return '(none)';
}

/** A package's repository as a URL a reader can open. */
function repositoryOf(manifest) {
  const raw =
    typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
  if (!raw) return '(none given)';
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    .replace(/\.git$/, '');
}

/** The version of the installed package in `dir`. */
function versionOf(dir) {
  return installed(dir).manifest.version;
}

/** The copyright and description of the sRGB profile that pdfkit's browser build inlines. */
function iccProfileTags() {
  const source = fs.readFileSync(path.join(installed('pdfkit').folder, 'js', 'pdfkit.browser.mjs'));
  const match = /var iccProfileBase64 = "([A-Za-z0-9+/=]+)"/.exec(source.toString('latin1'));
  if (!match)
    fail('the ICC profile is no longer inlined in pdfkit.browser.mjs; re-check its section');
  const profile = Buffer.from(match[1], 'base64');
  const tags = {};
  for (let i = 0; i < profile.readUInt32BE(128); i += 1) {
    const entry = 132 + i * 12;
    const signature = profile.toString('latin1', entry, entry + 4);
    const offset = profile.readUInt32BE(entry + 4);
    const length = profile.readUInt32BE(entry + 8);
    const type = profile.toString('latin1', offset, offset + 4);
    if (type === 'text') {
      tags[signature] = profile.toString('latin1', offset + 8, offset + length).replace(/\0+$/, '');
    } else if (type === 'desc') {
      const count = profile.readUInt32BE(offset + 8);
      tags[signature] = profile.toString('latin1', offset + 12, offset + 12 + count - 1);
    }
  }
  if (!tags.desc || !tags.cprt) fail('the ICC profile has no description or copyright tag');
  return { size: profile.length, ...tags };
}

// The brotli files in the bundle (from the source map); the first six carry Google's header
const BROTLI_GOOGLE_FILES = [
  'dec/bit_reader.js',
  'dec/context.js',
  'dec/decode.js',
  'dec/dictionary.js',
  'dec/prefix.js',
  'dec/transform.js',
];
const BROTLI_OTHER_FILES = [
  'decompress.js',
  'dec/dictionary-browser.js',
  'dec/dictionary.bin.js',
  'dec/huffman.js',
  'dec/streams.js',
];

/** The Apache-2.0 header that Google's brotli decoder files carry, read from decode.js. */
function brotliHeader() {
  const folder = installed('brotli').folder;
  for (const file of BROTLI_GOOGLE_FILES) {
    const text = fs.readFileSync(path.join(folder, file), 'utf8');
    if (!text.startsWith('/* Copyright 2013 Google Inc. All Rights Reserved.')) {
      fail(`brotli/${file} no longer starts with Google's header; re-check its section`);
    }
  }
  // The section points to @swc/helpers' licence file for the full Apache-2.0 text
  const swc = fs.readFileSync(path.join(installed('@swc/helpers').folder, 'LICENSE'), 'utf8');
  if (!/Apache License\s+Version 2\.0[\s\S]*END OF TERMS AND CONDITIONS/.test(swc)) {
    fail("@swc/helpers' LICENSE no longer holds the full Apache-2.0 text; give it in the section");
  }
  const decode = fs.readFileSync(path.join(folder, 'dec', 'decode.js'), 'utf8');
  return decode.slice(0, decode.indexOf('*/') + 2);
}

const MIT_DIGITALSERVICE = `MIT License

Copyright (c) 2025 DigitalService

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

// The LICENSE of the lodash 4.17.23 package, word for word
const LODASH_LICENCE = `Copyright OpenJS Foundation and other contributors <https://openjsf.org/>

Based on Underscore.js, copyright Jeremy Ashkenas,
DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>

This software consists of voluntary contributions made by many
individuals. For exact contribution history, see the revision history
available at https://github.com/lodash/lodash

The following license applies to all parts of this software except as
documented below:

====

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

====

Copyright and related rights for sample code are waived via CC0. Sample
code is defined as all source code displayed within the prose of the
documentation.

CC0: http://creativecommons.org/publicdomain/zero/1.0/

====

Files located in the node_modules and vendor directories are externally
maintained libraries used by this software which have their own
licenses; we recommend you read them, as their terms may differ from the
terms above.`;

// The committed TTFs that reach the build (embedded as subsets in the connection PDF), with the
// copyright and trademark lines of their name tables
const FIRA_TTFS = [
  {
    font: 'Fira Sans 4.203',
    files: ['FiraSans-Regular.ttf', 'FiraSans-Medium.ttf', 'FiraSans-SemiBold.ttf'],
    lines: [
      'Digitized data copyright 2012-2016, The Mozilla Foundation and Telefonica S.A.',
      'Fira Sans is a trademark of The Mozilla Corporation.',
    ],
  },
  {
    font: 'Fira Mono 3.206',
    files: ['FiraMono-Regular.ttf', 'FiraMono-Medium.ttf'],
    lines: [
      'Digitized data copyright © 2012-2015, The Mozilla Foundation and Telefonica S.A.',
      'Fira Mono is a trademark of The Mozilla Corporation.',
    ],
  },
];

/** The WOFF2 files that @kern-ux/native's fira-sans.css (imported by index.css) names. */
function kernWoff2Files() {
  const css = fs.readFileSync(
    path.join(installed('@kern-ux/native').folder, 'dist', 'fonts', 'fira-sans.css'),
    'utf8'
  );
  const files = [...css.matchAll(/url\(["']?\.\/fira-sans\/([^"')]+\.woff2)/g)].map((m) => m[1]);
  return [...new Set(files)].sort();
}

// The hand-kept sections. `covers` names the listed packages that have no licence file and whose
// notice the section gives; `checked` pins the versions the section's text was checked against.
const SECTIONS = [
  {
    title: '@digitalservicebund/kern-ux-tailwind-theme: the MIT licence from upstream',
    covers: ['@digitalservicebund/kern-ux-tailwind-theme'],
    checked: { '@digitalservicebund/kern-ux-tailwind-theme': '4.0.0' },
    body: () =>
      [
        'The package declares "MIT" and ships no licence file. This is the LICENSE file of its',
        'upstream repository, https://github.com/digitalservicebund/kern-ux-tailwind-theme',
        '(branch main):',
        '',
        MIT_DIGITALSERVICE,
      ].join('\n'),
  },
  {
    title: "lodash 4.17.23 and React's JSX runtime, inside @kern-ux-annex/kern-react-kit",
    covers: [],
    checked: { '@kern-ux-annex/kern-react-kit': '2.40.0' },
    body: () =>
      [
        '@kern-ux-annex/kern-react-kit bundles all of lodash 4.17.23 (MIT,',
        "https://github.com/lodash/lodash) and React's JSX runtime (react/jsx-runtime; MIT,",
        'Copyright (c) Meta Platforms, Inc. and affiliates, the licence text given above for',
        "react). lodash's licence:",
        '',
        LODASH_LICENCE,
      ].join('\n'),
  },
  {
    title: 'The Fira fonts, under the SIL Open Font License 1.1',
    covers: [],
    checked: { '@kern-ux/native': '2.8.2' },
    body: () => {
      for (const { files } of FIRA_TTFS) {
        for (const file of files) {
          if (!fs.existsSync(path.join(FONTS, file))) fail(`src/assets/fonts/${file} is missing`);
        }
      }
      return [
        'Fira Sans 4.106, the web fonts of @kern-ux/native (no font licence file in the',
        'package):',
        ...kernWoff2Files().map((file) => `  ${file}`),
        '  Digitized data copyright © 2012-2015, The Mozilla Foundation and Telefonica S.A.',
        '  Fira Sans is a trademark of The Mozilla Corporation.',
        '',
        ...FIRA_TTFS.flatMap(({ font, files, lines }) => [
          `${font}, served with the app and embedded as subsets in the connection PDF:`,
          ...files.map((file) => `  ${file}`),
          ...lines.map((line) => `  ${line}`),
          '',
        ]),
        'The name tables of all these fonts say: "Licensed under the Open Font License, version',
        '1.1 or later". The licence text, as kept beside the TTFs in the repository',
        '(frontend/src/assets/fonts/OFL.txt):',
        '',
        readText(path.join(FONTS, 'OFL.txt')),
      ].join('\n');
    },
  },
  {
    title: 'The sRGB ICC profile, inside pdfkit',
    covers: [],
    checked: { pdfkit: '0.20.2' },
    body: () => {
      const tags = iccProfileTags();
      return [
        `pdfkit's browser build inlines an ICC colour profile (${tags.size} bytes) that it embeds`,
        'in PDF/A documents. Its own tags read:',
        `  Description: ${tags.desc}`,
        ...(tags.dmdd ? [`  Device model: ${tags.dmdd}`] : []),
        ...(tags.vued ? [`  Viewing conditions: ${tags.vued}`] : []),
        `  Copyright: ${tags.cprt}`,
        'Neither the profile nor pdfkit states further terms for it.',
      ].join('\n');
    },
  },
  {
    title: "brotli: the package, and Google's decoder files under the Apache License 2.0",
    covers: ['brotli'],
    checked: { brotli: '1.3.3' },
    body: () =>
      [
        'The brotli package (Devon Govett, https://github.com/devongovett/brotli.js) declares',
        '"MIT" and ships no licence file; its README says "MIT" and that the decompressor is',
        "hand ported from Google's Brotli (https://github.com/google/brotli).",
        '',
        "Of its files in the bundle, these carry Google's Apache-2.0 header:",
        ...BROTLI_GOOGLE_FILES.map((file) => `  ${file}`),
        'and these carry none:',
        ...BROTLI_OTHER_FILES.map((file) => `  ${file}`),
        '(dec/dictionary.bin.js holds the dictionary of dec/dictionary-data.js, which carries',
        'the same header, in compressed form.)',
        '',
        'The header, as in dec/decode.js:',
        '',
        brotliHeader(),
        '',
        'The full text of the Apache License 2.0 is the one given above for @swc/helpers.',
      ].join('\n'),
  },
  {
    title: 'fontkit: MIT by its licence field',
    covers: ['fontkit'],
    checked: { fontkit: '2.0.4' },
    body: () =>
      [
        'fontkit declares "MIT" and ships no licence file. Its author is Devon Govett; its source',
        'is https://github.com/foliojs/fontkit, whose repository holds the licence file.',
      ].join('\n'),
  },
  {
    title: 'dfa: MIT by its licence field',
    covers: ['dfa'],
    checked: { dfa: '1.2.0' },
    body: () =>
      [
        'dfa declares "MIT" and ships no licence file; its README says "MIT". Its author is Devon',
        'Govett; its source is https://github.com/devongovett/dfa, which holds no licence file',
        'either.',
      ].join('\n'),
  },
];

/** One package's entry: its name, version, licence field and licence files' text. */
function packageEntry({ dir, use }, covered) {
  const { folder, manifest } = installed(dir);
  const files = fs
    .readdirSync(folder)
    .filter((file) => LICENCE_FILE.test(file) && fs.statSync(path.join(folder, file)).isFile())
    .sort();
  if (files.length === 0 && !covered.has(dir)) {
    fail(`node_modules/${dir} has no licence file and no hand-kept section`);
  }
  const head = [
    RULE,
    `${manifest.name} ${manifest.version}`,
    `Licence field: ${licenceField(manifest)}`,
    `Repository: ${repositoryOf(manifest)}`,
    `In the build: ${use}`,
  ];
  if (files.length === 0) {
    return [...head, 'Licence file: none in the package; see the hand-kept section below.'];
  }
  return [
    ...head,
    ...files.flatMap((file) => [
      `Licence file: node_modules/${dir}/${file}`,
      THIN,
      readText(path.join(folder, file)),
    ]),
  ];
}

function main() {
  const covered = new Set(SECTIONS.flatMap((section) => section.covers));
  for (const section of SECTIONS) {
    for (const [dir, version] of Object.entries(section.checked)) {
      const actual = versionOf(dir);
      if (actual !== version) {
        fail(
          `${dir} is ${actual}, but the section "${section.title}" was checked against ` +
            `${version}: re-check that section, then update its version here`
        );
      }
    }
  }

  // By name, then by folder (base64-js 1.5.1 before the nested 0.0.8), in code-point order
  const key = ({ dir }) => [installed(dir).manifest.name, dir];
  const packages = [...PACKAGES].sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    return ka[0] === kb[0] ? (ka[1] < kb[1] ? -1 : 1) : ka[0] < kb[0] ? -1 : 1;
  });
  const lines = [
    'THIRD-PARTY NOTICES',
    '',
    'The files of this web application contain the third-party software, fonts and data',
    'listed here, under their own licences. Part 1 gives each package with the licence files',
    'it ships, word for word; part 2 gives, by hand, what has no licence file of its own.',
    '',
    'Generated by frontend/scripts/third-party-notices.mjs (npm run notices -w frontend);',
    'do not edit by hand.',
    '',
    RULE,
    'PART 1: THE PACKAGES',
    '',
    ...packages.flatMap((pkg) => [...packageEntry(pkg, covered), '']),
    RULE,
    'PART 2: HAND-KEPT SECTIONS',
    '',
    ...SECTIONS.flatMap((section) => [RULE, section.title, THIN, section.body(), '']),
  ];

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${lines.join('\n').replace(/\n+$/, '')}\n`);
  console.log(
    `third-party-notices: wrote public/THIRD-PARTY-NOTICES.txt (${packages.length} packages)`
  );
}

main();
