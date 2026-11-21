// Writes the proposed site files the configuration's "siteFiles" asks for, each at the path it would have in the
// site's repository, under <out>/proposed-files/, and gives the gallery their contents in <out>/proposed-files.js.
// The site is only read: an existing robots.txt or sitemap.xml is the starting point and every existing line or entry
// is kept. Files: robots.txt, sitemap.xml, .well-known/security.txt, the IndexNow key file and a GitHub Actions
// workflow that submits the pages a push changed (dry-run against a sample push), llms.txt, ads.txt and app-ads.txt,
// the web app manifest, and the /.well-known files for TDMRep, Global Privacy Control, Apple universal links and
// Android App Links. check-metadata.ts then audits every proposed file.
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CRAWLERS } from './audit-files.ts';
import { type Config, fail, isMain, pageUrl, readConfig, readHead, required, runCli, writeData } from './shared.ts';

const HELP = `Write the proposed robots.txt, sitemap.xml, security.txt, IndexNow, llms.txt, ads.txt, manifest and .well-known files.
  node scripts/share-previews/build-site-files.ts --config <preview.config.json> --out <folder>`;

interface SiteFile { path: string; note: string; content: string }
const lf = (text: string) => text.replace(/\r\n?/g, '\n');
const existing = (config: Config, name: string) => {
  const file = path.join(config.site.root, name);
  return existsSync(file) ? lf(readFileSync(file, 'utf8')) : null;
};
const isAgent = (line: string) => /^\s*user-agent\s*:/i.test(line);
const agent = (line: string) => line.slice(line.indexOf(':') + 1).trim().toLowerCase();
const isSitemap = (line: string) => /^\s*sitemap\s*:/i.test(line);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const atHostRoot = (config: Config) => new URL(config.site.url).pathname === '/';
// Notes for files that work only at the root of the host, and for /.well-known files on GitHub Pages.
function placementNotes(config: Config, file: string) {
  const notes: string[] = [];
  if (!atHostRoot(config)) notes.push(`The site is served below the host's root (${config.site.url}); ${file} works only at the root of the host, so publish it there.`);
  if (file.startsWith('.well-known/') && !existsSync(path.join(config.site.root, '.nojekyll')) && config.siteFiles.githubPages !== false) notes.push('The site has no .nojekyll file: on GitHub Pages built with Jekyll, the .well-known folder may not be published.');
  return notes;
}

// Puts a line in the User-agent: * group, after its User-agent lines, or replaces the line it already has.
function inStarGroup(lines: string[], line: string, same: RegExp, comment: string) {
  const at = lines.findIndex(l => same.test(l));
  if (at >= 0) { lines[at] = line; return lines; }
  const star = lines.findIndex(l => isAgent(l) && agent(l) === '*');
  if (star < 0) return [comment, 'User-agent: *', line, '', ...lines];
  let end = star;
  while (end + 1 < lines.length && isAgent(lines[end + 1])) end++;
  while (end + 1 < lines.length && /^\s*content-(signal|usage)\s*:/i.test(lines[end + 1])) end++;
  lines.splice(end + 1, 0, line);
  lines.splice(star, 0, comment);
  return lines;
}

// Replaces the rules of a group that names only this crawler, or adds a group for it.
function crawlerGroup(lines: string[], token: string, allow: boolean, comment: string) {
  const start = lines.findIndex(l => isAgent(l) && agent(l) === token.toLowerCase());
  if (start >= 0) {
    let first = start;
    while (first > 0 && isAgent(lines[first - 1])) first--;
    let end = start;
    while (end + 1 < lines.length && isAgent(lines[end + 1])) end++;
    if (end > first) fail(`robots.txt: ${token} shares a group with other crawlers; edit that group by hand`);
    let stop = end + 1;
    while (stop < lines.length && lines[stop].trim() && !isAgent(lines[stop])) stop++;
    lines.splice(start + 1, stop - start - 1, allow ? 'Allow: /' : 'Disallow: /');
    return lines;
  }
  return [...lines, '', comment, `User-agent: ${token}`, allow ? 'Allow: /' : 'Disallow: /'];
}

