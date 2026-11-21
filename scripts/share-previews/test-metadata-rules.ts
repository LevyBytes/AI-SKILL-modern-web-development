// Unit checks of the metadata audit's rules and parsers, with positive cases and negative controls that must be
// caught: image headers, XMP, hreflang codes, robots.txt matching and syntax, sitemaps, security.txt, app link files,
// ads.txt, the manifest, feeds, oEmbed, head tags and structured data, and the site file builders' refusals.
// test-share-previews.ts runs these after the end-to-end build.
import { collector, type Finding, hreflangProblem } from './audit-common.ts';
import { auditSiteFiles, checkAdsTxt, checkFeed, checkManifest, checkOembed, checkSecurityTxt, checkSitemap, checkWellKnown, parseRobots, robotsAllows, type SiteState } from './audit-files.ts';
import { auditHead, isNoindex } from './audit-head.ts';
import { auditStructuredData } from './audit-structured-data.ts';
import { adsTxtFile, appLinkFiles, robotsFile } from './build-site-files.ts';
import { icoFromPngs, SAFE_ZONE_PADDING } from './render-icons.ts';
import { type Config, embedXmp, imageInfo, imageMetadata, readHead, xmpPacket } from './shared.ts';

type Check = (name: string, ok: boolean, detail?: string) => void;
const has = (findings: Finding[], level: string, text: string) => findings.some(f => f.level === level && f.text.includes(text));
const show = (findings: Finding[]) => findings.map(f => `${f.level} ${f.text}`).join(' | ');

