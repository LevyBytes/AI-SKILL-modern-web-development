// Site file rules of the metadata audit: robots.txt, sitemaps, security.txt, llms.txt, ads.txt and app-ads.txt, the
// web app manifest, feeds, oEmbed, and the /.well-known files (TDMRep, GPC, app links, traffic advice, ARD, the
// Bluesky handle and change-password), plus search engine verification files. Every rule names its source in
// references/site-metadata; the audit only reads.
import { type Finding, type Report, absolute, collector, hreflangProblem, imageSizes, kib, parseJson, resolve, RFC3339, W3C_DATE } from './audit-common.ts';
import { type Head, imageInfo } from './shared.ts';

export interface PageState { key: string; file: string; url: string; head: Head; noindex: boolean; canonical: string | null }
export interface SiteState {
  siteUrl: string;
  atHostRoot: boolean;
  read(rel: string): Buffer | null;
  list(): string[];
  urlToRel(url: string): string | null;
  pages: PageState[];
}

// ---- robots.txt (RFC 9309 as Google reads it) ----
export interface RobotsGroup { agents: string[]; rules: { allow: boolean; path: string }[]; usage: { path: string; pref: string }[]; signals: string[] }
export interface Robots { groups: RobotsGroup[]; sitemaps: string[]; agentmaps: string[]; fields: string[]; problems: { level: 'error' | 'warn'; text: string }[] }

const product = (value: string) => value.trim().toLowerCase().split(/[\/\s]/)[0].replace(/\*+$/, '') || '*';

export function parseRobots(text: string): Robots {
  const robots: Robots = { groups: [], sitemaps: [], agentmaps: [], fields: [], problems: [] };
  let group: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const [index, raw] of text.replace(/^﻿/, '').split(/\r\n|\r|\n/).entries()) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) { robots.problems.push({ level: 'warn', text: `Line ${index + 1} is not a \`field: value\` line, so crawlers skip it: \`${line.slice(0, 60)}\`.` }); continue; }
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    robots.fields.push(field);
    if (field === 'user-agent') {
      if (!group || !lastWasAgent) { group = { agents: [], rules: [], usage: [], signals: [] }; robots.groups.push(group); }
      group.agents.push(product(value));
      lastWasAgent = true;
      continue;
    }
    if (field === 'sitemap') { robots.sitemaps.push(value); continue; }
    if (field === 'agentmap') { robots.agentmaps.push(value); continue; }
    lastWasAgent = false;
    if (['allow', 'disallow', 'content-usage', 'content-signal', 'crawl-delay'].includes(field) && !group) {
      robots.problems.push({ level: 'error', text: `Line ${index + 1} (\`${field}\`) comes before any \`User-agent\` line, so it belongs to no group and crawlers ignore it.` });
      continue;
    }
    if (field === 'allow' || field === 'disallow') {
      if (value && !value.startsWith('/') && !value.startsWith('*')) robots.problems.push({ level: 'warn', text: `Line ${index + 1}: the path \`${value}\` does not start with \`/\`; Google expects rule paths to start at the root.` });
      if (value) group.rules.push({ allow: field === 'allow', path: value });
    } else if (field === 'content-usage') {
      const at = value.startsWith('/') ? value.search(/[ \t]/) : -1;
      group.usage.push(at > 0 ? { path: value.slice(0, at), pref: value.slice(at).trim() } : { path: value.startsWith('/') ? value : '', pref: value.startsWith('/') ? '' : value });
    } else if (field === 'content-signal') group.signals.push(value);
  }
  return robots;
}

