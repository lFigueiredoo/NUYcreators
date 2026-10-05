import sharp from 'sharp';

// Isolated landscape/light strip, below CTAs and above the reference benefits.
// Not a screenshot/panel and contains no interface text.
await sharp('artifacts/visual/hero-reference.png')
  .extract({ left: 32, top: 323, width: 300, height: 49 })
  .webp({ quality: 94 })
  .toFile('public/brand/reference/hero-environment-art.webp');

// Existing NUY lettering from project art; alpha removes only the dark backing.
const logo = await sharp('artifacts/visual/hero-reference.png')
  .extract({ left: 14, top: 10, width: 64, height: 40 })
  .removeAlpha()
  .raw()
  .toBuffer();
const rgba = Buffer.alloc(64 * 40 * 4);
for (let i = 0; i < 64 * 40; i++) {
  const minimum = Math.min(logo[i * 3], logo[i * 3 + 1], logo[i * 3 + 2]);
  rgba[i * 4] = 251;
  rgba[i * 4 + 1] = 249;
  rgba[i * 4 + 2] = 245;
  rgba[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (minimum - 70) / 145)) * 255);
}
await sharp(rgba, { raw: { width: 64, height: 40, channels: 4 } })
  .png()
  .toFile('public/brand/reference/nuy-wordmark-art.png');
const bloomMask = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="100"><defs><radialGradient id="m"><stop offset=".55" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><ellipse cx="45" cy="50" rx="45" ry="50" fill="url(#m)"/></svg>',
);
await sharp('public/brand/reference/hero-bouquet-art.webp')
  .extract({ left: 34, top: 24, width: 90, height: 100 })
  .ensureAlpha()
  .composite([{ input: bloomMask, blend: 'dest-in' }])
  .webp({ quality: 94 })
  .toFile('public/brand/reference/hero-white-bloom.webp');
