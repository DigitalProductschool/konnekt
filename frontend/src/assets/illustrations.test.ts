/// <reference types="node" />
// The decorative pictures in illustrations/ (bug new-visuals, section A): every file there stays
// within the decided 1.5 MB, and the folder holds the new visuals, the favicon and the header's
// logo and nothing else, so the illustrations the new visuals replace stay gone. Beside the folder,
// not in it, so that spec 008's "assets nobody imports" loop doesn't list it. The app's tsconfig
// loads only Vite's types, so this test names Node's own for `node:fs`
import { readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FOLDER = new URL('./illustrations/', import.meta.url);

/** The decided limit per file (bug new-visuals, Decisions 8): lossless, at most 1.5 MB */
const MAX_BYTES = 1_500_000;

const NEW_VISUALS = [
  'chain-band-active@2x.webp',
  'chain-band-broken@2x.webp',
  'chain-band-draft@2x.webp',
  'chain-band-scheduled@2x.webp',
  'chain-error-broken@2x.webp',
  'chain-login-white@2x.webp',
  'chain-welcome-card@2x.webp',
  'folder-empty-documents@2x.webp',
  'logo-white.svg',
];

/** The tab's icon and the header's blue mark, which the new visuals leave as they are */
const KEPT = ['favicon.svg', 'logo.svg'];

function assetFiles(): string[] {
  return readdirSync(FOLDER);
}

describe('the illustrations (bug new-visuals)', () => {
  it('keeps every file at 1.5 MB or less', () => {
    const oversized = assetFiles().filter(
      (name) => statSync(new URL(name, FOLDER)).size > MAX_BYTES
    );
    expect(oversized).toEqual([]);
  });

  it('holds the eight new pictures, the white logo, the favicon and the header logo, nothing else', () => {
    expect(assetFiles().sort()).toEqual([...NEW_VISUALS, ...KEPT].sort());
  });
});
