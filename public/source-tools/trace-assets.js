const fs = require('fs');
const path = require('path');
const potrace = require('/tmp/north-brand-tools/node_modules/potrace');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'source');
const out = path.join(root, 'svg');

const assets = [
  ['footprint-mask-textured.png', 'footprint-stamp'],
  ['footprint-mask-clean.png', 'footprint-clean'],
  ['wordmark-mask.png', 'wordmark-north'],
  ['lockup-horizontal-mask.png', 'lockup-horizontal'],
  ['lockup-stacked-mask.png', 'lockup-stacked'],
  ['footer-mask.png', 'you-showed-up'],
];

const colors = [
  ['teal', '#193136'],
  ['offwhite', '#F3EDE2'],
  ['black', '#161A1B'],
];

function trace(input, color) {
  return new Promise((resolve, reject) => {
    potrace.trace(input, {
      color,
      background: 'transparent',
      threshold: 128,
      turdSize: 2,
      optCurve: true,
      optTolerance: 0.25,
    }, (error, svg) => error ? reject(error) : resolve(svg));
  });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  for (const [file, name] of assets) {
    for (const [variant, color] of colors) {
      const svg = await trace(path.join(src, file), color);
      fs.writeFileSync(path.join(out, `${name}-${variant}.svg`), svg);
    }
  }

  // Safari pinned tabs are monochrome and receive their color from the browser.
  const pinned = await trace(path.join(src, 'footprint-mask-clean.png'), '#000000');
  fs.writeFileSync(path.join(out, 'safari-pinned-tab.svg'), pinned);
})();
