// Tests the share-preview scripts end to end on the bundled fixture site (assets/share-preview-fixture), headless:
// the whole build, every proposed file and icon, the share card's embedded metadata, the metadata audit, the proposed
// heads (and that the audit sees the same head the gallery writes), a dry run and a real run of apply-proposals.ts on
// a copy, the gallery's sections and contents list, and negative controls that must fail, including every audit rule
// family (test-metadata-rules.ts). Nothing outside --work is written.
import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyProposals } from './apply-proposals.ts';
import { mergeHead } from './check-gallery.ts';
import { proposedPage } from './check-metadata.ts';
import { proposedMarkup } from './proposed-markup.ts';
import { renderShareCards } from './render-share-cards.ts';
import { runPreviews } from './run-previews.ts';
import { imageInfo, imageMetadata, isMain, launchBrowser, readConfig, readData, runCli, skillRoot } from './shared.ts';
import { testMetadataRules } from './test-metadata-rules.ts';

const HELP = `Test the share-preview scripts on the bundled fixture site.
  node scripts/share-previews/test-share-previews.ts [--work <empty folder>] [--channel chrome]`;

const results: boolean[] = [];
function check(name: string, ok: boolean, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && !ok ? `: ${detail}` : ''}`);
}
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])) : []);

async function galleryInteractions(out: string, config: any, channel?: string) {
  const gallery = pathToFileURL(path.join(out, 'index.html')).href;
  const browser = await launchBrowser(channel);
  try {
    const page = await (await browser.newContext({ viewport: { width: 1480, height: 900 } })).newPage();
    const errors: string[] = [];
    page.on('pageerror', (error: unknown) => errors.push(String(error)));
    const ready = () => page.waitForSelector('body[data-ready="true"]');
    const openKeys = () => page.evaluate(() => [...document.querySelectorAll('details.sec[open]')].map((el: any) => el.dataset.sec).join(','));
    await page.goto(`${gallery}?page=home&meta=proposed&theme=light`);
    await ready();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await ready();
    check('gallery: a first visit opens only the overview', (await openKeys()) === 'overview', await openKeys());
    await page.click('[data-jump="mock-discord"]');
    const discord = await page.evaluate(() => ({ open: (document.getElementById('sec-chat') as any).open, top: Math.round(document.getElementById('mock-discord').getBoundingClientRect().top), header: (document.querySelector('.top') as any).offsetHeight }));
    check('gallery: a contents link opens its section and scrolls to the mockup', discord.open && discord.top >= discord.header && discord.top < discord.header + 40, JSON.stringify(discord));
    await page.reload();
    await ready();
    check('gallery: open sections are remembered after a reload', (await openKeys()) === 'overview,chat', await openKeys());
    await page.click('[data-page="about"]');
    await ready();
    check('gallery: switching pages keeps the open sections', (await openKeys()) === 'overview,chat', await openKeys());
    await page.click('[data-expand="all"]');
    const closed = await page.evaluate(() => document.querySelectorAll('details.sec:not([open]), details.sub:not([open])').length);
    check('gallery: expand all opens every section and part', closed === 0, `${closed} closed`);
    await page.click('[data-expand="none"]');
    check('gallery: collapse all closes every section', (await openKeys()) === '', await openKeys());
    await page.goto(`${gallery}?page=home&meta=proposed&theme=light#mock-x`);
    await ready();
    const x = await page.evaluate(() => ({ open: (document.getElementById('sec-social') as any).open, top: Math.round(document.getElementById('mock-x').getBoundingClientRect().top) }));
    check('gallery: a link to a mockup opens its section', x.open && x.top < 200, JSON.stringify(x));
    await page.goto(`${gallery}?page=home&meta=proposed&theme=light&open=all`);
    await ready();
    const status = await page.evaluate(() => ({ chips: document.querySelectorAll('.mock .chip.ok, .mock .chip.warn').length, mocks: document.querySelectorAll('.mock').length,
      fixture: document.body.textContent.includes('Fixture note: added by the configuration'), finding: document.body.textContent.includes('Fixture finding.'),
      audit: document.querySelectorAll('#sec-audit .au').length, auditErrors: document.querySelectorAll('#sec-audit .au-error').length,
      discover: Boolean(document.querySelector('#mock-google-discover .dv-img')), favicon: (document.querySelector('#mock-google-desktop .g-fav img') as any)?.getAttribute('src') }));
    check('gallery: every mockup gets a fit chip', status.mocks === 20 && status.chips === 20, JSON.stringify(status));
    check('gallery: the configuration adds its platform notes and findings', status.fixture && status.finding, JSON.stringify(status));
    check('gallery: the audit section lists the proposal\'s results with no errors', status.audit > 10 && status.auditErrors === 0, JSON.stringify(status));
    check('gallery: Discover shows the large image, and search results use the rendered favicon', status.discover && status.favicon === 'assets/icons/favicon.ico', JSON.stringify(status));
    // The audit builds the proposed head with proposed-markup.ts; it must be the markup the gallery writes.
    const data = readData<any>(out, 'preview-data.js', null);
    const cards = readData<any[]>(out, 'share-cards.js', []);
    const home = data.pages.find((p: any) => p.key === 'home');
    for (const key of ['home', 'about']) {
      await page.goto(`${gallery}?page=${key}&meta=proposed&theme=light&open=changes`);
      await ready();
      const shown = await page.locator('#group-head .head-code').textContent();
      const built = proposedMarkup(data.pages.find((p: any) => p.key === key), home, config.proposed, cards);
      check(`audit: the head it audits for ${key} is the head the gallery writes`, shown === built, `${shown}\n---\n${built}`);
    }
    // Discord trims titles at 70 bytes and descriptions at 350. The title's É fills bytes 70 and 71, and both texts
    // have more bytes than characters, so counting characters or keeping a character that crosses the limit fails.
    const longTitle = 'Tide tables for every harbour on the Channel coast, from Boulogne to Étretat and Le Havre, with heights and moon phases';
    const longDescription = 'Tables des marées imprimables pour chaque port, avec hauteurs et phases de la lune. '.repeat(6);
    const long = await (await browser.newContext({ viewport: { width: 1480, height: 900 } })).newPage();
    long.on('pageerror', (error: unknown) => errors.push(String(error)));
    await long.addInitScript(([title, description]: string[]) => {
      let stored: any;
      Object.defineProperty(window, 'PROPOSED_METADATA', { configurable: true, get: () => stored,
        set: (value: any) => { value.pages.home.ogTitle = title; value.pages.home.ogDescription = description; stored = value; } });
    }, [longTitle, longDescription]);
    await long.goto(`${gallery}?page=home&meta=proposed&theme=light&open=all`);
    await long.waitForSelector('body[data-ready="true"]');
    const dc = await long.evaluate(() => {
      const text = (name: string) => document.querySelector(`#mock-discord [data-field="${name}"]`)?.textContent ?? '';
      return { title: text('title'), description: text('description'), chips: [...document.querySelectorAll('#mock-discord .chip')].map(el => el.textContent).join(' | ') };
    });
    const fitsBytes = (shown: string, full: string, max: number) => shown.endsWith('…') && Buffer.byteLength(shown.slice(0, -1), 'utf8') <= max && full.startsWith(shown.slice(0, -1));
    check('gallery: the Discord mockup trims the title to 70 bytes and the description to 350, and marks both cut short',
      fitsBytes(dc.title, longTitle, 70) && dc.title === 'Tide tables for every harbour on the Channel coast, from Boulogne to…' && fitsBytes(dc.description, longDescription, 350)
        && /Cut short: title, description/.test(dc.chips), JSON.stringify(dc));
    check('gallery: no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
  }
}