function matches(pattern: string, path: string) {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern).replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`).test(path);
}

// The groups that apply to a crawler: those naming its product token, else the fallback tokens' (Applebot follows
// Googlebot's rules when it is not named), else the * groups. Matching groups are combined.
export function groupsFor(robots: Robots, token: string, fallbacks: string[] = []) {
  for (const name of [token, ...fallbacks].map(t => t.toLowerCase())) {
    const named = robots.groups.filter(g => g.agents.includes(name));
    if (named.length) return named;
  }
  return robots.groups.filter(g => g.agents.includes('*'));
}

// Whether a crawler may fetch a path: the longest matching rule wins, and allow wins a tie (Google's precedence).
export function robotsAllows(robots: Robots, token: string, path: string, fallbacks: string[] = []): boolean {
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of groupsFor(robots, token, fallbacks).flatMap(g => g.rules)) {
    if (!matches(rule.path, path)) continue;
    const length = rule.path.length;
    if (!best || length > best.length || (length === best.length && rule.allow)) best = { allow: rule.allow, length };
  }
  return best ? best.allow : true;
}

// Crawler tokens with a documented purpose (references/site-metadata/ai-crawlers.md lists the sources).
export const CRAWLERS: Record<string, string> = {
  googlebot: 'Google Search', 'google-extended': 'training and grounding Gemini; not Google Search', bingbot: 'Bing search, and Bing AI through its page-level preferences',
  applebot: 'Apple search in Spotlight, Siri and Safari', 'applebot-extended': 'training Apple foundation models; it crawls nothing itself',
  gptbot: 'OpenAI model training', 'oai-searchbot': 'ChatGPT search results', 'chatgpt-user': 'pages fetched for a ChatGPT user',
  claudebot: 'Anthropic model training', 'claude-searchbot': 'Claude search results', 'claude-user': 'pages fetched for a Claude user',
  perplexitybot: 'Perplexity search results', 'perplexity-user': 'pages fetched for a Perplexity user; it generally ignores robots.txt',
  'oai-adsbot': 'checking pages submitted as ChatGPT ads', 'meta-externalagent': 'Meta AI model training and direct indexing',
  'meta-webindexer': 'Meta AI search citations', 'meta-externalads': 'Meta advertising products',
  'meta-externalfetcher': 'pages fetched for a Meta AI user; it may ignore robots.txt', facebookexternalhit: 'link previews in Facebook, Instagram and Messenger',
  ccbot: 'the Common Crawl open dataset, which many AI models train on',
  '__usage_ai-training': 'the shared AI-training preference token', twitterbot: 'X link cards',
};
const KNOWN_FIELDS = new Set(['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'content-signal', 'content-usage', 'agentmap', 'host', 'clean-param']);
const USAGE_KEYS = new Set(['train-ai', 'ai-use', 'search']);

export function checkRobots(text: string, site: SiteState, add: Report) {
  const S = 'robots.txt';
  if (!site.atHostRoot) add('error', S, `The site is served below the host's root (${site.siteUrl}). Crawlers read robots.txt only at the root of the host, so a file here has no effect; it belongs to the host's owner.`);
  const size = Buffer.byteLength(text, 'utf8');
  if (size > 500 * 1024) add('error', S, `The file is ${kib(size)}; Google ignores everything after the first 500 KiB.`);
  const robots = parseRobots(text);
  for (const problem of robots.problems) add(problem.level, S, problem.text);
  for (const field of new Set(robots.fields.filter(f => !KNOWN_FIELDS.has(f)))) add('warn', S, `\`${field}\` is not a robots.txt field any documented crawler reads; crawlers skip the line.`);
  if (robots.fields.includes('crawl-delay')) add('info', S, '`Crawl-delay` is ignored by Google and Applebot; Anthropic\'s crawlers read it.');
  if (robots.fields.includes('host') || robots.fields.includes('clean-param')) add('info', S, '`Host` and `Clean-param` are Yandex extensions; Google ignores them.');
  for (const map of robots.sitemaps) {
    if (!absolute(map)) { add('error', S, `\`Sitemap: ${map}\` is not an absolute URL; the field needs the full address.`); continue; }
    const rel = site.urlToRel(map);
    if (rel !== null && !site.read(rel)) add('error', S, `\`Sitemap: ${map}\` names a file the site does not have.`);
  }
  for (const map of robots.agentmaps) if (!absolute(map)) add('error', S, `\`Agentmap: ${map}\` is not an absolute URL.`);
  for (const group of robots.groups) {
    for (const signal of group.signals) {
      const parts = signal.split(',').map(p => p.trim()).filter(Boolean);
      const bad = parts.filter(p => !/^(search|ai-input|ai-train)\s*=\s*(yes|no)$/.test(p));
      add(bad.length ? 'error' : 'ok', S, bad.length ? `\`Content-Signal: ${signal}\`: ${bad.map(b => `\`${b}\``).join(', ')} is not \`search\`, \`ai-input\` or \`ai-train\` set to \`yes\` or \`no\`.` : `Content Signals for ${group.agents.join(', ')}: \`${signal}\`.`);
    }
    for (const usage of group.usage) {
      const items = usage.pref.split(',').map(p => p.trim()).filter(Boolean);
      const bad = items.filter(p => !/^[a-z0-9_.*-]+\s*=\s*[yn]$/.test(p));
      const unknown = items.map(p => p.split('=')[0].trim()).filter(k => !USAGE_KEYS.has(k));
      if (!items.length || bad.length) add('error', S, `\`Content-Usage: ${usage.path ? `${usage.path} ` : ''}${usage.pref}\` is not a list of \`category=y\` or \`category=n\`.`);
      else add(unknown.length ? 'warn' : 'ok', S, unknown.length ? `\`Content-Usage\` names ${unknown.map(u => `\`${u}\``).join(', ')}, outside the draft vocabulary (\`train-ai\`, \`ai-use\`, \`search\`).` : `IETF usage preference for ${group.agents.join(', ')}${usage.path ? ` on ${usage.path}` : ''}: \`${usage.pref}\`.`);
    }
  }
  for (const [token, purpose] of Object.entries(CRAWLERS)) {
    const named = robots.groups.some(g => g.agents.includes(token));
    if (!named || token === 'googlebot' || token === 'twitterbot' || token === 'facebookexternalhit') continue;
    add('info', S, `\`${token}\` (${purpose}): the home page is ${robotsAllows(robots, token, '/') ? 'allowed' : 'disallowed'}.`);
  }
  const blocked = site.pages.filter(page => !robotsAllows(robots, 'googlebot', new URL(page.url).pathname + new URL(page.url).search));
  if (!blocked.length && site.pages.length) add('ok', S, `${robots.groups.length} groups; Googlebot may crawl every configured page.`);
  for (const page of site.pages) {
    const path = new URL(page.url).pathname + new URL(page.url).search;
    if (!robotsAllows(robots, 'googlebot', path)) add(page.noindex ? 'error' : 'warn', S, page.noindex
      ? `${page.file} is disallowed for Googlebot, so Google never sees its \`noindex\` and can still list the address.`
      : `${page.file} is disallowed for Googlebot. Google can still list the address without a snippet; use \`noindex\` on a crawlable page to keep it out.`);
    if (!robotsAllows(robots, 'twitterbot', path)) add('error', S, `${page.file} is disallowed for Twitterbot, so X cannot read its card tags.`);
  }
  return robots;
}

