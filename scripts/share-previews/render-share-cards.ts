// Renders each configured share card headless and saves it as PNG and JPEG in <out>/assets, then writes
// <out>/share-cards.js for the gallery and <out>/check/share-cards.json with every measurement. No window is shown.
// Each rendered line of text marked data-share-text is measured. A card fails when a line leaves the center square
// (the 1:1 crop), enters a band to avoid (by default the bottom-left corner where X lays its title), or when text
// covers more of the image than checks.maxTextShare allows. A card can be one frame of an animation: frameMs runs
// the page on Playwright's fake clock to that time, so every render shows the same frame. imageMetadata writes the
// card's IPTC photo metadata (creator, credit, copyright, rights statement, licensor, digital source type) as XMP.
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Config, defaultCardTemplate, embedXmp, fail, imageMetadata, isMain, launchBrowser, readConfig, required, runCli, writeData, xmpPacket } from './shared.ts';

const HELP = `Render the configured share cards and check their layout.
  node scripts/share-previews/render-share-cards.ts --config <preview.config.json> --out <folder> [--channel chrome]`;

interface Box { selector: string; left: number; right: number; top: number; bottom: number }

// A card may reuse a site's own script with a few values changed. Each replacement must match exactly once.
async function prepareCopies(config: Config, card: any) {
  for (const copy of card.copies ?? []) {
    let text = await readFile(path.resolve(config.dir, copy.from), 'utf8');
    for (const [from, to] of copy.replace ?? []) {
      const count = text.split(from).length - 1;
      if (count !== 1) fail(`${card.id}: ${copy.from}: expected one match, found ${count}: ${from}`);
      text = text.replace(from, () => to);
    }
    const target = path.resolve(config.dir, copy.to);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `// Copied by render-share-cards.ts from ${copy.from} with ${(copy.replace ?? []).length} values changed. Do not edit; run the script again.\n${text}`);
  }
}

