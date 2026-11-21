// Renders the site icons the configuration's "icons" asks for from one source image (SVG or PNG), headless:
// PNG icons at each size, maskable icons with their content inside the safe zone, and a favicon.ico that holds PNG
// images at several sizes. Each file goes to <out>/assets/icons/ for the gallery and to <out>/proposed-files/ at its
// path in the site, and <out>/site-icons.js lists them. Every file is read back and its pixel size checked.
// Google Search shows raster favicons (not SVG); Apple uses apple-touch-icon; Chrome installs apps with 192 and
// 512 pixel manifest icons. No window is shown.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { imageSizes } from './audit-common.ts';
import { type Config, fail, imageInfo, isMain, launchBrowser, readConfig, required, runCli, writeData } from './shared.ts';

const HELP = `Render the configured site icons and favicon.ico.
  node scripts/share-previews/render-icons.ts --config <preview.config.json> --out <folder> [--channel chrome]`;

// An ICO file whose entries are PNG images (supported by every current browser and by Windows since Vista).
export function icoFromPngs(pngs: { size: number; bytes: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, bytes }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(bytes.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += bytes.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map(p => p.bytes)]);
}

// Padding on each side that fits a square inside the safe zone circle: 0.5 - 0.4 / sqrt(2), rounded up.
export const SAFE_ZONE_PADDING = 0.22;

export async function renderIcons(config: Config, out: string, channel?: string) {
  const settings = config.icons;
  if (!settings) {
    console.log('No icons configured.');
    await writeData(out, 'site-icons.js', 'SITE_ICONS', { files: [] }, 'render-icons.ts');
    return { ok: true, files: [] };
  }
  const source = path.resolve(config.dir, settings.source ?? fail('icons.source is required'));
  const sourceBytes = await readFile(source);
  const sourceType = imageInfo(sourceBytes).type;
  if (!['image/svg+xml', 'image/png'].includes(sourceType)) fail(`icons.source must be an SVG or PNG image: ${source}`);
  const sourceUrl = `data:${sourceType};base64,${sourceBytes.toString('base64')}`;
  const files = settings.files ?? fail('icons.files is required');
  const problems: string[] = [];
  const written: any[] = [];
  const browser = await launchBrowser(channel);
  try {
    const page = await (await browser.newContext({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })).newPage();
    const render = async (size: number, background: string | null, padding: number) => {
      await page.setViewportSize({ width: size, height: size });
      const inner = Math.round(size * (1 - 2 * padding));
      await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:${background ?? 'transparent'}"><img src="${sourceUrl}" style="width:${inner}px;height:${inner}px;display:block"></div></body></html>`);
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      return Buffer.from(await page.screenshot({ type: 'png', omitBackground: !background, clip: { x: 0, y: 0, width: size, height: size } }));
    };
    for (const file of files) {
      if (!file.publishAs) fail('every icons.files entry needs publishAs');
      const maskable = file.purpose === 'maskable';
      // A maskable icon keeps its content inside the safe zone, a centered circle with a radius of 40% of the icon
      // (W3C Web Application Manifest), on a solid background. The default padding fits the source's whole square
      // inside that circle; a round mark can use less, down to 0.1, where the square's sides touch the circle.
      const padding = file.padding ?? (maskable ? SAFE_ZONE_PADDING : 0);
      if (typeof padding !== 'number' || padding < 0 || padding >= 0.5) fail(`${file.publishAs}: padding must be a number from 0 to under 0.5`);
      if (maskable && padding < 0.1) problems.push(`${file.publishAs}: a maskable icon with padding under 0.1 puts content outside the safe zone`);
      const background = file.background ?? settings.background ?? null;
      if (maskable && !background) problems.push(`${file.publishAs}: a maskable icon needs a background color`);
      let bytes: Buffer;
      let sizes: number[];
      if (/\.ico$/i.test(file.publishAs)) {
        sizes = file.sizes ?? [16, 32, 48];
        bytes = icoFromPngs(await Promise.all(sizes.map(async size => ({ size, bytes: await render(size, background, padding) }))));
      } else {
        sizes = [file.size ?? fail(`${file.publishAs}: size is required`)];
        bytes = await render(sizes[0], background, padding);
      }
      const expected = sizes.map(size => `${size}x${size}`);
      const info = imageInfo(bytes);
      const found = imageSizes(info);
      if (JSON.stringify([...found].sort()) !== JSON.stringify([...expected].sort())) problems.push(`${file.publishAs}: expected ${expected.join(', ')}, found ${found.join(', ') || 'no size'}`);
      for (const target of [path.join(out, 'assets', 'icons', ...file.publishAs.split('/')), path.join(out, 'proposed-files', ...`${config.site.base}${file.publishAs}`.split('/'))]) {
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes);
      }
      written.push({ path: file.publishAs, url: `${config.site.url}${file.publishAs}`, local: `assets/icons/${file.publishAs}`, type: info.type, sizes: expected, purpose: file.purpose ?? 'any', bytes: bytes.length });
      console.log(`${file.publishAs}: ${info.type} ${found.join(', ')}, ${Math.round(bytes.length / 102.4) / 10} KB`);
    }
  } finally {
    await browser.close();
  }
  await writeData(out, 'site-icons.js', 'SITE_ICONS', { source: path.basename(source), files: written }, 'render-icons.ts');
  for (const problem of problems) console.log(`  FAIL ${problem}`);
  return { ok: problems.length === 0, files: written, problems };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => (await renderIcons(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)), typeof options.channel === 'string' ? options.channel : undefined)).ok);
}