// ---- Sitemaps (sitemaps.org, with Google's image, video and news extensions) ----
const tagText = (block: string, name: string) => block.match(new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`))?.[1] ?? null;

export function checkSitemap(text: string, rel: string, site: SiteState, add: Report, depth = 0) {
  const S = rel;
  const size = Buffer.byteLength(text, 'utf8');
  if (size > 50 * 1024 * 1024) add('error', S, `The file is ${Math.round(size / 1048576)} MB uncompressed; a sitemap may be at most 50 MB.`);
  if (/<sitemapindex\b/.test(text)) {
    const maps = [...text.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)].map(([, block]) => tagText(block, 'loc'));
    if (maps.length > 50000) add('error', S, `The index lists ${maps.length} sitemaps; at most 50,000.`);
    add('info', S, `A sitemap index of ${maps.length} sitemaps.`);
    for (const loc of maps) {
      if (!loc || !absolute(loc)) { add('error', S, `A \`<sitemap>\` entry has no absolute \`<loc>\`: \`${loc ?? ''}\`.`); continue; }
      const child = site.urlToRel(loc);
      const bytes = child !== null ? site.read(child) : null;
      if (child !== null && !bytes) add('error', S, `The index names ${loc}, which the site does not have.`);
      else if (bytes && depth === 0) checkSitemap(bytes.toString('utf8'), child, site, add, 1);
    }
    return new Set<string>();
  }
  if (!/<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(text)) add('error', S, 'The root element is not a `urlset` in the namespace `http://www.sitemaps.org/schemas/sitemap/0.9`.');
  const blocks = [...text.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => block);
  if (blocks.length > 50000) add('error', S, `${blocks.length} URLs; a sitemap may list at most 50,000. Split it and list the parts in a sitemap index.`);
  if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(text)) add('error', S, 'A raw `&` is not escaped; XML needs `&amp;`.');
  const host = new URL(site.siteUrl).host;
  const listed = new Set<string>();
  let ignored = 0;
  for (const block of blocks) {
    const loc = tagText(block, 'loc');
    if (!loc || !absolute(loc)) { add('error', S, `A \`<url>\` has no absolute \`<loc>\`: \`${loc ?? ''}\`.`); continue; }
    listed.add(loc);
    if (resolve(loc, site.siteUrl)?.host !== host) add('error', S, `${loc} is on another host; a sitemap lists addresses of its own host.`);
    const lastmod = tagText(block, 'lastmod');
    if (lastmod && !W3C_DATE.test(lastmod)) add('error', S, `\`<lastmod>${lastmod}</lastmod>\` for ${loc} is not a W3C date.`);
    else if (lastmod && new Date(lastmod).getTime() > Date.now() + 864e5) add('warn', S, `\`<lastmod>\` for ${loc} is in the future (${lastmod}); Google trusts lastmod only while it stays accurate.`);
    if (/<(changefreq|priority)>/.test(block)) ignored++;
    const images = [...block.matchAll(/<image:image>([\s\S]*?)<\/image:image>/g)];
    if (images.length > 1000) add('error', S, `${loc} lists ${images.length} images; Google reads up to 1,000 per URL.`);
    for (const [, image] of images) if (!tagText(image, 'image:loc')) add('error', S, `An \`<image:image>\` for ${loc} has no \`<image:loc>\`.`);
    for (const [, video] of block.matchAll(/<video:video>([\s\S]*?)<\/video:video>/g)) {
      const missing = ['video:thumbnail_loc', 'video:title', 'video:description'].filter(name => !tagText(video, name));
      if (!tagText(video, 'video:content_loc') && !tagText(video, 'video:player_loc')) missing.push('video:content_loc or video:player_loc');
      if (missing.length) add('error', S, `A video for ${loc} is missing ${missing.map(m => `\`<${m}>\``).join(', ')}.`);
    }
    for (const [, news] of block.matchAll(/<news:news>([\s\S]*?)<\/news:news>/g)) {
      const missing = ['news:name', 'news:language', 'news:publication_date', 'news:title'].filter(name => !tagText(news, name));
      if (missing.length) add('error', S, `A news entry for ${loc} is missing ${missing.map(m => `\`<${m}>\``).join(', ')}.`);
    }
    for (const [, attributes] of block.matchAll(/<xhtml:link\b([^>]*)\/?>/g)) {
      const code = /hreflang="([^"]*)"/.exec(attributes)?.[1];
      const problem = code ? hreflangProblem(code) : null;
      if (problem) add(problem.level, S, `Sitemap alternate for ${loc}: ${problem.text}`);
    }
  }
  if (ignored) add('info', S, `${ignored} entries carry \`changefreq\` or \`priority\`; Google ignores both.`);
  if (/xmlns:image=/.test(text)) add('info', S, 'Uses the image sitemap extension.');
  for (const page of site.pages) {
    const url = page.canonical ?? page.url;
    if (!listed.has(page.url) && !listed.has(url)) add('warn', S, `${page.file} (${url}) is not listed.`);
    if (listed.has(page.url) && page.noindex) add('error', S, `${page.file} is listed but has \`noindex\`; list only pages that should be indexed.`);
    if (page.canonical && page.canonical !== page.url && listed.has(page.url)) add('warn', S, `${page.url} is listed, but its canonical is ${page.canonical}; list the canonical address.`);
  }
  if (blocks.length && !site.pages.some(p => listed.has(p.url))) add('warn', S, 'None of the configured pages is listed.');
  else if (site.pages.every(p => listed.has(p.url) || listed.has(p.canonical ?? ''))) add('ok', S, `${blocks.length} URLs; every configured page is listed.`);
  return listed;
}