export async function testSharePreviews(work: string, channel?: string) {
  const fixture = path.join(work, 'fixture');
  await cp(path.join(skillRoot, 'assets', 'share-preview-fixture'), fixture, { recursive: true });
  const config = readConfig(path.join(fixture, 'preview.config.json'));
  const out = path.join(work, 'previews');
  const run = await runPreviews(config, out, { channel });
  check('the whole build passes', run.ok, JSON.stringify(run.steps));

  const read = (file: string) => readFile(path.join(out, file), 'utf8');
  const data = await read('preview-data.js');
  check('preview data: both pages, read as the site has them', data.includes('"title": "Tide Tables | Home"') && data.includes('"key": "about"'));
  const card = imageInfo(await readFile(path.join(out, 'assets', 'tide-tables-share.jpg')));
  check('share card: a 1200 x 630 JPEG', card.type === 'image/jpeg' && card.width === 1200 && card.height === 630, JSON.stringify(card));
  const cards = JSON.parse((await read('share-cards.js')).replace(/^[\s\S]*?= /, '').replace(/;\s*$/, ''));
  check('share card: text inside the square, clear of X, under 20%', cards[0].crop11 && cards[0].xSafe && cards[0].textShare < 20, JSON.stringify(cards[0]));
  const robots = await read('proposed-files/docs/robots.txt');
  check('robots.txt: keeps the site lines and adds the signals and sitemap', robots.includes('# Every crawler may read every page.') && robots.includes('Content-Signal: search=yes, ai-input=yes, ai-train=yes')
    && /User-agent: __usage_ai-training\nAllow: \//.test(robots) && robots.trimEnd().endsWith('Sitemap: https://tides.example/sitemap.xml'), robots);
  const sitemap = await read('proposed-files/docs/sitemap.xml');
  check('sitemap.xml: each page with its lastmod', sitemap.includes('<loc>https://tides.example/</loc><lastmod>2026-11-19</lastmod>') && sitemap.includes('<loc>https://tides.example/about.html</loc><lastmod>2026-11-17</lastmod>'), sitemap);
  const security = await read('proposed-files/docs/.well-known/security.txt');
  check('security.txt: contact, expiry and canonical', /^Contact: https:/m.test(security) && /^Expires: \d{4}-\d{2}-\d{2}T00:00:00\.000Z$/m.test(security) && security.includes('Canonical: https://tides.example/.well-known/security.txt'), security);
  check('security.txt: warns that the site has no .nojekyll', (await read('proposed-files.js')).includes('no .nojekyll file'));
  const key = (await read('proposed-files/docs/indexnow.txt')).trim();
  const workflow = await read('proposed-files/.github/workflows/indexnow.yml');
  check('IndexNow: a key file and a workflow that names it', /^[0-9a-f]{32}$/.test(key) && workflow.includes(`KEY: ${key}`) && workflow.includes("keyLocation: 'https://tides.example/indexnow.txt'"));
  check('share image: published with the proposed files', existsSync(path.join(out, 'proposed-files', 'docs', 'media', 'tide-tables-share.jpg')));
  const published = imageMetadata(await readFile(path.join(out, 'proposed-files', 'docs', 'media', 'tide-tables-share.jpg')));
  check('share image: carries the configured IPTC metadata as XMP', JSON.stringify(published.fields) === JSON.stringify(config.shareCards[0].imageMetadata) && !published.gps, JSON.stringify(published.fields));
  check('robots.txt: the IETF usage line and a crawler group', robots.includes('Content-Usage: train-ai=y') && /# GPTBot: may crawl every page\.\nUser-agent: GPTBot\nAllow: \//.test(robots), robots);
  check('sitemap.xml: each page lists its share image', count(sitemap, /<image:image><image:loc>https:\/\/tides\.example\/media\/tide-tables-share\.jpg<\/image:loc><\/image:image>/g) === 2 && sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), sitemap);
  const icons: [string, string[]][] = [['favicon.ico', ['16x16', '32x32', '48x48']], ['icon-192.png', ['192x192']], ['icon-512.png', ['512x512']], ['icon-maskable-512.png', ['512x512']], ['apple-touch-icon.png', ['180x180']]];
  const iconSizes = await Promise.all(icons.map(async ([file]) => {
    const info = imageInfo(await readFile(path.join(out, 'proposed-files', 'docs', file)));
    return info.sizes ?? [`${info.width}x${info.height}`];
  }));
  check('icons: every rendered icon has its sizes, and favicon.ico holds three', JSON.stringify(iconSizes) === JSON.stringify(icons.map(([, s]) => s)), JSON.stringify(iconSizes));
  const manifest = JSON.parse(await read('proposed-files/docs/manifest.webmanifest'));
  check('manifest: name, display and the 192, 512 and maskable icons, without the Apple icon', manifest.name === 'Example Tide Tables' && manifest.display === 'standalone'
    && JSON.stringify(manifest.icons.map((i: any) => `${i.src} ${i.purpose ?? 'any'}`)) === JSON.stringify(['icon-192.png any', 'icon-512.png any', 'icon-maskable-512.png maskable']), JSON.stringify(manifest.icons));
  const llms = await read('proposed-files/docs/llms.txt');
  check('llms.txt: an H1, the summary and every page', llms.startsWith('# Example Tide Tables\n\n> Print tide tables') && llms.includes('- [About Example Tide Tables](https://tides.example/about.html): '), llms);
  check('TDMRep, GPC and ads.txt files', (await read('proposed-files/docs/.well-known/tdmrep.json')).includes('"tdm-reservation": 0') && JSON.parse(await read('proposed-files/docs/.well-known/gpc.json')).gpc === true
    && (await read('proposed-files/docs/ads.txt')).includes('placeholder.example.com, placeholder, DIRECT, placeholder'));
  const audit = JSON.parse(await read('check/metadata.json'));
  const findings = (state: string) => [...Object.values(audit.pages).flatMap((p: any) => p[state] ?? []), ...(audit.site[state] ?? [])] as any[];
  check('audit: no errors after the proposals', audit.summary.proposed.error === 0, JSON.stringify(audit.summary));
  check('audit: the site source shows what the proposals fix', ['Every icon is SVG', 'No `apple-touch-icon`', 'No Open Graph tags', 'No security.txt'].every(text => findings('source').some(f => f.text.includes(text))), JSON.stringify(audit.summary));
  check('audit: the proposal\'s feed, manifest, icons, XMP and robots lines are checked', ['Atom with 2 entries', 'Colors: theme #133744', 'Icons: favicon.ico', 'IPTC photo metadata', 'IETF usage preference'].every(text => findings('proposed').some(f => f.text.includes(text))));
  const head = await read('proposed-head/index.html');
  check('proposed head: replaces the managed tags once each', count(head, /<title>/g) === 1 && count(head, /application\/ld\+json/g) === 1 && count(head, /name="description"/g) === 1 && head.includes('content="https://tides.example/media/tide-tables-share.jpg"'));
  check('proposed head: keeps the tags it does not manage', ['charset="utf-8"', 'name="referrer"', 'name="twitter:site"', 'rel="stylesheet"'].every(tag => head.includes(tag)));
  check('proposed head: extra tags replace every tag of their kind', count(head, /rel="icon"/g) === 2 && head.includes('<link rel="icon" href="favicon.ico" sizes="16x16 32x32 48x48">') && head.includes('rel="manifest"') && head.includes('application/atom+xml')
    && count(head, /name="theme-color"/g) === 2 && head.includes('media="(prefers-color-scheme: dark)"'), head);
  const about = await read('proposed-head/about.html');
  check('proposed head: an extra tag can add an unmanaged tag the page lacks', count(about, /name="twitter:site"/g) === 1, about);
  const sourceHtml = await readFile(path.join(fixture, 'site', 'index.html'), 'utf8');
  const merged = proposedPage(sourceHtml, proposedMarkup(readData<any>(out, 'preview-data.js', null).pages[0], readData<any>(out, 'preview-data.js', null).pages[0], config.proposed, readData<any[]>(out, 'share-cards.js', [])));
  check('audit: the merged page it audits has the same head as proposed-head', head.slice(head.indexOf('<head>')) === merged.slice(merged.indexOf('<head>'), merged.indexOf('</head>') + 7) + '\n');
  let refused = false;
  try { mergeHead('<head>\n<meta charset="utf-8"><title>One line</title>\n</head>', '<title>New</title>'); } catch { refused = true; }
  check('negative control: a head with several tags on one line is refused', refused);
  const kept = mergeHead('<head>\n  <title>Old</title>\n  <meta name="theme-color" content="#000000">\n</head>', '<title>New</title>');
  check('a managed tag the proposal does not set is kept', kept.head.includes('theme-color') && kept.kept.includes('theme-color'), JSON.stringify(kept));

  // Negative control: a tagline long enough to push text into X's title band and over 20% of the image.
  const bad = { ...config, shareCards: [{ ...config.shareCards[0], publishAs: undefined, query: { ...config.shareCards[0].query, tagline: 'Printable tide tables for any harbour, '.repeat(12) } }] };
  const negative = await renderShareCards(bad, path.join(work, 'negative'), channel);
  const problems = negative.report[0].problems.join(' | ');
  check('negative control: an overfull card fails its layout checks', !negative.ok && problems.includes('X title band') && problems.includes('more than 20%'), problems);

  await galleryInteractions(out, config, channel);
  testMetadataRules(check);

  // apply-proposals.ts on a copy of the site laid out as a repository (the site under docs/).
  const repo = path.join(work, 'repository');
  await cp(path.join(fixture, 'site'), path.join(repo, 'docs'), { recursive: true });
  const original = await readFile(path.join(repo, 'docs', 'index.html'), 'utf8');
  const dry = await applyProposals(config, out, repo, false);
  const expected = walk(path.join(out, 'proposed-head')).length + walk(path.join(out, 'proposed-files')).length;
  check(`apply: a dry run lists the ${expected} changes and writes nothing`, dry.written === 0 && dry.changes.filter(c => c.action !== 'unchanged').length === expected && expected === 18 && (await readFile(path.join(repo, 'docs', 'index.html'), 'utf8')) === original, `${expected}: ${JSON.stringify(dry.changes)}`);
  await applyProposals(config, out, repo, true);
  const applied = await readFile(path.join(repo, 'docs', 'index.html'), 'utf8');
  check('apply: the page gets the proposed head and keeps its body', applied.includes('<meta property="og:image:alt"') && applied.slice(applied.indexOf('</head>')) === original.slice(original.indexOf('</head>')));
  const again = await applyProposals(config, out, repo, false);
  check('apply: a second run finds nothing to change', again.changes.every(c => c.action === 'unchanged'), JSON.stringify(again.changes));

  const passed = results.filter(Boolean).length;
  console.log(`${passed} of ${results.length} checks passed. Work folder: ${work}`);
  return passed === results.length;
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => testSharePreviews(typeof options.work === 'string' ? path.resolve(options.work) : await mkdtemp(path.join(os.tmpdir(), 'share-previews-')),
    typeof options.channel === 'string' ? options.channel : undefined));
}