export function robotsFile(config: Config, settings: any): SiteFile {
  const source = existing(config, 'robots.txt');
  let lines = (source ?? 'User-agent: *\nAllow: /').replace(/\n+$/, '').split('\n');
  const notes = [source ? 'Every existing line is kept.' : 'The site had no robots.txt; this one lets every crawler read every page.', ...placementNotes(config, 'robots.txt')];
  if (settings.contentSignal) {
    lines = inStarGroup(lines, `Content-Signal: ${settings.contentSignal}`, /^\s*content-signal\s*:/i,
      '# Content signals: how this site\'s content may be used for search (search), AI answers (ai-input) and AI training (ai-train).');
    notes.push(`States Content Signals (${settings.contentSignal}). Google and Bing do not read the line; crawlers that follow Cloudflare's policy do, and stating it keeps a CDN default from speaking for the site.`);
  }
  if (settings.contentUsage) {
    if (!/^[a-z0-9_.*-]+=[yn](\s*,\s*[a-z0-9_.*-]+=[yn])*$/.test(settings.contentUsage)) fail('siteFiles.robots.contentUsage must be a list such as "train-ai=n" or "train-ai=y, search=y"');
    lines = inStarGroup(lines, `Content-Usage: ${settings.contentUsage}`, /^\s*content-usage\s*:\s*[^/\s]/i,
      '# IETF AI preferences (Internet-Draft): train-ai is AI training, ai-use is other AI use, search is search; y allows, n does not.');
    notes.push(`States the IETF usage preference (${settings.contentUsage}) from the aipref working group's drafts; crawlers that implement the drafts read it.`);
  }
  for (const [token, choice] of Object.entries(settings.crawlers ?? {})) {
    if (!['allow', 'disallow'].includes(String(choice))) fail(`siteFiles.robots.crawlers.${token} must be "allow" or "disallow"`);
    if (token === '*' || token.toLowerCase() === '__usage_ai-training') fail(`siteFiles.robots.crawlers: use aiTraining for ${token}`);
    lines = crawlerGroup(lines, token, choice === 'allow', `# ${token}: ${choice === 'allow' ? 'may crawl every page' : 'may not crawl this site'}.`);
    const purpose = CRAWLERS[token.toLowerCase()];
    notes.push(purpose ? `${token} (${purpose}): ${choice}.` : `${token}: ${choice}. It is not a crawler token the skill documents; check the spelling against its operator's documentation.`);
  }
  const sitemaps = lines.filter(isSitemap);
  lines = lines.filter(l => !isSitemap(l));
  if (settings.aiTraining) {
    if (!['allow', 'disallow'].includes(settings.aiTraining)) fail('siteFiles.robots.aiTraining must be "allow" or "disallow"');
    const start = lines.findIndex(l => isAgent(l) && agent(l) === '__usage_ai-training');
    if (start >= 0) {
      let end = start + 1;
      while (end < lines.length && lines[end].trim() && !isAgent(lines[end])) end++;
      lines.splice(start, end - start);
    }
    const allow = settings.aiTraining === 'allow';
    lines.push('', `# The shared AI-training preference token: training on this site's content is ${allow ? 'allowed' : 'not allowed'}.`, 'User-agent: __usage_ai-training', allow ? 'Allow: /' : 'Disallow: /');
    notes.push(`States the shared AI-training preference (${settings.aiTraining}), which Google and Bing say they will read from 2027.`);
  }
  if (!sitemaps.length && (config.siteFiles.sitemap || existing(config, 'sitemap.xml') !== null)) {
    sitemaps.push(`Sitemap: ${config.site.url}sitemap.xml`);
    notes.push('Adds the sitemap\'s address.');
  }
  const body = lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
  return { path: `${config.site.base}robots.txt`, note: notes.join(' '), content: `${body}${sitemaps.length ? `\n\n${sitemaps.join('\n')}` : ''}\n` };
}