// ---- security.txt (RFC 9116) ----
const SECURITY_FIELDS = new Set(['contact', 'expires', 'encryption', 'acknowledgments', 'canonical', 'policy', 'hiring', 'preferred-languages', 'csaf']);
export function checkSecurityTxt(text: string, rel: string, site: SiteState, add: Report) {
  const S = rel;
  if (!rel.startsWith('.well-known/')) add('warn', S, 'RFC 9116 places the file at `/.well-known/security.txt`; `/security.txt` may only redirect there.');
  if (!site.atHostRoot) add('error', S, `The site is served below the host's root (${site.siteUrl}); \`/.well-known/\` belongs to the host's root, so security.txt must be published there.`);
  const signed = text.includes('-----BEGIN PGP SIGNED MESSAGE-----');
  const fields = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('-----') && /^[A-Za-z-]+:/.test(l))
    .map(l => ({ name: l.slice(0, l.indexOf(':')).toLowerCase(), value: l.slice(l.indexOf(':') + 1).trim() }));
  const all = (name: string) => fields.filter(f => f.name === name);
  if (!all('contact').length) add('error', S, 'No `Contact` field; RFC 9116 requires at least one.');
  for (const f of [...all('contact'), ...all('encryption'), ...all('acknowledgments'), ...all('policy'), ...all('hiring'), ...all('canonical'), ...all('csaf')]) {
    if (/^http:/i.test(f.value)) add('error', S, `\`${f.name}: ${f.value}\`: a web URI in security.txt must use https.`);
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(f.value)) add('error', S, `\`${f.name}: ${f.value}\` is not a URI.`);
  }
  const expires = all('expires');
  if (expires.length !== 1) add('error', S, `${expires.length ? 'More than one' : 'No'} \`Expires\` field; RFC 9116 requires exactly one.`);
  else if (!RFC3339.test(expires[0].value) || Number.isNaN(Date.parse(expires[0].value))) add('error', S, `\`Expires: ${expires[0].value}\` is not an RFC 3339 date and time.`);
  else {
    const left = Date.parse(expires[0].value) - Date.now();
    if (left <= 0) add('error', S, `Expired on ${expires[0].value}; researchers treat an expired file as stale.`);
    else add(left > 366 * 864e5 ? 'warn' : 'ok', S, left > 366 * 864e5 ? 'Expires more than a year away; RFC 9116 recommends less than a year.' : `Expires in ${Math.round(left / 864e5)} days.`);
  }
  if (all('preferred-languages').length > 1) add('error', S, '`Preferred-Languages` may appear only once.');
  const own = `${new URL(site.siteUrl).origin}/${rel}`;
  if (all('canonical').length && !all('canonical').some(f => f.value === own)) add('warn', S, `No \`Canonical\` field names this file's address (${own}).`);
  for (const name of new Set(fields.map(f => f.name).filter(n => !SECURITY_FIELDS.has(n)))) add('info', S, `\`${name}\` is not an RFC 9116 field; readers ignore fields they do not know.`);
  if (signed) add('info', S, 'The file is signed with OpenPGP cleartext signatures.');
}

// ---- llms.txt (llmstxt.org) ----
export function checkLlmsTxt(text: string, rel: string, site: SiteState, add: Report) {
  const S = rel;
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  const first = lines.find(l => l.trim());
  if (!first || !/^# \S/.test(first)) add('error', S, 'The file must start with an H1 (`# Name`); it is the only required section.');
  if (!lines.some(l => l.startsWith('> '))) add('info', S, 'No blockquote summary after the H1; the format recommends one.');
  let section = '';
  for (const line of lines) {
    if (/^## /.test(line)) section = line.slice(3).trim();
    else if (section && /^\s*[-*] /.test(line)) {
      const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(line);
      if (!link) { add('warn', S, `A list item under "${section}" has no \`[name](url)\` link: \`${line.trim().slice(0, 60)}\`.`); continue; }
      const target = resolve(link[2], new URL(rel, site.siteUrl).href);
      const local = target ? site.urlToRel(target.href) : null;
      if (local !== null && !site.read(local)) add('warn', S, `"${link[1]}" links to ${target.href}, which the site does not have.`);
    }
  }
  add('info', S, 'A proposal, not a standard. Google\'s guidance says AI features need no new machine-readable files; Lighthouse\'s experimental agentic browsing audit reads it.');
}

// ---- ads.txt and app-ads.txt (IAB Tech Lab ads.txt 1.1) ----
const ADS_VARIABLES = new Set(['contact', 'subdomain', 'inventorypartnerdomain', 'ownerdomain', 'managerdomain']);
export function checkAdsTxt(text: string, rel: string, site: SiteState, add: Report) {
  const S = rel;
  if (rel === 'ads.txt' && !site.atHostRoot) add('error', S, `ads.txt is read only at \`/ads.txt\` on the host; this site is served at ${site.siteUrl}.`);
  let records = 0;
  for (const [index, raw] of text.split(/\r\n|\r|\n/).entries()) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const variable = /^([A-Za-z]+)=(.*)$/.exec(line);
    if (variable) {
      if (!ADS_VARIABLES.has(variable[1].toLowerCase())) add('warn', S, `Line ${index + 1}: \`${variable[1]}\` is not an ads.txt 1.1 variable.`);
      else if (rel === 'app-ads.txt' && variable[1].toLowerCase() === 'subdomain') add('warn', S, `Line ${index + 1}: \`SUBDOMAIN\` is unused in app-ads.txt, and verifiers ignore it.`);
      continue;
    }
    const fields = line.split(',').map(f => f.trim());
    if (fields.length < 3 || fields.length > 4) { add('error', S, `Line ${index + 1} is not \`domain, account ID, DIRECT|RESELLER[, certification ID]\`: \`${line.slice(0, 80)}\`.`); continue; }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(fields[0]) && fields[0] !== 'placeholder.example.com') add('error', S, `Line ${index + 1}: \`${fields[0]}\` is not the advertising system's domain.`);
    if (!fields[1]) add('error', S, `Line ${index + 1}: the account ID is empty.`);
    if (!/^(direct|reseller)$/i.test(fields[2])) add('error', S, `Line ${index + 1}: the relationship must be \`DIRECT\` or \`RESELLER\`, not \`${fields[2]}\`.`);
    records++;
  }
  if (!records) add('warn', S, 'No records. A site with no authorized sellers uses the placeholder record `placeholder.example.com, placeholder, DIRECT, placeholder`; an empty file is deprecated.');
  else add(/placeholder\.example\.com/.test(text) ? 'info' : 'ok', S, /placeholder\.example\.com/.test(text) ? 'States that no seller is authorized (placeholder record).' : `${records} seller records.`);
}

