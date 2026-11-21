// Opens the built gallery headless for every page, metadata mode and theme, and reports broken images, page and
// console errors, horizontal scrolling and which fields each mockup cuts short. It also writes the proposed <head>
// of every page the proposed metadata covers. No window is shown.
//   <out>/check/report.json              every run's results
//   <out>/proposed-head/<page file>      the page's own head with the managed metadata tags replaced by the proposed
//                                        ones; every other line stays where it is, and a managed tag the proposal does
//                                        not set is kept as the page has it
//   <out>/screenshots/                   with --screenshots: each run's whole gallery, and the home page's mockups
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Config, fail, headBounds, isMain, launchBrowser, readAttributes, readConfig, required, runCli, tagKey } from './shared.ts';

const HELP = `Check the built gallery and write the proposed heads.
  node scripts/share-previews/check-gallery.ts --config <preview.config.json> --out <folder> [--screenshots] [--channel chrome]`;

// The metadata tags the gallery always writes. A tag of any other kind is replaced only when the proposal sets that
// kind too (its extraTags, such as hreflang links or icons); otherwise the page keeps it.
const MANAGED_META = new Set(['description', 'robots', 'theme-color', 'application-name', 'apple-mobile-web-app-title',
  'og:type', 'og:url', 'og:site_name', 'og:locale', 'og:title', 'og:description', 'og:image', 'og:image:type', 'og:image:width',
  'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']);
const isManaged = (key: string) => MANAGED_META.has(key) || /^twitter:(label|data)\d+$/.test(key) || ['title', 'canonical', 'ld+json'].includes(key);

// The kind of head tag a line holds (see tagKey in shared.ts), or null for other lines.
function lineKey(line: string): string | null {
  if (/^<(meta|link|title)\b/i.test(line) && !line.includes('>')) fail(`a tag spans several lines; put each head tag on its own line: ${line}`);
  if (/^<title\b/i.test(line)) {
    if (!/<\/title>/i.test(line)) fail(`the title spans several lines; put it on one line: ${line}`);
    return 'title';
  }
  if (/^<script\b[^>]*application\/ld\+json/i.test(line)) return 'ld+json';
  const tag = /^<(meta|link)\b([^>]*)>/i.exec(line);
  return tag ? tagKey({ tag: tag[1].toLowerCase(), ...readAttributes(tag[2]) }) : null;
}

// Splits head lines into entries: one per line, or one per multi-line JSON-LD block.
function entries(lines: string[]) {
  const out: { lines: string[]; key: string | null }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const tag = lines[i].trim();
    if (/<(meta|link|title)\b[^>]*>.*<(meta|link|title|script)\b/i.test(tag)) fail(`several tags share a line; put each head tag on its own line: ${tag.slice(0, 120)}`);
    const key = lineKey(tag);
    if (key === 'ld+json' && !/<\/script>/i.test(tag)) {
      const block = [lines[i]];
      while (++i < lines.length && !/<\/script>/i.test(lines[i])) block.push(lines[i]);
      if (i >= lines.length) fail('a JSON-LD script is not closed');
      out.push({ lines: [...block, lines[i]], key });
    } else out.push({ lines: [lines[i]], key });
  }
  return out;
}

export function mergeHead(html: string, markup: string) {
  const text = html.replace(/\r\n?/g, '\n');
  const { start, end } = headBounds(text);
  const head = text.slice(start, end);
  const openEnd = head.indexOf('>') + 1;
  const source = entries(head.slice(openEnd, head.lastIndexOf('</')).split('\n'));
  const proposed = entries(markup.replace(/\r\n?/g, '\n').split('\n'));
  const emitted = new Set(proposed.map(entry => entry.key));
  const indent = source.find(entry => entry.key)?.lines[0].match(/^\s*/)?.[0] ?? '  ';
  const kept: string[] = [];
  const result: string[] = [];
  let inserted = false;
  for (const entry of source) {
    if (entry.key && emitted.has(entry.key)) {
      if (!inserted) { result.push(...proposed.flatMap(p => p.lines.map(line => indent + line))); inserted = true; }
      continue;
    }
    if (entry.key && isManaged(entry.key)) kept.push(entry.key);
    result.push(...entry.lines);
  }
  if (!inserted) {
    const last = result.length && !result[result.length - 1].trim() ? result.length - 1 : result.length;
    result.splice(last, 0, ...proposed.flatMap(p => p.lines.map(line => indent + line)));
  }
  const body = result.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
  return { head: `${head.slice(0, openEnd)}\n${body}\n</head>`, kept };
}