const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sitemapFile(config: Config, settings: any): SiteFile {
  const source = existing(config, 'sitemap.xml');
  if (source && /<sitemapindex\b/.test(source)) fail('sitemap.xml is a sitemap index; add the pages to the sitemaps it lists by hand');
  // Each existing entry keeps its other elements (images, videos, alternates) and the urlset keeps its namespaces.
  const entries = [...(source ?? '').matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => ({
    loc: block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1] ?? fail('sitemap.xml: a <url> without <loc>'),
    lastmod: block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1] ?? null,
    extra: block.replace(/<loc>[\s\S]*?<\/loc>|<lastmod>[\s\S]*?<\/lastmod>/g, '').trim(),
  }));
  const namespaces = new Map([['xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9']]);
  for (const [, name, value] of (source?.match(/<urlset\b[^>]*>/)?.[0] ?? '').matchAll(/(xmlns(?::\w+)?)="([^"]*)"/g)) namespaces.set(name, value);
  const heads = new Map(config.pages.map(page => [page.key, readHead(readFileSync(path.join(config.site.root, page.file), 'utf8'))]));
  const urls = new Map(config.pages.map(page => [page.key, pageUrl(config, page, heads.get(page.key).links.find(link => link.rel === 'canonical')?.href)]));
  for (const url of urls.values()) if (!entries.some(e => e.loc === url)) entries.push({ loc: url, lastmod: null, extra: '' });
  for (const [key, date] of Object.entries(settings.lastmod ?? {})) {
    if (!urls.has(key)) fail(`siteFiles.sitemap.lastmod: unknown page key "${key}"`);
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/.test(String(date))) fail(`siteFiles.sitemap.lastmod.${key}: not a W3C date`);
    entries.find(e => e.loc === urls.get(key)).lastmod = String(date);
  }
  const notes = [`${source ? 'The existing entries in their order, ' : ''}each page with the date its content last changed. Change a date only when that page's content changes; Google uses lastmod only while it stays accurate.`];
  // images: each page's share image (the proposed one where there is a proposal) as an image sitemap entry.
  if (settings.images) {
    namespaces.set('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1');
    for (const page of config.pages) {
      const image = config.proposed?.pages?.[page.key] ? config.proposed.imageUrl : heads.get(page.key).meta['og:image'];
      const entry = entries.find(e => e.loc === urls.get(page.key));
      if (!image || entry.extra.includes('<image:image>')) continue;
      entry.extra = `${entry.extra}<image:image><image:loc>${xml(new URL(image, urls.get(page.key)).href)}</image:loc></image:image>`;
    }
    notes.push('Lists each page\'s share image with Google\'s image sitemap extension.');
  }
  if (entries.length > 50000) fail(`sitemap.xml would list ${entries.length} URLs; a sitemap holds at most 50,000, so split it and add a sitemap index`);
  const lines = entries.map(e => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}${e.extra}</url>`);
  const attributes = [...namespaces].map(([name, value]) => `${name}="${value}"`).join(' ');
  return {
    path: `${config.site.base}sitemap.xml`,
    note: notes.join(' '),
    content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${attributes}>\n${lines.join('\n')}\n</urlset>\n`,
  };
}

export function securityFile(config: Config, settings: any): SiteFile {
  const contacts = [settings.contact ?? []].flat();
  if (!contacts.length) fail('siteFiles.securityTxt.contact is required (RFC 9116)');
  for (const contact of contacts) if (!/^(https:|mailto:|tel:)/.test(contact)) fail(`security.txt contact must be an https:, mailto: or tel: URI: ${contact}`);
  // A fixed date for a real site; expiresInDays (from today, at midnight UTC) keeps a test fixture from going stale.
  const expires = settings.expiresInDays
    ? new Date(new Date(Date.now() + settings.expiresInDays * 864e5).toISOString().slice(0, 10))
    : new Date(settings.expires ?? fail('siteFiles.securityTxt.expires is required (RFC 9116)'));
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) fail('siteFiles.securityTxt.expires must be a date in the future');
  const notes = ['RFC 9116.', `Renew Expires before ${expires.toISOString().slice(0, 10)}.`];
  if (expires.getTime() - Date.now() > 366 * 864e5) notes.push('Expires is more than a year away; RFC 9116 recommends less than a year.');
  notes.push(...placementNotes(config, '.well-known/security.txt'));
  const field = (name: string, values: unknown) => [values ?? []].flat().map(value => `${name}: ${value}`);
  const lines = [
    ...[settings.comment ?? []].flat().map((text: string) => `# ${text}`),
    ...field('Contact', contacts),
    `Expires: ${expires.toISOString()}`,
    ...field('Encryption', settings.encryption), ...field('Acknowledgments', settings.acknowledgments),
    ...field('Policy', settings.policy), ...field('Hiring', settings.hiring),
    ...field('Preferred-Languages', settings.preferredLanguages),
    ...(settings.canonical === false ? [] : [`Canonical: ${config.site.url}.well-known/security.txt`]),
  ];
  return { path: `${config.site.base}.well-known/security.txt`, note: notes.join(' '), content: `${lines.join('\n')}\n` };
}