// ---- The web app manifest (W3C Web Application Manifest; Chrome's install criteria) ----
export function checkManifest(text: string, rel: string, site: SiteState, add: Report) {
  const S = rel;
  const { value: m, error } = parseJson(text);
  if (error || !m || typeof m !== 'object') { add('error', S, `Not valid JSON: ${error ?? 'not an object'}.`); return; }
  const base = new URL(rel, site.siteUrl).href;
  if (!m.name && !m.short_name) add('error', S, 'Neither `name` nor `short_name`; Chrome needs one to install the app.');
  const display = m.display ?? 'browser';
  if (!['fullscreen', 'standalone', 'minimal-ui'].includes(display) && !(m.display_override ?? []).includes('window-controls-overlay')) add('warn', S, `\`display\` is \`${display}\`; Chrome installs only \`fullscreen\`, \`standalone\`, \`minimal-ui\` or \`window-controls-overlay\` apps.`);
  if (m.prefer_related_applications === true) add('warn', S, '`prefer_related_applications` is true, so Chrome offers the native app instead of installing the site.');
  const start = resolve(m.start_url ?? '.', base);
  if (!start || start.origin !== new URL(site.siteUrl).origin) add('error', S, `\`start_url\` ${m.start_url} is not on the site's origin.`);
  if (!m.start_url) add('warn', S, 'No `start_url`; Chrome\'s install criteria ask for one.');
  if (m.scope && start && !start.href.startsWith(new URL(m.scope, base).href)) add('error', S, `\`start_url\` is outside \`scope\` (${m.scope}), so browsers ignore the scope and fall back to the start URL's folder.`);
  if (!m.id) add('info', S, 'No `id`; the app is identified by its `start_url`, so changing that later makes it a different app.');
  const icons = Array.isArray(m.icons) ? m.icons : [];
  const declared = new Set(icons.flatMap((icon: any) => String(icon.sizes ?? '').split(/\s+/)));
  for (const size of ['192x192', '512x512']) if (!declared.has(size)) add('warn', S, `No ${size} icon; Chrome's install criteria ask for 192 and 512 pixel icons.`);
  for (const icon of icons) {
    const url = resolve(icon.src ?? '', base);
    const local = url ? site.urlToRel(url.href) : null;
    const file = local !== null ? site.read(local) : null;
    if (local !== null && !file) { add('error', S, `Icon ${icon.src} is not in the site.`); continue; }
    if (file) {
      const info = imageInfo(file);
      const sizes = imageSizes(info);
      for (const size of String(icon.sizes ?? '').split(/\s+/).filter(s => s && s !== 'any')) if (!sizes.includes(size)) add('error', S, `Icon ${icon.src} says ${size} but the file is ${sizes.join(', ') || 'of unknown size'}.`);
      if (icon.type && info.type !== 'unknown' && icon.type !== info.type) add('warn', S, `Icon ${icon.src} says \`${icon.type}\` but the file is \`${info.type}\`.`);
    }
    // An icon is used for each purpose it names that the spec defines, and ignored when it names none of them.
    const purposes = String(icon.purpose ?? 'any').toLowerCase().split(/\s+/).filter(Boolean);
    const unknown = purposes.filter(p => !['any', 'maskable', 'monochrome'].includes(p));
    if (unknown.length === purposes.length) add('error', S, `Icon ${icon.src}: \`${icon.purpose}\` names no icon purpose (any, maskable, monochrome), so browsers ignore the icon.`);
    else if (unknown.length) add('warn', S, `Icon ${icon.src}: \`${unknown.join(' ')}\` is not an icon purpose; the others still apply.`);
  }
  if (!icons.some((icon: any) => /maskable/i.test(icon.purpose ?? ''))) add('info', S, 'No maskable icon (`"purpose": "maskable"`), the form designed to be cropped to a platform\'s icon shape.');
  if (m.color_scheme_dark !== undefined) {
    const keys = m.color_scheme_dark && typeof m.color_scheme_dark === 'object' ? Object.keys(m.color_scheme_dark) : null;
    if (!keys) add('error', S, '`color_scheme_dark` must be an object of colors.');
    else for (const key of keys.filter(k => !['theme_color', 'background_color'].includes(k))) add('warn', S, `\`color_scheme_dark.${key}\` is ignored; only \`theme_color\` and \`background_color\` can change for a dark theme.`);
  }
  if (m.theme_color || m.background_color) add('ok', S, `Colors: theme ${m.theme_color ?? 'unset'}, background ${m.background_color ?? 'unset'}${m.color_scheme_dark ? `; dark theme ${JSON.stringify(m.color_scheme_dark)}` : ''}.`);
}

