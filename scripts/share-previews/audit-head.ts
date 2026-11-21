// Head rules of the metadata audit: the character encoding, language, title, description, canonical address, robots
// rules for every crawler that reads them, hreflang alternates, Open Graph, X cards, the share image and icons, and
// the tags for Apple devices, identity, verification and AI preferences. Sources are in references/site-metadata.
import { type Report, absolute, bytes, chars, hreflangProblem, imageSizes, ISO_DATE, kib, resolve } from './audit-common.ts';
import { type PageState, type Robots, type SiteState, robotsAllows } from './audit-files.ts';
import { type Tag, imageInfo, imageMetadata } from './shared.ts';

export interface HeadContext { page: PageState; html: string; site: SiteState; robots: Robots | null; isHome: boolean }

// Robots rules each crawler documents. Values are case-insensitive; several may be comma-separated or in several tags.
const GOOGLE_RULES = new Set(['all', 'noindex', 'nofollow', 'none', 'nosnippet', 'indexifembedded', 'notranslate', 'noimageindex', 'nopagereadaloud', 'index', 'follow']);
const GOOGLE_RETIRED: Record<string, string> = { noarchive: 'Google no longer uses `noarchive`', nocache: 'Google does not use `nocache`', nositelinkssearchbox: 'Google no longer uses `nositelinkssearchbox`' };
const BING_AI = new Set(['ai-training:disallow', 'ai-grounding:disallow', 'ai-grounding:disallowextended']);
const ROBOTS_NAMES = new Set(['robots', 'googlebot', 'googlebot-news', 'bingbot', 'applebot', 'google']);
const OG_TYPES = new Set(['website', 'article', 'book', 'profile', 'music.song', 'music.album', 'music.playlist', 'music.radio_station', 'video.movie', 'video.episode', 'video.tv_show', 'video.other', 'payment.link']);
const OG_SINGLE = ['og:title', 'og:type', 'og:url', 'og:description', 'og:site_name', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:site', 'twitter:creator'];
const REFERRER = new Set(['no-referrer', 'no-referrer-when-downgrade', 'same-origin', 'origin', 'strict-origin', 'origin-when-cross-origin', 'strict-origin-when-cross-origin', 'unsafe-url']);

const metaTags = (tags: Tag[], name: string) => tags.filter(t => t.tag === 'meta' && (t.name ?? t.property ?? '').toLowerCase() === name.toLowerCase());
const firstMeta = (tags: Tag[], name: string) => metaTags(tags, name)[0]?.content;

function localImage(ctx: HeadContext, reference: string | undefined) {
  if (!reference) return null;
  const url = resolve(reference, ctx.page.url);
  const rel = url ? ctx.site.urlToRel(url.href) : null;
  const file = rel !== null ? ctx.site.read(rel) : null;
  return { url, rel, file, info: file ? imageInfo(file) : null };
}

function checkRobotsMeta(ctx: HeadContext, add: Report) {
  const { head } = ctx.page;
  const tags = [...head.tags, ...head.bodyMeta].filter(t => t.tag === 'meta' && ROBOTS_NAMES.has((t.name ?? '').toLowerCase()));
  if (head.bodyMeta.some(t => ROBOTS_NAMES.has((t.name ?? '').toLowerCase()))) add('info', 'robots', 'A robots meta tag sits in the body. Google reads it there too; other crawlers may read only the head.');
  const values: string[] = [];
  for (const tag of tags) {
    const name = (tag.name ?? '').toLowerCase();
    for (const raw of String(tag.content ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean)) {
      values.push(raw);
      const [rule, ...rest] = raw.split(':');
      const arg = rest.join(':').trim();
      if (BING_AI.has(raw.replace(/\s+/g, ''))) {
        if (name !== 'bingbot') add('warn', 'robots', `\`${raw}\` is a Bing AI preference; Bing documents it in \`<meta name="Bingbot">\`, not \`${name}\`.`);
        else add('ok', 'robots', `Bing AI preference: \`${raw}\` (in force from 1 February 2027).`);
      } else if (GOOGLE_RULES.has(rule) && !arg) {
        if (['index', 'follow', 'all'].includes(rule)) add('info', 'robots', `\`${rule}\` is the default and needs no tag.`);
      } else if (GOOGLE_RETIRED[rule]) {
        add('info', 'robots', `${GOOGLE_RETIRED[rule]}${rule === 'noarchive' || rule === 'nocache' ? '. Bing reads it as an AI control until its new AI preferences replace it; sites relying on it have until 1 March 2027 to set them' : ''}.`);
      } else if (rule === 'max-snippet' || rule === 'max-video-preview') {
        if (!/^-?\d+$/.test(arg)) add('error', 'robots', `\`${raw}\`: ${rule} takes a number (-1 for no limit, 0 for none).`);
      } else if (rule === 'max-image-preview') {
        if (!['none', 'standard', 'large'].includes(arg)) add('error', 'robots', `\`${raw}\`: max-image-preview takes none, standard or large.`);
      } else if (rule === 'unavailable_after') {
        if (Number.isNaN(Date.parse(arg))) add('error', 'robots', `\`${raw}\`: Google reads unavailable_after dates in RFC 822, RFC 850 or ISO 8601 format.`);
        else if (Date.parse(arg) < Date.now()) add('warn', 'robots', `\`${raw}\` is in the past, so Google drops the page from results.`);
      } else add('warn', 'robots', `\`${raw}\` in \`<meta name="${name}">\` is not a rule Google, Bing or Applebot documents.`);
    }
  }
  const noindex = values.some(v => v === 'noindex' || v === 'none');
  if (noindex && values.some(v => /^max-image-preview:\s*large$/.test(v))) add('warn', 'robots', '`noindex` with `max-image-preview:large`: the page is kept out of results, so the preview size never applies.');
  if (ctx.isHome && !values.some(v => /^max-image-preview:\s*large$/.test(v)) && !noindex) add('info', 'robots', 'No `max-image-preview:large`, so Google Discover shows at most a small thumbnail for this page.');
  if (values.some(v => v === 'nosnippet')) add('info', 'robots', '`nosnippet` also keeps the page out of Google\'s AI Overviews and AI Mode text and out of Apple\'s AI answers.');
}

function checkHreflang(ctx: HeadContext, add: Report) {
  const { page, site } = ctx;
  const links = page.head.links.filter(l => String(l.rel ?? '').toLowerCase().split(/\s+/).includes('alternate') && l.hreflang);
  if (!links.length) return;
  const S = 'hreflang';
  const seen = new Map<string, string>();
  for (const link of links) {
    const problem = hreflangProblem(link.hreflang);
    if (problem) add(problem.level, S, problem.text);
    if (!absolute(link.href ?? '')) add('error', S, `\`${link.hreflang}\` points to \`${link.href}\`; hreflang URLs must be fully qualified.`);
    const code = link.hreflang.toLowerCase();
    if (seen.has(code) && seen.get(code) !== link.href) add('error', S, `\`${link.hreflang}\` names two different URLs.`);
    seen.set(code, link.href);
  }
  const self = page.canonical ?? page.url;
  if (!links.some(l => resolve(l.href, page.url)?.href === self || resolve(l.href, page.url)?.href === page.url)) add('error', S, 'The alternates do not include this page itself; each version lists every version, itself included.');
  if (links.length > 1 && !seen.has('x-default')) add('info', S, 'No `x-default` for visitors whose language matches none of the versions.');
  for (const link of links) {
    const target = resolve(link.href, page.url)?.href;
    const other = site.pages.find(p => p.url === target || p.canonical === target);
    if (!other || other.key === page.key) continue;
    const back = other.head.links.some(l => String(l.rel ?? '').toLowerCase().includes('alternate') && l.hreflang && [page.url, self].includes(resolve(l.href, other.url)?.href ?? ''));
    if (!back) add('error', S, `${other.file} does not link back to this page, so Google ignores the pair.`);
  }
  const own = links.find(l => [page.url, self].includes(resolve(l.href, page.url)?.href ?? ''));
  if (own && page.head.lang && own.hreflang.split('-')[0].toLowerCase() !== page.head.lang.split('-')[0].toLowerCase()) add('warn', S, `This page's own alternate says \`${own.hreflang}\` but \`<html lang>\` says \`${page.head.lang}\`.`);
}

function checkShareImage(ctx: HeadContext, add: Report) {
  const m = ctx.page.head.meta;
  const S = 'share image';
  const og = localImage(ctx, m['og:image']);
  const tw = localImage(ctx, m['twitter:image'] ?? m['twitter:image:src']) ?? og;
  if (og && !absolute(m['og:image'])) add('warn', S, `\`og:image\` is relative (\`${m['og:image']}\`); Open Graph readers expect an absolute URL.`);
  if (og?.url && og.url.protocol === 'http:' && new URL(ctx.page.url).protocol === 'https:') add('warn', S, '`og:image` uses http on an https page; give an https address.');
  if (og?.rel !== null && og && !og.file) add('error', S, `\`og:image\` ${og.url?.href} is not in the site.`);
  const info = og?.info;
  if (info && og.file) {
    if (info.type === 'image/svg+xml') add('error', S, 'The share image is SVG. X documents JPG, PNG, WEBP and GIF only; use a JPEG or PNG.');
    if (info.width && info.width < 150) add('warn', S, `The share image is ${info.width} px wide; Apple Messages ignores images under 150 px or shows them as icons.`);
    else if (info.width && info.width < 900) add('warn', S, `The share image is ${info.width} px wide; Apple asks for at least 900 px for Messages previews.`);
    if (og.file.length >= 600 * 1024) add('warn', S, `The share image is ${kib(og.file.length)}; WhatsApp asks for under 600 KB.`);
    if (og.file.length > 5 * 1024 * 1024) add('error', S, `The share image is ${kib(og.file.length)}; X takes images under 5 MB.`);
    const declaredW = Number(m['og:image:width']);
    const declaredH = Number(m['og:image:height']);
    if (m['og:image:width'] && info.width && (declaredW !== info.width || declaredH !== info.height)) add('error', S, `\`og:image:width\`/\`height\` say ${declaredW} x ${declaredH}, but the file is ${info.width} x ${info.height}.`);
    if (m['og:image:type'] && info.type !== 'unknown' && m['og:image:type'] !== info.type) add('error', S, `\`og:image:type\` says \`${m['og:image:type']}\`, but the file is \`${info.type}\`.`);
    if (ctx.isHome && info.width && info.height && (info.width < 1200 || info.width * info.height <= 300000)) add('info', S, `At ${info.width} x ${info.height}, Discover shows no large image; it needs at least 1200 px wide and more than 300,000 pixels.`);
    const meta = imageMetadata(og.file);
    if (meta.gps) add('warn', S, 'The image\'s EXIF data holds a GPS position, which anyone who downloads it can read. Strip it unless the location is meant to be public.');
    if (meta.c2pa) add('info', S, 'The image carries a C2PA manifest. Google may show it in About this image when the signer uses C2PA 2.1 or later with a certificate on the C2PA Trust List.');
    const fields = Object.entries(meta.fields);
    if (fields.length) add('ok', S, `IPTC photo metadata: ${fields.map(([k, v]) => `${k} "${v}"`).join(', ')}.`);
    if (!meta.fields.webStatement) add('info', S, 'No IPTC Web Statement of Rights, which Google Images needs for the Licensable badge; it matters only for images others may license.');
  }
  // X cards
  const card = m['twitter:card'];
  const X = 'X card';
  if (card && !['summary', 'summary_large_image', 'app', 'player'].includes(card)) add('error', X, `\`twitter:card\` \`${card}\` is not summary, summary_large_image, app or player.`);
  if (!card && (m['og:title'] || m['og:image'])) add('info', X, 'No `twitter:card`. X can still show a summary card from Open Graph tags; set `summary_large_image` for the large card.');
  if ((card || m['og:title']) && !m['twitter:site'] && !m['twitter:site:id']) add('warn', X, 'No `twitter:site`. X\'s card reference lists it (or `twitter:site:id`) as required; give the site\'s X account.');
  for (const name of ['twitter:site', 'twitter:creator']) if (m[name] && !/^@\w{1,15}$/.test(m[name])) add('warn', X, `\`${name}\` \`${m[name]}\` is not an @username.`);
  for (const [name, limit] of [['twitter:title', 70], ['twitter:description', 200], ['twitter:image:alt', 420]] as [string, number][]) {
    if (m[name] && chars(m[name]) > limit) add(name === 'twitter:image:alt' ? 'error' : 'warn', X, `\`${name}\` has ${chars(m[name])} characters; X takes at most ${limit}.`);
  }
  const twInfo = tw?.info;
  if (twInfo && tw.file && (card === 'summary_large_image' || card === 'summary')) {
    const [minW, minH] = card === 'summary' ? [144, 144] : [300, 157];
    if (twInfo.width && twInfo.height && (twInfo.width < minW || twInfo.height < minH)) add('error', X, `The ${card} image is ${twInfo.width} x ${twInfo.height}; X needs at least ${minW} x ${minH}.`);
    if (twInfo.width && twInfo.height && (twInfo.width > 4096 || twInfo.height > 4096)) add('error', X, `The image is ${twInfo.width} x ${twInfo.height}; X takes at most 4096 x 4096.`);
    if (card === 'summary_large_image' && twInfo.width && twInfo.height && Math.abs(twInfo.width / twInfo.height - 2) > 0.1) add('info', X, `The image is ${(twInfo.width / twInfo.height).toFixed(2)}:1; X shows large cards at 2:1 and crops the rest.`);
    if (twInfo.type === 'image/gif') add('info', X, 'X shows only the first frame of an animated GIF.');
    if (twInfo.width && twInfo.height) add('ok', X, `\`${card}\` with a ${twInfo.width} x ${twInfo.height} ${twInfo.type.replace('image/', '').toUpperCase()} image.`);
  }
  if (card === 'player') {
    for (const name of ['twitter:player', 'twitter:player:width', 'twitter:player:height', 'twitter:image']) if (!m[name]) add('error', X, `A player card needs \`${name}\`.`);
    if (m['twitter:player'] && !/^https:/.test(m['twitter:player'])) add('error', X, '`twitter:player` must be an https URL.');
    add('info', X, 'Player cards need X\'s approval before they show.');
  }
  if (card === 'app') {
    if (!['twitter:app:id:iphone', 'twitter:app:id:ipad', 'twitter:app:id:googleplay'].some(name => m[name])) add('error', X, 'An app card needs at least one `twitter:app:id:` tag.');
    for (const name of ['twitter:app:id:iphone', 'twitter:app:id:ipad']) if (m[name] && /^id/i.test(m[name])) add('error', X, `\`${name}\` takes the numeric App Store ID without the "id" prefix.`);
  }
}

function checkIcons(ctx: HeadContext, add: Report) {
  const { head } = ctx.page;
  const S = 'icons';
  const icons = head.links.filter(l => /(^|\s)icon(\s|$)/i.test(l.rel ?? ''));
  const touch = head.links.filter(l => /apple-touch-icon/i.test(l.rel ?? ''));
  if (!icons.length) add('warn', S, 'No `<link rel="icon">`; Google shows a favicon from it in results, and browsers fall back to /favicon.ico.');
  const raster: string[] = [];
  for (const link of icons) {
    const image = localImage(ctx, link.href);
    if (!image) continue;
    if (image.rel !== null && !image.file) { add('error', S, `Icon ${link.href} is not in the site.`); continue; }
    const info = image.info;
    if (!info) continue;
    if (info.type !== 'image/svg+xml') raster.push(link.href);
    if (info.width && info.height && info.width !== info.height) add('error', S, `Icon ${link.href} is ${info.width} x ${info.height}; Google needs a square favicon.`);
    if (info.width && info.width < 8) add('error', S, `Icon ${link.href} is under 8 x 8 px, Google's minimum.`);
    const sizes = imageSizes(info);
    for (const size of String(link.sizes ?? '').split(/\s+/).filter(s => s && s.toLowerCase() !== 'any')) if (sizes.length && !sizes.includes(size)) add('warn', S, `Icon ${link.href} says sizes="${size}" but holds ${sizes.join(', ')}.`);
  }
  if (icons.length && !raster.length) add('warn', S, 'Every icon is SVG. Google Search reads BMP, GIF, ICO, PNG, JPEG, PPM and TIFF favicons, not SVG; add a raster icon larger than 48 x 48 px.');
  if (!touch.length) add('warn', S, 'No `apple-touch-icon`. Messages uses it beside a link without a share image, and iPhone and iPad use it on the Home Screen (Safari 15.4 and later fall back to manifest icons).');
  for (const link of touch) {
    const image = localImage(ctx, link.href);
    if (image?.rel !== null && image && !image.file) { add('error', S, `apple-touch-icon ${link.href} is not in the site.`); continue; }
    const info = image?.info;
    if (info?.width && info.height && (info.width !== info.height || info.width < 108)) add('warn', S, `apple-touch-icon ${link.href} is ${info.width} x ${info.height}; Apple asks for square icons of at least 108 px, and 180 px suits current iPhones.`);
  }
  const manifests = head.links.filter(l => /(^|\s)manifest(\s|$)/i.test(l.rel ?? ''));
  if (manifests.length > 1) add('error', S, 'More than one `<link rel="manifest">`; browsers use only the first.');
  if (!manifests.length) add('info', S, 'No `<link rel="manifest">`; a manifest matters only for a site meant to be installed as an app.');
  if (raster.length && touch.length) add('ok', S, `Icons: ${icons.map(l => `${l.href}${l.sizes ? ` (${l.sizes})` : ''}`).join(', ')}; apple-touch-icon ${touch.map(l => l.href).join(', ')}.`);
}

function checkOpenGraph(ctx: HeadContext, add: Report) {
  const { head } = ctx.page;
  const m = head.meta;
  const S = 'Open Graph';
  const og = Object.keys(m).filter(k => k.startsWith('og:'));
  if (!og.length) { add('warn', S, 'No Open Graph tags, so every network and chat app builds a text-only preview from the title and description.'); return; }
  const required = ['og:title', 'og:type', 'og:image', 'og:url'];
  for (const name of required) if (!m[name]) add('warn', S, `No \`${name}\`; the Open Graph protocol requires og:title, og:type, og:image and og:url.`);
  if (required.every(name => m[name])) add('ok', S, `The four required properties are set; \`og:type\` is \`${m['og:type']}\`.`);
  if (m['og:type'] && !OG_TYPES.has(m['og:type'])) add('warn', S, `\`og:type\` \`${m['og:type']}\` is not a type the protocol defines.`);
  const article = Object.keys(m).filter(k => k.startsWith('article:'));
  if (article.length && m['og:type'] !== 'article') add('warn', S, `${article.map(k => `\`${k}\``).join(', ')} belong to \`og:type\` article, but the type is \`${m['og:type'] ?? 'unset'}\`.`);
  for (const name of ['article:published_time', 'article:modified_time', 'article:expiration_time']) if (m[name] && !ISO_DATE.test(m[name])) add('error', S, `\`${name}\` \`${m[name]}\` is not an ISO 8601 date.`);
  if (m['og:url'] && !absolute(m['og:url'])) add('warn', S, '`og:url` is relative; it should be the absolute canonical URL.');
  if (m['og:url'] && ctx.page.canonical && resolve(m['og:url'], ctx.page.url)?.href !== ctx.page.canonical) add('warn', S, `\`og:url\` (${m['og:url']}) differs from the canonical URL (${ctx.page.canonical}), so shares and search results group under different addresses.`);
  if (m['og:locale'] && !/^[a-z]{2,3}_[A-Z]{2}$/.test(m['og:locale'])) add('warn', S, `\`og:locale\` \`${m['og:locale']}\` is not language_TERRITORY, such as \`en_GB\`.`);
  if (m['og:locale'] && head.lang && m['og:locale'].split('_')[0] !== head.lang.split('-')[0].toLowerCase()) add('warn', S, `\`og:locale\` ${m['og:locale']} and \`<html lang="${head.lang}">\` name different languages.`);
  if (m['og:site_name'] && chars(m['og:site_name']) > 256) add('error', S, '`og:site_name` is over 256 characters; Discord shows no preview at all.');
  if (m['og:title'] && bytes(m['og:title']) > 70) add('info', S, `\`og:title\` is ${bytes(m['og:title'])} bytes; Discord trims titles to 70 bytes.`);
  if (m['og:description'] && bytes(m['og:description']) > 350) add('info', S, `\`og:description\` is ${bytes(m['og:description'])} bytes; Discord trims descriptions to 350.`);
  if (m['og:image:alt'] && chars(m['og:image:alt']) > 4096) add('error', S, '`og:image:alt` is over 4,096 characters; Discord shows no preview at all.');
  if (m['og:image'] && !m['og:image:alt'] && !m['twitter:image:alt']) add('warn', S, 'No `og:image:alt`; screen readers have nothing to read for the image.');
  for (const name of OG_SINGLE) if (metaTags(head.tags, name).length > 1) add('warn', S, `\`${name}\` appears more than once; readers differ on which one they take.`);
  const named = head.tags.filter(t => t.tag === 'meta' && t.name?.startsWith('og:'));
  if (named.length) add('warn', S, `${named.map(t => `\`${t.name}\``).join(', ')} use \`name=\`; Open Graph tags use \`property=\`.`);
  if (m['og:video'] && m['og:video:type'] && !['video/mp4', 'video/webm', 'video/quicktime'].includes(m['og:video:type'])) add('info', S, `\`og:video:type\` \`${m['og:video:type']}\`: Discord plays MP4, WebM and QuickTime.`);
  if (m['og:video'] || m['twitter:player:stream']) add('info', S, 'Apple Messages downloads and plays a direct video file from `og:video` or `twitter:player:stream`; a streamed (HLS) video plays on tap.');
}