const SITE = 'https://example.com/';
// The message a refused call throws, or '' when it does not throw.
function refusal(call: () => unknown): string {
  try { call(); } catch (error) { return error instanceof Error ? error.message : String(error); }
  return '';
}
function memorySite(files: Record<string, string | Buffer>, pages: { key: string; file: string }[] = []): SiteState {
  const read = (rel: string) => (files[rel] === undefined ? null : Buffer.isBuffer(files[rel]) ? files[rel] as Buffer : Buffer.from(files[rel] as string));
  const urlToRel = (url: string) => {
    if (!url.startsWith(SITE)) return null;
    const rest = decodeURIComponent(url.slice(SITE.length).replace(/[?#].*$/, ''));
    return !rest || rest.endsWith('/') ? `${rest}index.html` : rest;
  };
  const site: SiteState = { siteUrl: SITE, atHostRoot: true, read, list: () => Object.keys(files).sort(), urlToRel, pages: [] };
  site.pages = pages.map(page => {
    const head = readHead(String(files[page.file]));
    const url = new URL(page.file.replace(/(^|\/)index\.html$/, '$1'), SITE).href;
    const href = head.links.find(l => l.rel === 'canonical')?.href;
    return { key: page.key, file: page.file, url, head, noindex: isNoindex(head.tags), canonical: href ? new URL(href, url).href : null };
  });
  return site;
}
const page = (head: string, body = '') => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${head}\n</head>\n<body>${body}</body>\n</html>\n`;

function png(width: number, height: number) {
  const bytes = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(bytes, 0);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

export function testMetadataRules(check: Check) {
  // ---- Image headers ----
  const gif = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.from([0x40, 0x01, 0xf0, 0x00]), Buffer.alloc(8)]);
  const webp = Buffer.alloc(32);
  webp.write('RIFF', 0, 'latin1'); webp.write('WEBPVP8X', 8, 'latin1'); webp.writeUIntLE(1199, 24, 3); webp.writeUIntLE(629, 27, 3);
  const bmp = Buffer.alloc(30); bmp.write('BM', 0, 'latin1'); bmp.writeInt32LE(64, 18); bmp.writeInt32LE(-48, 22);
  const avif = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypavif', 'latin1'), Buffer.alloc(12), Buffer.from('ispe', 'latin1'), Buffer.alloc(4), Buffer.from([0, 0, 3, 0x20, 0, 0, 1, 0xa4])]);
  const ico = icoFromPngs([{ size: 16, bytes: png(16, 16) }, { size: 256, bytes: png(256, 256) }]);
  const sizes = [imageInfo(gif), imageInfo(webp), imageInfo(bmp), imageInfo(avif), imageInfo(ico)].map(i => `${i.type} ${i.width}x${i.height}`);
  check('image headers: GIF, WebP, BMP, AVIF and ICO sizes', JSON.stringify(sizes) === JSON.stringify(['image/gif 320x240', 'image/webp 1200x630', 'image/bmp 64x48', 'image/avif 800x420', 'image/x-icon 256x256']), sizes.join(', '));
  const corner = ((1 - 2 * SAFE_ZONE_PADDING) / 2) * Math.SQRT2;
  check('maskable icons: the default padding keeps a square source inside the safe zone circle (radius 0.4)', corner <= 0.4 && corner > 0.39, String(corner));
  check('image headers: an ICO lists every size', JSON.stringify(imageInfo(ico).sizes) === JSON.stringify(['16x16', '256x256']), JSON.stringify(imageInfo(ico).sizes));
  const svg = imageInfo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64"></svg>'));
  check('image headers: an SVG size from its viewBox', svg.width === 96 && svg.height === 64, JSON.stringify(svg));

  // ---- XMP ----
  const fields = { creator: 'A & B', creditText: 'Credit "quoted"', copyrightNotice: 'Copyright <2026>', webStatement: 'https://example.com/license', licensorUrl: 'https://example.com/buy', digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia' };
  const tagged = embedXmp(png(4, 4), xmpPacket(fields));
  check('XMP: written into a PNG and read back field for field', JSON.stringify(imageMetadata(tagged).fields) === JSON.stringify(fields), JSON.stringify(imageMetadata(tagged).fields));
  check('XMP: writing again replaces the packet', (embedXmp(tagged, xmpPacket({ creator: 'C' })).toString('latin1').match(/XML:com\.adobe\.xmp/g) ?? []).length === 1);
  check('negative control: a digital source type that is not an IPTC code is refused', refusal(() => xmpPacket({ digitalSourceType: 'ai' })).includes('IPTC NewsCodes URI'));

  // ---- hreflang codes ----
  const codes = ['en', 'en-GB', 'zh-Hant-TW', 'x-default', 'en-UK', 'en_US', 'iw', 'es-419', 'xx'].map(code => hreflangProblem(code)?.level ?? 'ok');
  check('hreflang codes: valid, United Kingdom, underscore, deprecated, UN M.49 and unknown', JSON.stringify(codes) === JSON.stringify(['ok', 'ok', 'ok', 'ok', 'error', 'error', 'error', 'warn', 'error']), codes.join(','));

  // ---- robots.txt ----
  const robots = parseRobots('User-agent: *\nDisallow: /\nAllow: /p\nDisallow: /*.pdf$\n\nUser-agent: Googlebot\nUser-agent: Twitterbot\nDisallow: /private/\nAllow: /private/ok\nDisallow: /folder\nAllow: /folder\n');
  const cases = [['other', '/page'], ['other', '/x'], ['other', '/p/file.pdf'], ['googlebot', '/private/x'], ['googlebot', '/private/ok/y'], ['googlebot', '/folder/page'], ['applebot', '/private/x']]
    .map(([agent, path]) => robotsAllows(robots, agent, path, agent === 'applebot' ? ['googlebot'] : []));
  check('robots.txt: longest match wins, allow wins a tie, $ anchors, groups combine, Applebot falls back to Googlebot', JSON.stringify(cases) === JSON.stringify([true, false, false, false, true, true, false]), JSON.stringify(cases));
  const robotSite = memorySite({ 'robots.txt': 'Disallow: /early\nUser-agent: *\nContent-Signal: search=maybe\nContent-Usage: train-ai=x\nUnknown-field: 1\nUser-agent: Twitterbot\nDisallow: /\n', 'index.html': page('<title>T</title>') }, [{ key: 'home', file: 'index.html' }]);
  const robotFindings = auditSiteFiles(robotSite).findings;
  check('negative control: robots.txt rule before any group, bad signals, unknown field, Twitterbot blocked', has(robotFindings, 'error', 'before any `User-agent`') && has(robotFindings, 'error', 'Content-Signal: search=maybe')
    && has(robotFindings, 'error', 'Content-Usage: train-ai=x') && has(robotFindings, 'warn', '`unknown-field`') && has(robotFindings, 'error', 'disallowed for Twitterbot'), show(robotFindings));
  const gpcFile = '{"gpc": true, "lastUpdate": "2026-11-21"}';
  const jekyllSkips = auditSiteFiles(memorySite({ '_config.yml': 'title: T\nexclude:\n  - .well-known\n', '.well-known/gpc.json': gpcFile, 'index.html': page('<title>T</title>') }, [{ key: 'home', file: 'index.html' }])).findings;
  const jekyllKeeps = auditSiteFiles(memorySite({ '_config.yml': 'title: T\ninclude:\n  - .well-known\n', '.well-known/gpc.json': gpcFile, 'index.html': page('<title>T</title>') }, [{ key: 'home', file: 'index.html' }])).findings;
  check('negative control: a Jekyll site whose include setting leaves out .well-known, and one that lists it', has(jekyllSkips, 'warn', 'Jekyll leaves the folder out') && !has(jekyllKeeps, 'warn', 'Jekyll leaves the folder out'), show(jekyllSkips));
  const config = { site: { root: '.', url: SITE, base: '' }, siteFiles: {}, pages: [] } as unknown as Config;
  check('negative control: a crawler choice other than allow or disallow is refused', refusal(() => robotsFile({ ...config, site: { ...config.site, root: '/nonexistent' } } as Config, { crawlers: { GPTBot: 'maybe' } })).includes('must be "allow" or "disallow"'));

  // ---- Sitemaps ----
  const sitemapSite = memorySite({ 'index.html': page('<title>Home</title>\n<meta name="robots" content="noindex">'), 'a.html': page('<title>A</title>') }, [{ key: 'home', file: 'index.html' }, { key: 'a', file: 'a.html' }]);
  const map = collector();
  checkSitemap('<?xml version="1.0"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://example.com/</loc><lastmod>2026-11-21T10:00</lastmod></url>\n<url><loc>https://other.example/x</loc></url>\n<url><loc>https://example.com/?a=1&b=2</loc></url>\n</urlset>', 'sitemap.xml', sitemapSite, map.add);
  check('negative control: sitemap with a noindex page, a bad date, another host, a raw ampersand and a missing page', has(map.findings, 'error', 'has `noindex`') && has(map.findings, 'error', 'not a W3C date')
    && has(map.findings, 'error', 'on another host') && has(map.findings, 'error', 'raw `&`') && has(map.findings, 'warn', 'a.html'), show(map.findings));

  // ---- security.txt ----
  const sec = collector();
  checkSecurityTxt('Contact: http://example.com/report\nExpires: 2020-01-01T00:00:00Z\nExpires: 2030-01-01T00:00:00Z\n', '.well-known/security.txt', memorySite({}), sec.add);
  const noContact = collector();
  checkSecurityTxt('Expires: 2020-01-01T00:00:00.000Z\n', '.well-known/security.txt', memorySite({}), noContact.add);
  check('negative control: security.txt with an http contact, two Expires, an expired date and no contact', has(sec.findings, 'error', 'must use https') && has(sec.findings, 'error', 'More than one `Expires`')
    && has(noContact.findings, 'error', 'No `Contact`') && has(noContact.findings, 'error', 'Expired'), show([...sec.findings, ...noContact.findings]));

  // ---- /.well-known files ----
  const wk = collector();
  const wkSite = memorySite({});
  checkWellKnown('.well-known/apple-app-site-association', Buffer.from('{"applinks":{"details":[{"appIDs":["bad.id"],"components":[{"/":"/*"}]}]}}'), wkSite, wk.add);
  checkWellKnown('.well-known/assetlinks.json', Buffer.from('[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.example","sha256_cert_fingerprints":["14:6D:E9"]}}]'), wkSite, wk.add);
  checkWellKnown('.well-known/tdmrep.json', Buffer.from('[{"location":"/","tdm-reservation":2}]'), wkSite, wk.add);
  checkWellKnown('.well-known/gpc.json', Buffer.from('{"gpc":"yes"}'), wkSite, wk.add);
  checkWellKnown('.well-known/ard.json', Buffer.from('{"entries":[{"identifier":"weather","displayName":"W","type":"application/mcp-server-card+json","url":"https://example.com/a","data":{}}]}'), wkSite, wk.add);
  checkWellKnown('.well-known/atproto-did', Buffer.from('example.com'), wkSite, wk.add);
  check('negative control: bad app ID, fingerprint, TDMRep value, GPC value, ARD entry and atproto DID', ['not `<Team ID>.<bundle ID>`', 'not a SHA-256 fingerprint', '`tdm-reservation` must be', '`gpc` must be true or false', 'not a `urn:air:', 'exactly one of `url` and `data`', 'only a DID']
    .every(text => has(wk.findings, 'error', text)), show(wk.findings));
  const goodWk = collector();
  checkWellKnown('.well-known/apple-app-site-association', Buffer.from('{"applinks":{"details":[{"appIDs":["ABCDE12345.com.example.app"],"components":[{"/":"/buy/*"}]}]},"webcredentials":{"apps":["ABCDE12345.com.example.app"]}}'), wkSite, goodWk.add);
  check('app links: a valid apple-app-site-association passes', !goodWk.findings.some(f => f.level === 'error'), show(goodWk.findings));
  check('negative control: the builder refuses an app ID without a team ID', refusal(() => appLinkFiles(config, { apple: { appIDs: ['com.example.app'] } })).includes('is not <Team ID>.<bundle ID>'));

  // ---- ads.txt ----
  const ads = collector();
  checkAdsTxt('google.com, pub-1, PARTNER\nexample\nCONTACT=ads@example.com\n', 'ads.txt', memorySite({}), ads.add);
  const emptyAds = collector();
  checkAdsTxt('# nothing\n', 'ads.txt', memorySite({}), emptyAds.add);
  check('negative control: ads.txt with a bad relationship, a malformed line, and an empty file', has(ads.findings, 'error', '`DIRECT` or `RESELLER`') && has(ads.findings, 'error', 'Line 2') && has(emptyAds.findings, 'warn', 'placeholder'), show([...ads.findings, ...emptyAds.findings]));
  check('negative control: the builder refuses a bad ads.txt record', refusal(() => adsTxtFile(config, { records: [['google.com', 'pub-1', 'OWNER']] }, 'ads.txt')).includes('a record must be'));
  check('negative control: the builder refuses SUBDOMAIN in app-ads.txt', refusal(() => adsTxtFile(config, { noSellers: true, subdomains: ['shop.example.com'] }, 'app-ads.txt')).includes('unused in app-ads.txt'));
  const appAds = collector();
  checkAdsTxt('placeholder.example.com, placeholder, DIRECT, placeholder\nSUBDOMAIN=shop.example.com\n', 'app-ads.txt', memorySite({}), appAds.add);
  check('negative control: the audit flags SUBDOMAIN in app-ads.txt', has(appAds.findings, 'warn', 'unused in app-ads.txt'), show(appAds.findings));

  // ---- Manifest, feeds and oEmbed ----
  const man = collector();
  checkManifest('{"display":"browser","start_url":"https://other.example/","icons":[{"src":"icon.png","sizes":"192x192","purpose":"round"}]}', 'manifest.webmanifest', memorySite({ 'icon.png': png(64, 64) }), man.add);
  check('negative control: manifest without a name, browser display, foreign start_url, wrong icon size and purpose', ['Neither `name`', 'not on the site\'s origin', 'says 192x192 but the file is 64x64', 'names no icon purpose'].every(text => has(man.findings, 'error', text)) && has(man.findings, 'warn', '`display` is `browser`'), show(man.findings));
  const man2 = collector();
  checkManifest('{"name":"A","display":"standalone","start_url":"/app/","scope":"/other/","icons":[{"src":"icon.png","sizes":"64x64","purpose":"maskable round"}],"color_scheme_dark":{"theme_color":"#000","text_color":"#fff"}}', 'manifest.webmanifest', memorySite({ 'icon.png': png(64, 64) }), man2.add);
  check('negative control: start_url outside scope, a partly unknown purpose, and an unthemeable dark color', has(man2.findings, 'error', 'ignore the scope') && has(man2.findings, 'warn', '`round` is not an icon purpose; the others still apply')
    && has(man2.findings, 'warn', '`color_scheme_dark.text_color` is ignored') && !has(man2.findings, 'error', 'names no icon purpose'), show(man2.findings));
  const feeds = collector();
  checkFeed('<rss version="2.0"><channel><title>T</title><link>https://example.com/</link><item><link>x</link></item></channel></rss>', 'rss.xml', feeds.add);
  checkFeed('<feed xmlns="http://www.w3.org/2005/Atom"><id>x</id><title>T</title><updated>2026-11-21</updated><entry><title>E</title><updated>2026-11-21T00:00:00Z</updated></entry></feed>', 'atom.xml', feeds.add);
  checkFeed('{"version":"https://jsonfeed.org/version/1.1","title":"T","items":[{"content_text":"x"}]}', 'feed.json', feeds.add);
  check('negative control: RSS without a description, Atom entry without id or author, a bad Atom date, JSON Feed item without id', has(feeds.findings, 'error', 'channel needs `<description>`') && has(feeds.findings, 'error', 'item 1 needs a `<title>`')
    && has(feeds.findings, 'error', 'entry 1 needs `<id>`') && has(feeds.findings, 'error', 'has no `<author>`') && has(feeds.findings, 'error', 'not RFC 3339') && has(feeds.findings, 'error', 'Item 1 has no `id`'), show(feeds.findings));
  const hub = collector();
  checkFeed('<feed xmlns="http://www.w3.org/2005/Atom"><id>x</id><title>T</title><updated>2026-11-21T00:00:00Z</updated><author><name>A</name></author><link rel="hub" href="https://hub.example/"/></feed>', 'atom.xml', hub.add);
  check('negative control: an Atom feed with a WebSub hub and no rel="self" link', has(hub.findings, 'warn', 'has 0 `rel="self"` links') && has(hub.findings, 'info', 'RFC 4287 recommends one'), show(hub.findings));
  const oembed = collector();
  checkOembed('{"type":"rich","version":"1.0","html":"<iframe></iframe>","thumbnail_url":"https://example.com/t.png"}', 'oembed.json', oembed.add);
  check('negative control: oEmbed rich response without width and height, and a half-given thumbnail', has(oembed.findings, 'error', 'needs `width`') && has(oembed.findings, 'error', 'go together'), show(oembed.findings));

  // ---- Head tags ----
  const filler = `<!-- ${'x'.repeat(1100)} -->`;
  const headHtml = `<!doctype html>\n<html>\n<head>\n${filler}\n<meta charset="utf-8">\n<title>A</title>\n<title>B</title>\n<meta name="robots" content="noindex, max-image-preview:huge, ai-training:disallow">\n`
    + '<meta property="og:title" content="T">\n<meta property="og:type" content="website">\n<meta property="og:url" content="https://example.com/">\n<meta property="og:image" content="https://example.com/share.svg">\n'
    + `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image:alt" content="${'a'.repeat(421)}">\n`
    + '<meta name="fediverse:creator" content="user@server">\n<meta name="apple-itunes-app" content="app-argument=https://example.com/">\n<link rel="icon" href="wide.png">\n<link rel="canonical" href="https://example.com/">\n'
    + '<script type="application/ld+json">{ "@context": "https://schema.org", "@type": "Event", "name": "E", "startDate": "next week" }</script>\n<script type="application/ld+json">{ broken </script>\n</head>\n<body></body>\n</html>\n';
  const headSite = memorySite({ 'index.html': headHtml, 'share.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"></svg>', 'wide.png': png(64, 32) }, [{ key: 'home', file: 'index.html' }]);
  const head = collector();
  auditHead({ page: headSite.pages[0], html: headHtml, site: headSite, robots: null, isHome: true }, head.add);
  auditStructuredData(headSite.pages[0].head.ld, { url: SITE, isHome: true, siteUrl: SITE }, head.add);
  const expected = [['error', 'within the first 1024 bytes'], ['error', '2 `<title>` elements'], ['error', 'max-image-preview takes'], ['warn', 'Bing AI preference'], ['error', 'The share image is SVG'],
    ['error', 'but the file is 1200 x 600'], ['error', 'X takes at most 420'], ['error', '`fediverse:creator`'], ['error', 'needs `app-id='], ['error', 'Google needs a square favicon'], ['error', 'JSON-LD block 2'],
    ['error', '`startDate` `next week`'], ['warn', 'not eligible for Google\'s event results'], ['warn', 'No `<html lang>`']];
  const missing = expected.filter(([level, text]) => !has(head.findings, level, text));
  check('negative control: head with a late charset, two titles, bad robots values, an SVG share image, size mismatch, long X alt text, bad identity and app tags, a non-square icon, broken and invalid JSON-LD', missing.length === 0, `missing ${JSON.stringify(missing)}: ${show(head.findings)}`);

  // ---- hreflang reciprocity ----
  const en = page('<title>EN</title>\n<link rel="canonical" href="https://example.com/">\n<link rel="alternate" hreflang="en" href="https://example.com/">\n<link rel="alternate" hreflang="de" href="https://example.com/de.html">');
  const de = page('<title>DE</title>\n<link rel="canonical" href="https://example.com/de.html">\n<link rel="alternate" hreflang="de" href="https://example.com/de.html">');
  const langSite = memorySite({ 'index.html': en, 'de.html': de }, [{ key: 'en', file: 'index.html' }, { key: 'de', file: 'de.html' }]);
  const lang = collector();
  auditHead({ page: langSite.pages[0], html: en, site: langSite, robots: null, isHome: true }, lang.add);
  check('negative control: an hreflang pair without a return link', has(lang.findings, 'error', 'does not link back'), show(lang.findings));

  // ---- C2PA manifests for the HTML document ----
  const twoC2pa = page('<title>C</title>\n<link rel="c2pa-manifest" href="https://example.com/page.c2pa" type="application/x-c2pa-manifest-store">\n<script type="application/c2pa">AAAA</script>');
  const oneC2pa = page('<title>C</title>\n<link rel="c2pa-manifest" href="https://example.com/page.c2pa" type="application/c2pa">\n<link rel="ai-catalog" href="https://example.com/.well-known/ai-catalog.json">');
  const c2paSite = memorySite({ 'index.html': twoC2pa, 'one.html': oneC2pa }, [{ key: 'two', file: 'index.html' }, { key: 'one', file: 'one.html' }]);
  const c2paTwo = collector();
  const c2paOne = collector();
  auditHead({ page: c2paSite.pages[0], html: twoC2pa, site: c2paSite, robots: null, isHome: true }, c2paTwo.add);
  auditHead({ page: c2paSite.pages[1], html: oneC2pa, site: c2paSite, robots: null, isHome: false }, c2paOne.add);
  check('negative control: two C2PA associations in one head and a deprecated manifest type are caught', has(c2paTwo.findings, 'error', '2 C2PA manifest associations') && has(c2paTwo.findings, 'warn', 'application/x-c2pa-manifest-store'), show(c2paTwo.findings));
  const feedHtml = page('<title>F</title>\n<link rel="Alternate" type="application/RSS+xml" href="/feed.rss">\n<link rel="alternate" type="application/atom+xml" href="https://example.com/feed.atom">');
  const feedSite = memorySite({ 'index.html': feedHtml }, [{ key: 'home', file: 'index.html' }]);
  const feedHead = collector();
  auditHead({ page: feedSite.pages[0], html: feedHtml, site: feedSite, robots: null, isHome: true }, feedHead.add);
  check('negative control: an RSS link with a capitalized rel and type, a relative href and two untitled feeds', has(feedHead.findings, 'warn', 'exactly "alternate"') && has(feedHead.findings, 'warn', 'must be lowercase')
    && has(feedHead.findings, 'info', 'is relative') && has(feedHead.findings, 'warn', 'share a title'), show(feedHead.findings));
  check('C2PA: one referenced manifest is reported, not flagged', has(c2paOne.findings, 'info', 'C2PA manifest for the HTML document') && !c2paOne.findings.some(f => f.subject === 'C2PA' && f.level !== 'info'), show(c2paOne.findings));
  check('negative control: the retired rel="ai-catalog" link is flagged', has(c2paOne.findings, 'warn', 'ARD replaced rel="ai-catalog"'), show(c2paOne.findings));

  // ---- Structured data features ----
  const sd = collector();
  auditStructuredData([{ '@context': 'https://schema.org', '@graph': [
    { '@type': 'FAQPage', mainEntity: [] },
    { '@type': 'Product', name: 'P', offers: { '@type': 'Offer', price: 'ten', priceCurrency: 'dollars' } },
    { '@type': 'Review', author: { '@type': 'Person', name: 'R' }, itemReviewed: { '@type': 'Thing', name: 'T' }, reviewRating: { '@type': 'Rating', ratingValue: 7 } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'A' }, { '@type': 'ListItem', position: 2, name: 'B' }] },
    { '@type': 'Restaurant', name: 'Harbour Cafe' },
  ] }], { url: SITE, isHome: false, siteUrl: SITE }, sd.add);
  check('structured data: FAQ is reported retired, and a bad price, currency, rating and breadcrumb are caught', has(sd.findings, 'info', 'FAQ rich results') && has(sd.findings, 'error', 'price `ten`') && has(sd.findings, 'error', 'ISO 4217')
    && has(sd.findings, 'error', 'outside 1 to 5') && has(sd.findings, 'warn', 'only the last item may leave out `item`'), show(sd.findings));
  check('negative control: a Restaurant without an address is not eligible for local business results', has(sd.findings, 'warn', 'local business: it needs `address`'), show(sd.findings));
}