// ---- Feeds: RSS 2.0, Atom (RFC 4287) and JSON Feed 1.1 ----
export function checkFeed(text: string, rel: string, add: Report) {
  const S = rel;
  // WebSub (W3C): a publisher that names a hub also gives exactly one rel="self" link, the topic URL subscribers use.
  const websub = (head: string) => {
    if (!/<(?:atom:)?link\b[^>]*\brel=["']hub["']/.test(head)) return;
    const selves = (head.match(/<(?:atom:)?link\b[^>]*\brel=["']self["']/g) ?? []).length;
    if (selves !== 1) add('warn', S, `Names a WebSub hub but has ${selves} \`rel="self"\` links; WebSub needs exactly one, the topic URL.`);
    else add('info', S, 'Names a WebSub hub and its topic URL, so subscribers get updates pushed.');
  };
  const trimmed = text.replace(/^﻿/, '').trimStart();
  if (trimmed.startsWith('{')) {
    const { value: f, error } = parseJson(trimmed);
    if (error) { add('error', S, `JSON Feed is not valid JSON: ${error}.`); return; }
    for (const key of ['version', 'title', 'items']) if (f[key] === undefined) add('error', S, `JSON Feed needs \`${key}\`.`);
    for (const key of ['home_page_url', 'feed_url']) if (!f[key]) add('warn', S, `JSON Feed: \`${key}\` is strongly recommended.`);
    for (const [index, item] of (Array.isArray(f.items) ? f.items : []).entries()) {
      if (!item.id) add('error', S, `Item ${index + 1} has no \`id\`; readers discard it.`);
      if (item.content_html === undefined && item.content_text === undefined) add('error', S, `Item ${index + 1} needs \`content_html\` or \`content_text\`.`);
    }
    add('ok', S, `JSON Feed with ${(f.items ?? []).length} items.`);
    return;
  }
  if (/<rss\b/.test(trimmed)) {
    const channel = /<channel>([\s\S]*?)<\/channel>/.exec(trimmed)?.[1] ?? '';
    const head = channel.split(/<item\b/)[0];
    for (const name of ['title', 'link', 'description']) if (!new RegExp(`<${name}>`).test(head)) add('error', S, `RSS: the channel needs \`<${name}>\`.`);
    const items = [...channel.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)].map(([, b]) => b);
    for (const [index, item] of items.entries()) if (!/<title>/.test(item) && !/<description>/.test(item)) add('error', S, `RSS item ${index + 1} needs a \`<title>\` or a \`<description>\`.`);
    websub(head);
    add('ok', S, `RSS 2.0 with ${items.length} items.`);
    return;
  }
  if (/<feed\b[^>]*xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/.test(trimmed)) {
    const head = trimmed.split(/<entry\b/)[0];
    for (const name of ['id', 'title', 'updated']) if (!new RegExp(`<${name}\\b`).test(head)) add('error', S, `Atom: the feed needs \`<${name}>\`.`);
    const entries = [...trimmed.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)].map(([, b]) => b);
    const feedAuthor = /<author\b/.test(head);
    for (const [index, entry] of entries.entries()) {
      const missing = ['id', 'title', 'updated'].filter(name => !new RegExp(`<${name}\\b`).test(entry));
      if (missing.length) add('error', S, `Atom entry ${index + 1} needs ${missing.map(m => `\`<${m}>\``).join(', ')}.`);
      if (!feedAuthor && !/<author\b/.test(entry)) add('error', S, `Atom entry ${index + 1} has no \`<author>\`, and neither has the feed.`);
    }
    for (const [, date] of trimmed.matchAll(/<(?:updated|published)>([^<]*)</g)) if (!RFC3339.test(date.trim())) add('error', S, `Atom date \`${date.trim()}\` is not RFC 3339.`);
    if (!/<link\b[^>]*\brel=["']self["']/.test(head)) add('info', S, 'Atom: no `<link rel="self">`; RFC 4287 recommends one with the feed\'s own URL.');
    websub(head);
    add('ok', S, `Atom with ${entries.length} entries.`);
    return;
  }
  add('error', S, 'Not an RSS 2.0, Atom or JSON Feed document.');
}

// ---- oEmbed (oembed.com) ----
export function checkOembed(text: string, rel: string, add: Report) {
  const { value: o, error } = parseJson(text);
  if (error) { add('error', rel, `oEmbed response is not valid JSON: ${error}.`); return; }
  if (!['photo', 'video', 'link', 'rich'].includes(o.type)) add('error', rel, `oEmbed \`type\` must be photo, video, link or rich, not \`${o.type}\`.`);
  if (o.version !== '1.0') add('error', rel, 'oEmbed `version` must be the string `1.0`.');
  const need = o.type === 'photo' ? ['url', 'width', 'height'] : ['video', 'rich'].includes(o.type) ? ['html', 'width', 'height'] : [];
  for (const key of need) if (o[key] === undefined) add('error', rel, `A ${o.type} response needs \`${key}\`.`);
  const thumbs = ['thumbnail_url', 'thumbnail_width', 'thumbnail_height'].filter(key => o[key] !== undefined);
  if (thumbs.length && thumbs.length < 3) add('error', rel, '`thumbnail_url`, `thumbnail_width` and `thumbnail_height` go together; Discord ignores a thumbnail without both sizes.');
}

// ---- /.well-known files ----
const APP_ID = /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/;
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
export function checkWellKnown(rel: string, bytes: Buffer, site: SiteState, add: Report) {
  const name = rel.slice('.well-known/'.length);
  const text = bytes.toString('utf8');
  const S = rel;
  if (!site.atHostRoot) add('error', S, `\`/.well-known/\` belongs to the root of the host (RFC 8615); this site is served at ${site.siteUrl}, so clients will not find the file.`);
  const json = () => {
    const { value, error } = parseJson(text);
    if (error) add('error', S, `Not valid JSON: ${error}.`);
    return error ? null : value;
  };
  if (name === 'apple-app-site-association.json') add('error', S, 'Apple reads `apple-app-site-association` without an extension.');
  if (name === 'apple-app-site-association') {
    const v = json();
    if (!v) return;
    const details = v.applinks?.details ?? [];
    if (v.applinks && !Array.isArray(details)) add('error', S, '`applinks.details` must be an array.');
    for (const detail of Array.isArray(details) ? details : []) {
      const ids = detail.appIDs ?? (detail.appID ? [detail.appID] : []);
      if (!ids.length) add('error', S, 'An `applinks` detail has no `appIDs`.');
      for (const id of ids) if (!APP_ID.test(id)) add('error', S, `\`${id}\` is not \`<Team ID>.<bundle ID>\` (a 10-character team ID, a dot, then the bundle ID).`);
      if (!detail.components && !detail.paths) add('error', S, 'An `applinks` detail has no `components`.');
      if (detail.paths && !detail.components) add('info', S, '`paths` is the older form; current Apple documentation uses `components`.');
    }
    for (const service of ['webcredentials', 'appclips']) for (const id of v[service]?.apps ?? []) if (!APP_ID.test(id)) add('error', S, `${service}: \`${id}\` is not \`<Team ID>.<bundle ID>\`.`);
    add('info', S, 'Serve it over https with a valid certificate and no redirects. Apple\'s CDN fetches it within 24 hours; devices check about once a week.');
  } else if (name === 'assetlinks.json') {
    const v = json();
    if (!v) return;
    if (!Array.isArray(v)) { add('error', S, 'assetlinks.json is a JSON array of statements.'); return; }
    for (const statement of v) {
      if (!Array.isArray(statement.relation) || !statement.relation.length) add('error', S, 'A statement has no `relation` list.');
      const target = statement.target ?? {};
      if (target.namespace === 'android_app') {
        if (!target.package_name) add('error', S, 'An android_app target has no `package_name`.');
        for (const print of target.sha256_cert_fingerprints ?? []) if (!FINGERPRINT.test(print)) add('error', S, `\`${print}\` is not a SHA-256 fingerprint (32 upper-case hex pairs separated by colons).`);
        if (!(target.sha256_cert_fingerprints ?? []).length) add('error', S, `${target.package_name ?? 'A target'} has no \`sha256_cert_fingerprints\`.`);
      } else if (target.namespace !== 'web') add('error', S, `Target namespace \`${target.namespace}\` is neither \`android_app\` nor \`web\`.`);
    }
  } else if (name === 'tdmrep.json') {
    const v = json();
    if (!v) return;
    if (!Array.isArray(v)) { add('error', S, 'tdmrep.json is a JSON array of rules.'); return; }
    for (const rule of v) {
      if (typeof rule.location !== 'string') add('error', S, 'A TDMRep rule has no `location`.');
      if (![0, 1].includes(rule['tdm-reservation'])) add('error', S, '`tdm-reservation` must be 1 (rights reserved) or 0.');
      if (rule['tdm-policy'] && !absolute(rule['tdm-policy'])) add('error', S, '`tdm-policy` must be a URL.');
    }
    add('info', S, `TDMRep: text and data mining rights are ${v.some((r: any) => r['tdm-reservation'] === 1) ? 'reserved' : 'not reserved'} for the matching paths.`);
  } else if (name === 'gpc.json') {
    const v = json();
    if (!v) return;
    if (typeof v.gpc !== 'boolean') add('error', S, '`gpc` must be true or false.');
    if (v.lastUpdate && !/^\d{4}-\d{2}-\d{2}$/.test(v.lastUpdate)) add('error', S, '`lastUpdate` must be a date such as 2026-11-21.');
    if (v.gpc === true) add('info', S, 'States that the site honors Global Privacy Control signals (`Sec-GPC: 1`). Only state it if the site does.');
  } else if (name === 'traffic-advice') {
    const v = json();
    if (!v) return;
    if (!Array.isArray(v)) { add('error', S, 'Traffic advice is a JSON array.'); return; }
    for (const entry of v) {
      if (typeof entry.user_agent !== 'string') add('error', S, 'An entry has no `user_agent` string, so agents skip it.');
      if (entry.fraction !== undefined && !(typeof entry.fraction === 'number' && entry.fraction >= 0 && entry.fraction <= 1)) add('error', S, '`fraction` must be a number from 0 to 1.');
    }
    add('info', S, 'Served as `application/trafficadvice+json`; a static host may need its content type set.');
  } else if (name === 'ard.json' || name === 'ai-catalog.json') {
    if (name === 'ai-catalog.json') add('warn', S, 'ARD replaced `/.well-known/ai-catalog.json` with `/.well-known/ard.json`.');
    const v = json();
    if (!v) return;
    const entries = Array.isArray(v.entries) ? v.entries : null;
    if (!entries) { add('error', S, 'The manifest needs an `entries` array.'); return; }
    for (const entry of entries) {
      for (const key of ['identifier', 'displayName', 'type']) if (!entry[key]) add('error', S, `An entry has no \`${key}\`.`);
      if (entry.identifier && !/^urn:air:[^:]+:.+/.test(entry.identifier)) add('error', S, `\`${entry.identifier}\` is not a \`urn:air:<publisher>:<name>\` identifier.`);
      if ((entry.url === undefined) === (entry.data === undefined)) add('error', S, `${entry.identifier ?? 'An entry'} needs exactly one of \`url\` and \`data\`.`);
      if (!Array.isArray(entry.representativeQueries)) add('warn', S, `${entry.identifier ?? 'An entry'} has no \`representativeQueries\`; registries cannot find it by search.`);
    }
    add('info', S, `Agentic Resource Discovery manifest with ${entries.length} entries; ARD is a proposal.`);
  } else if (name === 'atproto-did') {
    if (!/^did:(plc|web):\S+$/.test(text.trim())) add('error', S, 'The file must hold only a DID, such as `did:plc:...`.');
    else add('ok', S, `Bluesky handle verification for ${new URL(site.siteUrl).host}: ${text.trim()}.`);
  } else if (name === 'change-password' || name === 'change-password/index.html') {
    const refresh = /<meta\b[^>]*http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>]+)/i.exec(text);
    add(refresh ? 'ok' : 'warn', S, refresh ? `Sends password managers to ${refresh[1]}.` : 'Serve a 302, 303 or 307 redirect to the change-password form, or a page with a meta refresh to it.');
  } else if (name === 'security.txt') {
    checkSecurityTxt(text, rel, site, add);
  } else {
    add('info', S, `\`/.well-known/${name}\` is not one the audit checks.`);
  }
}