function checkOtherTags(ctx: HeadContext, add: Report) {
  const { head } = ctx.page;
  const m = head.meta;
  for (const tag of metaTags(head.tags, 'theme-color')) {
    const color = String(tag.content ?? '').trim();
    if (color.startsWith('#') && !/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) add('error', 'theme-color', `\`${color}\` is not a hex color.`);
    else if (color && !/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) add('info', 'theme-color', `\`${color}\`: Discord reads only #RRGGBB or #RRGGBBAA, so its embed gets no stripe.`);
  }
  if (m['color-scheme'] && !m['color-scheme'].trim().split(/\s+/).every(t => ['normal', 'light', 'dark', 'only'].includes(t))) add('warn', 'color-scheme', `\`${m['color-scheme']}\` is not \`normal\`, or \`light\` and \`dark\` with an optional \`only\`.`);
  if (m.referrer && !m.referrer.split(',').every(v => REFERRER.has(v.trim()))) add('warn', 'referrer', `\`${m.referrer}\` is not a referrer policy.`);
  if (m.keywords !== undefined) add('info', 'keywords', 'Google does not use the keywords meta tag.');
  if (head.tags.some(t => t.tag === 'meta' && /^refresh$/i.test(t['http-equiv'] ?? ''))) add('warn', 'refresh', 'A meta refresh. Apple Messages does not follow it and Google recommends a server-side redirect.');
  for (const tag of head.tags.filter(t => t.tag === 'meta' && /verif|validate/i.test(t.name ?? ''))) {
    const name = tag.name;
    if (!tag.content) add('error', 'verification', `\`${name}\` is empty.`);
    else if (name.toLowerCase() === 'google-site-verification') add(ctx.isHome ? 'ok' : 'info', 'verification', ctx.isHome ? 'Google Search Console ownership tag. Google keeps checking it: removing the token unverifies the owner.' : 'Google looks for its verification tag on the home page; this one has no effect here.');
    else add('info', 'verification', `\`${name}\` looks like an ownership verification tag. Services differ: Google keeps checking its token, while Pinterest lets the tag go once the site is claimed.`);
  }
  const app = m['apple-itunes-app'];
  if (app) {
    const parts = Object.fromEntries(app.split(',').map(p => p.trim().split('=').map(s => s.trim())));
    if (!/^\d+$/.test(parts['app-id'] ?? '')) add('error', 'Smart App Banner', '`apple-itunes-app` needs `app-id=<numeric App Store ID>`.');
    else add('ok', 'Smart App Banner', `Safari shows the banner for app ${parts['app-id']}${parts['app-argument'] ? ` and passes ${parts['app-argument']} to it` : ''}.`);
    if (parts['app-argument'] && !absolute(parts['app-argument'])) add('warn', 'Smart App Banner', '`app-argument` should be an absolute URL the app can open.');
  }
  const bar = m['apple-mobile-web-app-status-bar-style'];
  if (bar && !['default', 'black', 'black-translucent'].includes(bar)) add('warn', 'Apple web app', `\`apple-mobile-web-app-status-bar-style\` \`${bar}\` is not default, black or black-translucent.`);
  if (m['apple-mobile-web-app-capable']) add('info', 'Apple web app', 'Since Safari 26, every site added to the Home Screen opens as a web app by default, so `apple-mobile-web-app-capable` is no longer needed for that.');
  const creator = m['fediverse:creator'];
  if (creator && !/^@[^@\s]+@[^@\s]+\.[^@\s]+$/.test(creator)) add('error', 'identity', `\`fediverse:creator\` \`${creator}\` is not \`@user@server\`.`);
  else if (creator) add('info', 'identity', `Mastodon shows ${creator} as the author when that account allows this site's domain in its profile.`);
  for (const link of head.links.filter(l => String(l.rel ?? '').toLowerCase().split(/\s+/).includes('me'))) {
    if (!/^https:/.test(link.href ?? '')) add('warn', 'identity', `rel="me" ${link.href}: Mastodon verifies only https links.`);
  }
  const tdm = m['tdm-reservation'];
  if (tdm !== undefined && !['0', '1'].includes(tdm.trim())) add('error', 'TDMRep', '`tdm-reservation` must be 1 (rights reserved) or 0.');
  if (m['tdm-policy'] && !absolute(m['tdm-policy'])) add('error', 'TDMRep', '`tdm-policy` must be a URL.');
  if (m.pinterest?.toLowerCase() === 'nopin') add('info', 'Pinterest', '`nopin` stops people saving images from this page to Pinterest.');
  if (head.links.some(l => String(l.rel ?? '').toLowerCase() === 'ard')) add('info', 'agent discovery', 'Links an ARD manifest with rel="ard".');
  if (head.links.some(l => String(l.rel ?? '').toLowerCase() === 'ai-catalog')) add('warn', 'agent discovery', 'ARD replaced rel="ai-catalog" with rel="ard"; consumers are not required to read the old relation.');
  // Feed autodiscovery (RSS Advisory Board, RSS Autodiscovery): an RSS link's rel is exactly the lowercase
  // "alternate" and its type lowercase; feed links use full URLs and, when there are several, different titles.
  const feeds = head.links.filter(l => String(l.rel ?? '').toLowerCase().split(/\s+/).includes('alternate') && /^application\/(rss\+xml|atom\+xml|feed\+json)$/i.test(String(l.type ?? '').trim()));
  for (const link of feeds) {
    const rss = /rss\+xml/i.test(String(link.type));
    if (rss && link.rel !== 'alternate') add('warn', 'feeds', `RSS link rel="${link.rel}": autodiscovery needs rel to be exactly "alternate", in lowercase.`);
    if (rss && link.type !== String(link.type).toLowerCase()) add('warn', 'feeds', `RSS link type "${link.type}" must be lowercase for autodiscovery.`);
    if (link.href && !absolute(link.href)) add('info', 'feeds', `Feed link ${link.href} is relative; some feed readers ignore the base URL, so give the full address.`);
  }
  const feedTitles = feeds.map(l => String(l.title ?? '').trim());
  if (feeds.length > 1 && new Set(feedTitles).size < feedTitles.length) add('warn', 'feeds', 'Several feed links share a title or have none; readers list feeds by title, so give each its own.');
  if (feeds.length) add('ok', 'feeds', `Feed autodiscovery: ${feeds.map(l => `${l.href} (${l.type})`).join(', ')}.`);
  // C2PA 2.5, Appendix A.7: at most one manifest association per HTML document, inline or referenced.
  const c2paLinks = head.links.filter(l => String(l.rel ?? '').toLowerCase().split(/\s+/).includes('c2pa-manifest'));
  const c2pa = c2paLinks.length + head.c2paScripts;
  if (c2pa > 1) add('error', 'C2PA', `The head has ${c2pa} C2PA manifest associations; C2PA allows one per HTML document, as one \`<script type="application/c2pa">\` or one \`<link rel="c2pa-manifest">\`.`);
  else if (c2pa) add('info', 'C2PA', 'The page carries a C2PA manifest for the HTML document itself; it describes the page\'s provenance, not that of its images.');
  for (const link of c2paLinks) if (link.type && link.type !== 'application/c2pa') add('warn', 'C2PA', `\`rel="c2pa-manifest"\` has type \`${link.type}\`; the C2PA media type is \`application/c2pa\`.`);
}

