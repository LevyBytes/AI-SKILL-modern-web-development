// Audits every configured page's head and the site's metadata files against their standards and the platforms'
// documented rules, twice: as the site has them, and as they would be after apply-proposals.ts (the proposed head
// merged into each page, the proposed files over the site's). Writes:
//   <out>/check/metadata.json   every finding of both states
//   <out>/metadata-audit.js     the same for the gallery's audit section
// It fails (exit status 1) when the state after the proposals, or the site itself when nothing is proposed, has an
// error. Run it after build-gallery.ts, render-share-cards.ts, render-icons.ts and build-site-files.ts; the site is
// only read.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type Finding, collector } from './audit-common.ts';
import { type PageState, type SiteState, auditSiteFiles } from './audit-files.ts';
import { auditHead, isNoindex } from './audit-head.ts';
import { auditStructuredData } from './audit-structured-data.ts';
import { mergeHead } from './check-gallery.ts';
import { proposedMarkup } from './proposed-markup.ts';
import { type Config, fail, headBounds, isMain, pageUrl, readConfig, readData, readHead, required, runCli, writeData } from './shared.ts';

const HELP = `Audit the pages' head tags and the site's metadata files, as they are and after the proposals.
  node scripts/share-previews/check-metadata.ts --config <preview.config.json> --out <folder>`;

function walk(root: string, dir = root): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(root, full) : [path.relative(root, full).split(path.sep).join('/')];
  });
}

// The head the proposal gives a page, merged into its HTML as apply-proposals.ts would write it.
export function proposedPage(html: string, markup: string) {
  const text = html.replace(/\r\n?/g, '\n');
  const { start, end } = headBounds(text);
  return text.slice(0, start) + mergeHead(text, markup).head + text.slice(end);
}

function siteState(config: Config, out: string, data: any, cards: any[], proposed: boolean): SiteState {
  const proposedRoot = path.join(out, 'proposed-files', ...config.site.base.split('/').filter(Boolean));
  const home = data.pages.find((p: any) => p.key === (config.gallery.homeKey ?? 'home')) ?? data.pages[0];
  const pageHtml = new Map<string, string>();
  for (const page of config.pages) {
    const html = readFileSync(path.join(config.site.root, page.file), 'utf8');
    const markup = proposed ? proposedMarkup(data.pages.find((p: any) => p.key === page.key), home, config.proposed, cards) : null;
    pageHtml.set(page.file, markup ? proposedPage(html, markup) : html);
  }
  const read = (rel: string): Buffer | null => {
    if (pageHtml.has(rel)) return Buffer.from(pageHtml.get(rel), 'utf8');
    const proposedFile = path.join(proposedRoot, ...rel.split('/'));
    if (proposed && existsSync(proposedFile)) return readFileSync(proposedFile);
    const file = path.join(config.site.root, ...rel.split('/'));
    return existsSync(file) && !rel.split('/').includes('..') ? readFileSync(file) : null;
  };
  const files = [...new Set([...walk(config.site.root), ...(proposed ? walk(proposedRoot) : [])])].sort();
  const siteUrl = config.site.url;
  const urlToRel = (url: string) => {
    if (!url.startsWith(siteUrl)) return null;
    const rest = decodeURIComponent(url.slice(siteUrl.length).replace(/[?#].*$/, ''));
    return !rest || rest.endsWith('/') ? `${rest}index.html` : rest;
  };
  const state: SiteState = { siteUrl, atHostRoot: new URL(siteUrl).pathname === '/', read, list: () => files, urlToRel, pages: [] };
  state.pages = config.pages.map((page): PageState => {
    const head = readHead(pageHtml.get(page.file));
    const href = head.links.find(link => String(link.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'))?.href ?? null;
    const url = pageUrl(config, page, null);
    let canonical: string | null = null;
    try { canonical = href ? new URL(href, url).href : null; } catch { canonical = null; }
    return { key: page.key, file: page.file, url, head, noindex: isNoindex([...head.tags, ...head.bodyMeta]), canonical };
  });
  return state;
}

function auditState(config: Config, state: SiteState) {
  const homeKey = config.gallery.homeKey ?? config.pages[0].key;
  const site = auditSiteFiles(state);
  const pages: Record<string, Finding[]> = {};
  for (const page of state.pages) {
    const { findings, add } = collector();
    const html = state.read(page.file).toString('utf8');
    auditHead({ page, html, site: state, robots: site.robots, isHome: page.key === homeKey }, add);
    auditStructuredData(page.head.ld, { url: page.url, isHome: page.key === homeKey, siteUrl: config.site.url }, add);
    pages[page.key] = findings;
  }
  return { pages, site: site.findings };
}

const tally = (findings: Finding[]) => Object.fromEntries(['error', 'warn', 'info', 'ok'].map(level => [level, findings.filter(f => f.level === level).length]));

export async function checkMetadata(config: Config, out: string) {
  const data = readData<any>(out, 'preview-data.js', null) ?? fail('preview-data.js not found; run build-gallery.ts first');
  const cards = readData<any[]>(out, 'share-cards.js', []);
  const hasProposal = Boolean(config.proposed) || walk(path.join(out, 'proposed-files')).length > 0;
  const source = auditState(config, siteState(config, out, data, cards, false));
  const after = hasProposal ? auditState(config, siteState(config, out, data, cards, true)) : null;
  const audit = {
    generatedAt: `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    pages: Object.fromEntries(config.pages.map(p => [p.key, { source: source.pages[p.key], proposed: after?.pages[p.key] ?? null }])),
    site: { source: source.site, proposed: after?.site ?? null },
    summary: {} as Record<string, any>,
  };
  for (const [name, state] of Object.entries({ source, proposed: after })) {
    if (state) audit.summary[name] = tally([...Object.values(state.pages).flat(), ...state.site]);
  }
  await mkdir(path.join(out, 'check'), { recursive: true });
  await writeFile(path.join(out, 'check', 'metadata.json'), `${JSON.stringify(audit, null, 2)}\n`);
  await writeData(out, 'metadata-audit.js', 'METADATA_AUDIT', audit, 'check-metadata.ts');
  const final = after ?? source;
  const errors = [...Object.entries(final.pages).flatMap(([key, list]) => list.filter(f => f.level === 'error').map(f => ({ where: key, ...f }))),
    ...final.site.filter(f => f.level === 'error').map(f => ({ where: 'site', ...f }))];
  for (const [name, counts] of Object.entries(audit.summary)) console.log(`${name.padEnd(9)} errors ${counts.error}, checks ${counts.warn}, notes ${counts.info}, passes ${counts.ok}`);
  for (const error of errors) console.log(`  ERROR ${error.where}: ${error.subject}: ${error.text}`);
  console.log(`metadata audit ${errors.length ? `FAILED with ${errors.length} errors ${after ? 'after the proposals' : 'in the site'}` : 'passed'}; report: ${path.join(out, 'check', 'metadata.json')}`);
  return { ok: errors.length === 0, audit, errors };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => (await checkMetadata(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)))).ok);
}