// The template's address. Query values that start with ./ or ../ are files beside the configuration.
function cardAddress(config: Config, card: any) {
  const template = card.template ? path.resolve(config.dir, card.template) : defaultCardTemplate;
  const url = new URL(pathToFileURL(template).href);
  for (const [key, value] of Object.entries(card.query ?? {})) {
    const text = String(value);
    url.searchParams.set(key, /^\.\.?\//.test(text) ? pathToFileURL(path.resolve(config.dir, text)).href : text);
  }
  return url.href;
}

export async function renderShareCards(config: Config, out: string, channel?: string) {
  const cards = [];
  const report = [];
  let failures = 0;
  if (!config.shareCards.length) console.log('No share cards configured.');
  const browser = config.shareCards.length ? await launchBrowser(channel) : null;
  try {
    for (const card of config.shareCards) {
      if (!card.id || !card.file) fail('every share card needs an id and a file name');
      await prepareCopies(config, card);
      const W = card.width ?? 1200;
      const H = card.height ?? 630;
      const checks = card.checks ?? {};
      const square = checks.safeSquare === false ? null : { left: (W - Math.min(W, H)) / 2, right: (W + Math.min(W, H)) / 2 };
      const avoid = checks.avoid ?? [{ name: 'X title band', left: 0, right: Math.round(W * 760 / 1200), top: Math.round(H * 545 / 630), bottom: H }];
      const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error: unknown) => errors.push(String(error)));
      page.on('requestfailed', (request: any) => errors.push(`failed to load ${request.url()}`));
      if (card.frameMs) await page.clock.install({ time: 0 });
      await page.goto(cardAddress(config, card));
      await page.evaluate(() => document.fonts.ready.then(() => true));
      await page.waitForFunction(() => [...document.images].every(image => image.complete));
      if (card.waitFor) await page.waitForSelector(card.waitFor);
      if (card.frameMs) await page.clock.runFor(card.frameMs);
      const selector = checks.textSelector ?? '[data-share-text]';
      // Each rendered line of text, measured as the text itself rather than the box that holds it.
      const boxes: Box[] = await page.evaluate((sel: string) => [...document.querySelectorAll(sel)].flatMap(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const name = element.tagName.toLowerCase() + (element.className ? `.${String(element.className).split(' ')[0]}` : '');
        return [...range.getClientRects()].filter(rect => rect.width > 1).map(rect => ({ selector: name, left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) }));
      }), selector);
      if (!boxes.length) errors.push(`no text found for ${selector}`);
      const textShare = Math.round(boxes.reduce((sum, b) => sum + (b.right - b.left) * (b.bottom - b.top), 0) / (W * H) * 1000) / 10;
      const problems = [...errors];
      for (const box of boxes) {
        if (square && (box.left < square.left || box.right > square.right)) problems.push(`${box.selector} x ${box.left}-${box.right} leaves the center square (x ${square.left}-${square.right})`);
        for (const zone of avoid) {
          if (box.left < zone.right && box.right > zone.left && box.top < zone.bottom && box.bottom > zone.top) problems.push(`${box.selector} y ${box.top}-${box.bottom} enters the ${zone.name ?? 'avoided band'}`);
        }
      }
      if (checks.maxTextShare !== undefined && textShare > checks.maxTextShare) problems.push(`text covers ${textShare}% of the image, more than ${checks.maxTextShare}%`);
      const note = checks.maxTextShare === undefined && textShare > 20 ? `text covers ${textShare}%; Meta reports images under 20% text perform better` : null;
      const sizes: Record<string, number> = {};
      for (const type of ['png', 'jpeg']) {
        const file = path.join(out, 'assets', `${card.file}.${type === 'png' ? 'png' : 'jpg'}`);
        await mkdir(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file, type, ...(type === 'jpeg' ? { quality: card.jpegQuality ?? 90 } : {}), clip: { x: 0, y: 0, width: W, height: H } });
        // imageMetadata: the IPTC fields Google Images reads, written as XMP and read back to prove it.
        if (card.imageMetadata) {
          await writeFile(file, embedXmp(await readFile(file), xmpPacket(card.imageMetadata)));
          const back = imageMetadata(await readFile(file)).fields;
          for (const [key, value] of Object.entries(card.imageMetadata)) if (back[key] !== value) problems.push(`${type} XMP ${key} reads back as ${JSON.stringify(back[key] ?? null)}, not ${JSON.stringify(value)}`);
        }
        sizes[type] = (await stat(file)).size;
      }
      const jpeg = (card.format ?? 'jpeg') === 'jpeg';
      // publishAs: the image's path in the site, so apply-proposals.ts publishes it with the other proposed files.
      if (card.publishAs) {
        const published = path.join(out, 'proposed-files', ...`${config.site.base}${card.publishAs}`.split('/'));
        await mkdir(path.dirname(published), { recursive: true });
        await copyFile(path.join(out, 'assets', `${card.file}.${jpeg ? 'jpg' : 'png'}`), published);
        const address = `${config.site.url}${card.publishAs}`;
        if (config.proposed?.imageUrl && config.proposed.imageUrl !== address) problems.push(`proposed imageUrl ${config.proposed.imageUrl} is not where the card is published (${address})`);
      }
      failures += problems.length;
      cards.push({ id: card.id, label: card.label ?? card.id, local: `assets/${card.file}.${jpeg ? 'jpg' : 'png'}`, type: jpeg ? 'image/jpeg' : 'image/png', width: W, height: H,
        bytes: jpeg ? sizes.jpeg : sizes.png, pngBytes: sizes.png, alt: card.alt ?? '', textShare,
        crop11: !problems.some(p => p.includes('center square')), xSafe: !problems.some(p => p.includes('enters the')) });
      report.push({ id: card.id, boxes, textShare, problems, note, sizes });
      console.log(`${card.id}: ${boxes.length} lines of text, text covers ${textShare}%, PNG ${Math.round(sizes.png / 1024)} KB, JPEG ${Math.round(sizes.jpeg / 1024)} KB${problems.length ? `\n  FAIL ${problems.join('\n  FAIL ')}` : ', layout checks passed'}${note ? `\n  note: ${note}` : ''}`);
      await context.close();
    }
  } finally {
    await browser?.close();
  }
  await writeData(out, 'share-cards.js', 'SHARE_CARDS', cards, 'render-share-cards.ts');
  await mkdir(path.join(out, 'check'), { recursive: true });
  await writeFile(path.join(out, 'check', 'share-cards.json'), `${JSON.stringify(report, null, 2)}\n`);
  return { ok: failures === 0, cards, report };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => {
    const result = await renderShareCards(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)), typeof options.channel === 'string' ? options.channel : undefined);
    return result.ok;
  });
}