export function auditHead(ctx: HeadContext, add: Report) {
  const { head } = ctx.page;
  const S = 'document';
  if (head.charsetByte === null) add('warn', S, 'No `<meta charset>`; unless the server sends one in Content-Type, browsers guess the encoding.');
  else if (head.charsetByte > 1024) add('error', S, `\`<meta charset>\` starts at byte ${head.charsetByte}; HTML requires it within the first 1024 bytes.`);
  if (!head.lang) add('warn', S, 'No `<html lang>`; screen readers and translation need the page language.');
  const size = bytes(ctx.html);
  if (size > 2 * 1024 * 1024) add('error', S, `The page is ${kib(size)}; X reads at most 2 MB of a page.`);
  else if (size > 1024 * 1024) add('warn', S, `The page is ${kib(size)}; Apple Messages reads at most 1 MB.`);
  for (const error of head.ldErrors) add('error', 'structured data', `${error}; Google and every other reader skip this block.`);
  if (head.microdata || head.rdfa) add('info', 'structured data', `The page also has ${[head.microdata ? 'microdata' : '', head.rdfa ? 'RDFa' : ''].filter(Boolean).join(' and ')}; the audit reads JSON-LD only.`);
  // Title and description
  if (!head.titles) add('error', 'title', 'No `<title>`.');
  else if (head.titles > 1) add('error', 'title', `${head.titles} \`<title>\` elements; a document has one.`);
  else if (!head.title) add('error', 'title', 'The `<title>` is empty.');
  else if (/^(home|untitled|index|new page|profile)$/i.test(head.title)) add('warn', 'title', `"${head.title}" says nothing about the page; Google may replace a vague title.`);
  else add('ok', 'title', `"${head.title}" (${chars(head.title)} characters).`);
  const descriptions = metaTags(head.tags, 'description');
  if (!descriptions.length || !descriptions[0].content) add('warn', 'description', 'No meta description; search engines and link cards make one from the page text.');
  else if (descriptions.length > 1) add('warn', 'description', 'More than one meta description.');
  const others = ctx.site.pages.filter(p => p.key !== ctx.page.key && p.head.meta.description && p.head.meta.description === head.meta.description);
  if (others.length) add('warn', 'description', `${others.map(p => p.file).join(', ')} use the same description; give each page its own.`);
  // Canonical
  const canonicals = head.links.filter(l => String(l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  if (!canonicals.length) add('warn', 'canonical', 'No canonical link; Google picks the canonical address itself.');
  if (canonicals.length > 1) add('error', 'canonical', `${canonicals.length} canonical links; Google may ignore them all.`);
  if (canonicals[0]) {
    const href = canonicals[0].href ?? '';
    const target = resolve(href, ctx.page.url);
    if (!absolute(href)) add('warn', 'canonical', `\`${href}\` is relative; Google recommends an absolute URL.`);
    if (target && target.origin !== new URL(ctx.site.siteUrl).origin) add('warn', 'canonical', `The canonical URL is on another origin (${target.origin}).`);
    const local = target ? ctx.site.urlToRel(target.href) : null;
    if (local !== null && !ctx.site.read(local)) add('error', 'canonical', `The canonical URL ${target.href} is not a page of the site.`);
    const other = ctx.site.pages.find(p => p.key !== ctx.page.key && p.url === target?.href);
    if (other?.noindex) add('error', 'canonical', `The canonical page ${other.file} has \`noindex\`, so the two signals conflict.`);
    if (target?.href === ctx.page.url) add('ok', 'canonical', `Self-referencing: ${target.href}.`);
  }
  checkRobotsMeta(ctx, add);
  checkHreflang(ctx, add);
  checkOpenGraph(ctx, add);
  checkShareImage(ctx, add);
  checkIcons(ctx, add);
  checkOtherTags(ctx, add);
  if (ctx.robots && ctx.page.noindex === false && !robotsAllows(ctx.robots, 'applebot', new URL(ctx.page.url).pathname, ['googlebot'])) add('info', 'robots', 'robots.txt keeps Applebot off this page, so it is missing from Spotlight, Siri and Safari suggestions.');
}

export const isNoindex = (tags: Tag[]) => tags.some(t => t.tag === 'meta' && ['robots', 'googlebot'].includes((t.name ?? '').toLowerCase()) && /(^|,)\s*(noindex|none)\s*(,|$)/i.test(t.content ?? ''));
export { firstMeta };