// ---- /.well-known/tdmrep.json: the W3C TDM Reservation Protocol ----
export function tdmRepFile(config: Config, settings: any): SiteFile {
  const rules = (settings.rules ?? [{ location: '/', reservation: settings.reservation, policy: settings.policy }]).map((rule: any) => {
    if (![0, 1].includes(rule.reservation)) fail('siteFiles.tdmRep: reservation must be 1 (text and data mining rights reserved) or 0');
    if (rule.policy && !/^https:\/\//.test(rule.policy)) fail('siteFiles.tdmRep: policy must be an https URL');
    return { location: rule.location ?? '/', 'tdm-reservation': rule.reservation, ...(rule.policy ? { 'tdm-policy': rule.policy } : {}) };
  });
  return { path: `${config.site.base}.well-known/tdmrep.json`, content: json(rules),
    note: ['W3C TDM Reservation Protocol (TDMRep): states whether text and data mining rights are reserved, the opt-out of Article 4 of the EU copyright directive (2019/790).', ...placementNotes(config, '.well-known/tdmrep.json')].join(' ') };
}

// ---- /.well-known/gpc.json: Global Privacy Control ----
export function gpcFile(config: Config, settings: any): SiteFile {
  if (typeof settings.gpc !== 'boolean') fail('siteFiles.gpc.gpc must be true or false');
  const lastUpdate = settings.lastUpdate ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastUpdate)) fail('siteFiles.gpc.lastUpdate must be a date such as 2026-11-21');
  return { path: `${config.site.base}.well-known/gpc.json`, content: json({ gpc: settings.gpc, lastUpdate }),
    note: [`Global Privacy Control: ${settings.gpc ? 'states that the site honors the Sec-GPC: 1 signal. State it only if the site does' : 'states that the site does not claim to honor the signal'}.`, ...placementNotes(config, '.well-known/gpc.json')].join(' ') };
}

// ---- llms.txt: a Markdown index for language models (llmstxt.org) ----
export function llmsTxtFile(config: Config, settings: any): SiteFile {
  const s = settings === true ? {} : settings;
  const home = config.pages.find(p => p.key === (config.gallery.homeKey ?? config.pages[0].key));
  const proposal = (key: string) => config.proposed?.pages?.[key];
  const head = (file: string) => readHead(readFileSync(path.join(config.site.root, file), 'utf8'));
  const title = s.title ?? config.proposed?.website?.name ?? head(home.file).title;
  const summary = s.summary ?? proposal(home.key)?.description ?? head(home.file).meta.description;
  const sections = [...(s.pages === false ? [] : [{ heading: s.pagesHeading ?? 'Pages', links: config.pages.map(page => {
    const h = head(page.file);
    return { title: proposal(page.key)?.title ?? h.title, url: pageUrl(config, page, h.links.find(l => l.rel === 'canonical')?.href), notes: proposal(page.key)?.description ?? h.meta.description };
  }) }]), ...(s.sections ?? [])];
  const lines = [`# ${title}`, '', ...(summary ? [`> ${summary}`, ''] : []), ...(s.details ? [s.details, ''] : [])];
  for (const section of sections) {
    lines.push(`## ${section.heading}`, '', ...section.links.map((link: any) => `- [${link.title}](${link.url})${link.notes ? `: ${link.notes}` : ''}`), '');
  }
  return { path: `${config.site.base}llms.txt`, content: `${lines.join('\n').replace(/\n+$/, '')}\n`,
    note: 'llms.txt (llmstxt.org): a Markdown index of the site for language models. A proposal, not a standard: Google says its AI features need no such file; Chrome\'s experimental Lighthouse agentic browsing audit reads it.' };
}