export async function checkGallery(config: Config, out: string, options: { channel?: string; screenshots?: boolean } = {}) {
  const gallery = pathToFileURL(path.join(out, 'index.html')).href;
  const shots = path.join(out, 'screenshots');
  if (options.screenshots) { await rm(shots, { recursive: true, force: true }); await mkdir(shots, { recursive: true }); }
  const browser = await launchBrowser(options.channel);
  const report: any = { browser: `${browser.version()} (headless, Playwright)`, runs: [], widths: [], heads: [] };
  let problems = 0;
  try {
    const page = await (await browser.newContext({ viewport: { width: 1480, height: 1000 } })).newPage();
    const crisp = options.screenshots ? await (await browser.newContext({ viewport: { width: 1480, height: 1000 }, deviceScaleFactor: 2 })).newPage() : null;
    let errors: string[] = [];
    for (const p of [page, crisp].filter(Boolean)) {
      p.on('console', (message: any) => { if (message.type() === 'error') errors.push(message.text()); });
      p.on('pageerror', (error: unknown) => errors.push(String(error)));
    }
    const open = async (p: any, query: string) => {
      await p.goto(`${gallery}?${query}&open=all`);
      await p.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
    };
    await open(page, 'meta=source');
    const { keys, proposedKeys, home } = await page.evaluate(() => ({
      keys: (window as any).PREVIEW_DATA.pages.map((p: any) => p.key),
      proposedKeys: Object.keys((window as any).PROPOSED_METADATA?.pages ?? {}),
      home: (window as any).GALLERY_CONFIG?.homeKey ?? (window as any).PREVIEW_DATA.pages[0].key,
    }));
    for (const key of keys) {
      for (const meta of proposedKeys.includes(key) ? ['source', 'proposed'] : ['source']) {
        for (const theme of ['light', 'dark']) {
          errors = [];
          const query = `page=${key}&meta=${meta}&theme=${theme}`;
          await open(page, query);
          const info = await page.evaluate(() => ({
            brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')),
            horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
            cuts: Object.fromEntries(Object.entries((window as any).__CUTS__ ?? {}).filter(([, fields]: any) => fields.length)),
          }));
          const name = `${key}-${meta}-${theme}`;
          if (options.screenshots) {
            await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
            if (key === home) {
              await open(crisp, query);
              await mkdir(path.join(shots, name), { recursive: true });
              for (const id of await crisp.evaluate(() => [...document.querySelectorAll('.mock')].map((m: any) => m.dataset.id))) {
                await crisp.locator(`#mock-${id} .frame`).screenshot({ path: path.join(shots, name, `${id}.png`) });
              }
            }
          }
          if (meta === 'proposed' && theme === 'light') {
            const file = config.pages.find(p => p.key === key).file;
            const markup = await page.locator('#group-head .head-code').textContent();
            const merged = mergeHead(await readFile(path.join(config.site.root, file), 'utf8'), markup);
            const target = path.join(out, 'proposed-head', ...file.split('/'));
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target, `<!-- Proposed head for ${config.site.base}${file}, written by check-gallery.ts from the gallery's proposed metadata. Every tag the metadata does not manage stays as the page has it. -->\n${merged.head}\n`);
            report.heads.push({ file, kept: merged.kept });
            if (merged.kept.length) console.log(`${file}: kept ${merged.kept.join(', ')} from the page; the proposal does not set them.`);
          }
          const record = { run: name, query, ...info, errors: [...errors] };
          problems += info.brokenImages.length + errors.length + (info.horizontalScroll ? 1 : 0);
          report.runs.push(record);
          console.log(`${name.padEnd(28)} broken images ${info.brokenImages.length}, errors ${errors.length}, horizontal scroll ${info.horizontalScroll ? 'YES' : 'no'}, cut: ${Object.entries(info.cuts).map(([id, fields]: any) => `${id} (${fields.join(', ')})`).join('; ') || 'none'}`);
        }
      }
    }
    // Narrow windows: every section open, checked for sideways scrolling.
    const narrow = `page=${home}&meta=${proposedKeys.includes(home) ? 'proposed' : 'source'}&theme=light`;
    for (const width of [1000, 760, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, narrow);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      problems += scroll ? 1 : 0;
      report.widths.push({ width, horizontalScroll: scroll });
    }
    console.log(`narrow widths: ${report.widths.map((w: any) => `${w.width} px ${w.horizontalScroll ? 'SCROLLS' : 'fits'}`).join(', ')}`);
  } finally {
    await browser.close();
  }
  report.passed = problems === 0;
  await mkdir(path.join(out, 'check'), { recursive: true });
  await writeFile(path.join(out, 'check', 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`gallery check ${report.passed ? 'passed' : `FAILED with ${problems} problems`}; report: ${path.join(out, 'check', 'report.json')}`);
  return { ok: report.passed, report };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => (await checkGallery(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)),
    { channel: typeof options.channel === 'string' ? options.channel : undefined, screenshots: options.screenshots === true })).ok);
}