// ---- Search engine verification files ----
export function checkVerificationFile(rel: string, bytes: Buffer, add: Report) {
  const text = bytes.toString('utf8').trim();
  const google = /^google[0-9a-f]+\.html$/.exec(rel);
  if (google) add(text === `google-site-verification: ${rel}` ? 'ok' : 'error', rel, text === `google-site-verification: ${rel}` ? 'Google Search Console verification file. Google keeps checking it: removing it unverifies the owner.' : `A Google verification file must hold exactly \`google-site-verification: ${rel}\`.`);
  else if (rel === 'BingSiteAuth.xml') add(/<user>[^<]+<\/user>/.test(text) ? 'ok' : 'error', rel, /<user>[^<]+<\/user>/.test(text) ? 'Bing Webmaster Tools XML verification file.' : 'BingSiteAuth.xml has no `<user>` code.');
  else if (/^pinterest-[0-9a-f]+\.html$/.test(rel)) add('ok', rel, 'Pinterest website claim file.');
}

export function auditSiteFiles(site: SiteState) {
  const { findings, add } = collector();
  const files = site.list();
  const text = (rel: string) => site.read(rel)?.toString('utf8') ?? null;
  const robots = text('robots.txt');
  let parsed: Robots | null = null;
  if (robots !== null) parsed = checkRobots(robots, site, add);
  else add('info', 'robots.txt', 'No robots.txt. Crawlers treat a missing file as no restrictions.');
  const maps = new Set([...(parsed?.sitemaps ?? []).map(url => site.urlToRel(url)).filter((r): r is string => r !== null), ...(files.includes('sitemap.xml') ? ['sitemap.xml'] : [])]);
  for (const rel of maps) { const t = text(rel); if (t !== null) checkSitemap(t, rel, site, add); }
  if (!maps.size) add('warn', 'sitemap.xml', 'No sitemap. Name one in robots.txt and submit it to Search Console and Bing Webmaster Tools.');
  if (text('security.txt') !== null && !files.includes('.well-known/security.txt')) checkSecurityTxt(text('security.txt'), 'security.txt', site, add);
  if (!files.includes('.well-known/security.txt') && !files.includes('security.txt')) add('info', '.well-known/security.txt', 'No security.txt (RFC 9116), so researchers have no published contact for vulnerabilities.');
  for (const rel of files.filter(f => f.startsWith('.well-known/'))) checkWellKnown(rel, site.read(rel), site, add);
  // Jekyll, which GitHub Pages can run, leaves out files and folders whose names start with "." unless its include
  // setting lists them (Jekyll configuration options; GitHub Docs, About GitHub Pages and Jekyll).
  const jekyll = text('_config.yml');
  if (jekyll !== null && !files.includes('.nojekyll') && files.some(f => f.startsWith('.well-known/'))) {
    const include = /^include\s*:(.*(?:\n(?:[ \t-].*)?)*)/m.exec(jekyll)?.[1] ?? '';
    if (!include.includes('.well-known')) add('warn', '.well-known/', 'The site has a Jekyll `_config.yml` whose `include` setting does not list `.well-known`, so Jekyll leaves the folder out of the built site. Add it to `include`.');
  }
  if (text('llms.txt') !== null) checkLlmsTxt(text('llms.txt'), 'llms.txt', site, add);
  for (const rel of ['ads.txt', 'app-ads.txt']) if (text(rel) !== null) checkAdsTxt(text(rel), rel, site, add);
  for (const rel of files.filter(f => !f.includes('/'))) checkVerificationFile(rel, site.read(rel), add);
  // Files the pages link: the manifest, feeds and oEmbed responses, each checked once.
  const linked = new Map<string, string>();
  for (const page of site.pages) {
    for (const link of page.head.links) {
      const rel = String(link.rel ?? '').toLowerCase().split(/\s+/);
      const type = String(link.type ?? '').toLowerCase();
      const kind = rel.includes('manifest') ? 'manifest' : rel.includes('alternate') && /rss\+xml|atom\+xml|feed\+json/.test(type) ? 'feed' : rel.includes('alternate') && /json\+oembed/.test(type) ? 'oembed' : null;
      if (!kind || !link.href) continue;
      const url = resolve(link.href, page.url);
      const local = url ? site.urlToRel(url.href) : null;
      if (local === null) continue;
      if (!site.read(local)) { add('error', local, `${page.file} links this ${kind}, but the site does not have it.`); continue; }
      linked.set(local, kind);
    }
  }
  for (const [rel, kind] of linked) {
    const t = text(rel);
    if (kind === 'manifest') checkManifest(t, rel, site, add);
    else if (kind === 'feed') checkFeed(t, rel, add);
    else checkOembed(t, rel, add);
  }
  if (!files.includes('favicon.ico')) add('info', 'favicon.ico', 'No /favicon.ico. Browsers request it when a page names no icon.');
  return { findings, robots: parsed };
}

export type { Finding };