// ---- ads.txt and app-ads.txt (IAB Tech Lab ads.txt 1.1) ----
export function adsTxtFile(config: Config, settings: any, name: 'ads.txt' | 'app-ads.txt'): SiteFile {
  const lines = [...[settings.comment ?? []].flat().map((text: string) => `# ${text}`)];
  if (settings.noSellers) lines.push('placeholder.example.com, placeholder, DIRECT, placeholder');
  for (const record of settings.records ?? []) {
    const [domain, account, relation, certification] = record;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain ?? '') || !account || !/^(DIRECT|RESELLER)$/i.test(relation ?? '')) fail(`siteFiles.${name === 'ads.txt' ? 'adsTxt' : 'appAdsTxt'}: a record must be [domain, account ID, "DIRECT" or "RESELLER", certification ID]: ${JSON.stringify(record)}`);
    lines.push([domain.toLowerCase(), account, relation.toUpperCase(), certification].filter(Boolean).join(', '));
  }
  if (!settings.noSellers && !(settings.records ?? []).length) fail(`siteFiles.${name === 'ads.txt' ? 'adsTxt' : 'appAdsTxt'}: give records, or noSellers: true for the placeholder record`);
  if (name === 'app-ads.txt' && settings.subdomains) fail('siteFiles.appAdsTxt: subdomains is unused in app-ads.txt (IAB Tech Lab app-ads.txt 1.0)');
  const variables: [string, unknown][] = [['CONTACT', settings.contact], ['OWNERDOMAIN', settings.ownerDomain], ['MANAGERDOMAIN', settings.managerDomain], ['INVENTORYPARTNERDOMAIN', settings.inventoryPartnerDomain], ['SUBDOMAIN', settings.subdomains]];
  for (const [variable, values] of variables) for (const value of [values ?? []].flat()) lines.push(`${variable}=${value}`);
  const notes = [name === 'ads.txt' ? 'ads.txt 1.1: the sellers authorized to sell this site\'s ad inventory.' : 'app-ads.txt: the sellers authorized for the apps whose store listings name this site as the developer website.'];
  if (settings.noSellers) notes.push('The placeholder record states that no seller is authorized; an empty file is deprecated.');
  if (name === 'ads.txt') notes.push(...placementNotes(config, 'ads.txt'));
  return { path: `${config.site.base}${name}`, content: `${lines.join('\n')}\n`, note: notes.join(' ') };
}

// ---- Apple universal links and Android App Links ----
export function appLinkFiles(config: Config, settings: any): SiteFile[] {
  const files: SiteFile[] = [];
  if (settings.apple) {
    const apple = settings.apple;
    for (const id of [...(apple.appIDs ?? []), ...(apple.webcredentials ?? []), ...(apple.appclips ?? [])]) if (!/^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/.test(id)) fail(`siteFiles.appLinks.apple: "${id}" is not <Team ID>.<bundle ID>`);
    const body: any = {};
    if (apple.appIDs?.length) body.applinks = { details: [{ appIDs: apple.appIDs, components: apple.components ?? [{ '/': '/*' }] }] };
    if (apple.webcredentials?.length) body.webcredentials = { apps: apple.webcredentials };
    if (apple.appclips?.length) body.appclips = { apps: apple.appclips };
    files.push({ path: `${config.site.base}.well-known/apple-app-site-association`, content: json(body),
      note: ['Apple associated domains: universal links open these paths in the app. The file has no extension and must be served over https with no redirects; Apple\'s CDN fetches it within 24 hours, and devices check about once a week.', ...placementNotes(config, '.well-known/apple-app-site-association')].join(' ') });
  }
  if (settings.android) {
    const statements = [settings.android].flat().map((app: any) => {
      for (const print of app.sha256 ?? []) if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(print)) fail(`siteFiles.appLinks.android: "${print}" is not a SHA-256 fingerprint in upper-case hex pairs`);
      if (!app.package || !(app.sha256 ?? []).length) fail('siteFiles.appLinks.android: each app needs package and sha256');
      return { relation: app.relations ?? ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: app.package, sha256_cert_fingerprints: app.sha256 } };
    });
    files.push({ path: `${config.site.base}.well-known/assetlinks.json`, content: json(statements),
      note: ['Android App Links: Android verifies that these apps may open the site\'s links.', ...placementNotes(config, '.well-known/assetlinks.json')].join(' ') });
  }
  return files;
}

// ---- The web app manifest ----
export function manifestFile(config: Config, settings: any): SiteFile {
  const at = settings.path ?? 'manifest.webmanifest';
  if (!settings.name && !settings.short_name) fail('siteFiles.manifest needs name or short_name');
  const depth = at.split('/').length - 1;
  const fromManifest = (publishAs: string) => `${'../'.repeat(depth)}${publishAs}`;
  // The rendered PNG icons of 144 px and more, except Apple's touch icon, which Apple devices read from the head.
  const icons = settings.icons ?? (config.icons?.files ?? []).filter((file: any) => /\.png$/i.test(file.publishAs) && file.size >= 144 && !/apple-touch-icon/.test(file.publishAs))
    .map((file: any) => ({ src: fromManifest(file.publishAs), sizes: `${file.size}x${file.size}`, type: 'image/png', ...(file.purpose ? { purpose: file.purpose } : {}) }));
  const { path: _path, icons: _icons, ...members } = settings;
  const manifest = { ...members, start_url: settings.start_url ?? (fromManifest('') || './'), display: settings.display ?? 'standalone', icons };
  return { path: `${config.site.base}${at}`, content: json(manifest),
    note: 'The web app manifest: the installed app\'s name, icons and display mode. Link it from each page with <link rel="manifest">.' };
}

// The workflow step's script: run by Node on GitHub's runner, it reads the changed pages from the push event, so it
// needs no checkout. DRY_RUN=1 prints the request instead of sending it, which is how it is tested here.
function submitScript(config: Config, keyLocation: string, waitSeconds: number) {
  return String.raw`import { readFileSync } from 'node:fs';
const SITE = '${config.site.url}';
const BASE = '${config.site.base}';
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const files = new Set((event.commits ?? []).flatMap(commit => [...(commit.added ?? []), ...(commit.modified ?? []), ...(commit.removed ?? [])]));
const urls = [...files].filter(file => file.startsWith(BASE) && file.endsWith('.html')).sort()
  .map(file => SITE + file.slice(BASE.length).replace(/(^|\/)index\.html$/, '$1'));
if (!urls.length) { console.log('No changed pages.'); process.exit(0); }
const body = { host: new URL(SITE).host, key: process.env.KEY, keyLocation: '${keyLocation}', urlList: [...new Set(urls)] };
console.log(JSON.stringify(body, null, 2));
if (process.env.DRY_RUN) process.exit(0);
// The host publishes the site after the push; give it time before asking the engines to recrawl.
await new Promise(resolve => setTimeout(resolve, ${waitSeconds * 1000}));
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
console.log('IndexNow answered ' + response.status + ' ' + response.statusText);
if (!response.ok) process.exit(1);
`;
}

export function indexNowFiles(config: Config, settings: any, out: string) {
  const keyName = settings.keyFile ?? 'indexnow.txt';
  if (keyName.includes('/')) console.log(`note: a key file in a folder covers only the addresses below that folder (${keyName}).`);
  const proposedKey = path.join(out, 'proposed-files', ...`${config.site.base}${keyName}`.split('/'));
  const key = (existsSync(proposedKey) ? readFileSync(proposedKey, 'utf8') : existing(config, keyName) ?? randomBytes(16).toString('hex')).trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) fail(`IndexNow key must be 8 to 128 letters, digits or dashes: ${keyName}`);
  const keyLocation = `${config.site.url}${keyName}`;
  const script = submitScript(config, keyLocation, settings.workflow?.waitSeconds ?? 120);
  const files: SiteFile[] = [{ path: `${config.site.base}${keyName}`, content: `${key}\n`,
    note: `The IndexNow key file. Every request names it as its keyLocation (${keyLocation}). The key proves the requests come from the site's owner and grants nothing else; a second run keeps it.` }];
  const workflow = settings.workflow === false ? null : settings.workflow ?? {};
  if (workflow) {
    const branch = workflow.branch ?? 'main';
    const setup = workflow.setupNode ? `      # The repository's pinned setup-node action.\n      - uses: ${workflow.setupNode}\n        with:\n          node-version: 22\n          package-manager-cache: false\n` : '';
    files.push({ path: workflow.path ?? '.github/workflows/indexnow.yml',
      note: `Runs on GitHub after a push to ${branch}; nothing runs in visitors' browsers. Its token can only read. When no page changed it ends at once; otherwise it waits ${settings.workflow?.waitSeconds ?? 120} s for the site to publish, then sends the changed pages' addresses. Check the repository's workflow rules before adding it.`,
      content: `name: IndexNow

# Tells the IndexNow search engines which pages a push to ${branch} changed, so they recrawl them. Only page addresses
# are sent. The changed pages come from the push event itself, so the workflow checks out nothing.
on:
${workflow.pullRequestEvent ? '  pull_request:\n' : ''}  push:
    branches: [${branch}]

permissions:
  contents: read

concurrency:
  group: indexnow
  cancel-in-progress: false

jobs:
  notify:
${workflow.pullRequestEvent ? "    if: github.event_name == 'push'\n" : ''}    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
${setup}      - name: Send the changed pages to IndexNow
        run: node --input-type=module -e "$INDEXNOW"
        env:
          KEY: ${key}
          INDEXNOW: |
${script.split('\n').map(line => (line ? `            ${line}` : '')).join('\n')}
` });
  }
  return { files, key, keyLocation, script };
}

// Runs the workflow's script against a sample push and checks which addresses it would send. Nothing is sent.
// The sample push changes the home page and one other page, adds a page, removes a page, and changes a stylesheet
// and the README; only the four pages may be sent.
export async function dryRunIndexNow(config: Config, script: string, key: string, keyLocation: string, out: string) {
  const B = config.site.base;
  const second = config.pages.map(p => p.file).find(file => file !== 'index.html') ?? 'about.html';
  const event = { commits: [
    { added: [`${B}new-page.html`], modified: [`${B}index.html`, `${B}styles/main.css`, 'README.md'], removed: [] },
    { added: [], modified: [`${B}${second}`, `${B}index.html`], removed: [`${B}old-page.html`] },
  ] };
  const sample = path.join(out, 'check', 'indexnow-sample-event.json');
  await mkdir(path.dirname(sample), { recursive: true });
  await writeFile(sample, `${JSON.stringify(event, null, 2)}\n`);
  const sent = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, GITHUB_EVENT_PATH: sample, KEY: key, DRY_RUN: '1' }, encoding: 'utf8' }));
  const expected = [config.site.url, `${config.site.url}new-page.html`, `${config.site.url}old-page.html`, `${config.site.url}${second.replace(/(^|\/)index\.html$/, '$1')}`].sort();
  const pass = JSON.stringify([...sent.urlList].sort()) === JSON.stringify(expected) && sent.keyLocation === keyLocation && sent.key === key;
  return { pass, sent, expected };
}

export async function buildSiteFiles(config: Config, out: string) {
  const settings = config.siteFiles;
  if (!settings) { console.log('No siteFiles configured.'); await writeData(out, 'proposed-files.js', 'PROPOSED_FILES', [], 'build-site-files.ts'); return { ok: true, files: [] }; }
  const files: SiteFile[] = [];
  if (settings.robots) files.push(robotsFile(config, settings.robots));
  if (settings.sitemap) files.push(sitemapFile(config, settings.sitemap));
  if (settings.securityTxt) files.push(securityFile(config, settings.securityTxt));
  if (settings.tdmRep) files.push(tdmRepFile(config, settings.tdmRep));
  if (settings.gpc) files.push(gpcFile(config, settings.gpc));
  if (settings.llmsTxt) files.push(llmsTxtFile(config, settings.llmsTxt));
  if (settings.adsTxt) files.push(adsTxtFile(config, settings.adsTxt, 'ads.txt'));
  if (settings.appAdsTxt) files.push(adsTxtFile(config, settings.appAdsTxt, 'app-ads.txt'));
  if (settings.appLinks) files.push(...appLinkFiles(config, settings.appLinks));
  if (settings.manifest) files.push(manifestFile(config, settings.manifest));
  let ok = true;
  if (settings.indexNow) {
    const result = indexNowFiles(config, settings.indexNow, out);
    files.push(...result.files);
    const dry = await dryRunIndexNow(config, result.script, result.key, result.keyLocation, out);
    console.log(`IndexNow dry run: ${dry.pass ? 'passed' : 'FAILED'}, ${dry.sent.urlList.length} pages: ${dry.sent.urlList.join(', ')}`);
    ok = dry.pass;
  }
  for (const file of files) {
    const target = path.join(out, 'proposed-files', ...file.path.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
    console.log(`proposed-files/${file.path}`);
  }
  await writeData(out, 'proposed-files.js', 'PROPOSED_FILES', files, 'build-site-files.ts');
  return { ok, files };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => (await buildSiteFiles(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)))).ok);
}
