// Builds the preview gallery for a site: copies the gallery from assets/share-preview-gallery into the output folder,
// reads each configured page's <head>, and writes the gallery's data files. The site is only read.
//   <out>/index.html, gallery.js, gallery.css   the gallery
//   <out>/preview-data.js                       the pages as the site has them
//   <out>/siteconfig.js                         the configuration's "gallery" settings
//   <out>/proposed-metadata.js                  the configuration's proposed metadata, or null
//   <out>/assets/                               the images and icons the pages name, copied so the gallery opens offline
// It also writes empty share-cards.js, proposed-files.js, site-icons.js and metadata-audit.js when they are missing;
// the other scripts fill them.
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { type Config, galleryShell, imageInfo, isMain, pageUrl, readConfig, readHead, required, runCli, writeData } from './shared.ts';

const HELP = `Build the share and search preview gallery.
  node scripts/share-previews/build-gallery.ts --config <preview.config.json> --out <folder>`;

const WRITER = 'build-gallery.ts';

// Copies a file a page names into <out>/assets, keeping its path within the site, and describes it.
async function localAsset(config: Config, out: string, reference: string | undefined, url: string) {
  if (!reference) return null;
  const address = new URL(reference, url);
  if (!address.href.startsWith(config.site.url)) return { url: address.href, local: null, bytes: null, note: 'hosted elsewhere' };
  const relative = decodeURIComponent(address.pathname.slice(new URL(config.site.url).pathname.length));
  const source = path.join(config.site.root, relative);
  if (!relative || !existsSync(source)) return { url: address.href, local: null, bytes: null, note: 'file not found in the site' };
  const target = path.join(out, 'assets', relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  const bytes = await readFile(source);
  return { url: address.href, local: `assets/${relative}`, bytes: bytes.length, ...imageInfo(bytes) };
}

function websiteName(ld: any[]) {
  for (const block of ld) for (const node of block['@graph'] ?? [block]) {
    if ([node['@type']].flat().includes('WebSite')) return { name: node.name ?? null, alternateName: node.alternateName ?? null };
  }
  return { name: null, alternateName: null };
}

const ldTypes = (ld: any[]) => ld.flatMap(block => (block['@graph'] ?? [block]).flatMap((node: any) => [node['@type'] ?? []].flat()));

export async function buildGallery(config: Config, out: string) {
  await mkdir(path.join(out, 'assets'), { recursive: true });
  for (const name of ['index.html', 'gallery.js', 'gallery.css']) await copyFile(path.join(galleryShell, name), path.join(out, name));
  const pages = [];
  for (const page of config.pages) {
    const head = readHead(await readFile(path.join(config.site.root, page.file), 'utf8'));
    const m = head.meta;
    const canonical = head.links.find(link => link.rel === 'canonical')?.href ?? null;
    const url = pageUrl(config, page, canonical);
    const ogImage = await localAsset(config, out, m['og:image'], url);
    const twitterImage = await localAsset(config, out, m['twitter:image'], url);
    const icons = head.links.filter(link => /(^|\s)icon(\s|$)/i.test(link.rel ?? ''));
    const pngIcon = icons.filter(link => link.type === 'image/png').sort((a, b) => parseInt(b.sizes ?? '0', 10) - parseInt(a.sizes ?? '0', 10))[0];
    const favicon = await localAsset(config, out, pngIcon?.href ?? icons[0]?.href, url);
    const touch = await localAsset(config, out, head.links.find(link => link.rel === 'apple-touch-icon')?.href, url);
    const site = websiteName(head.ld);
    pages.push({
      key: page.key, label: page.label, file: page.file, url, canonical,
      title: head.title, description: m.description ?? '', robots: m.robots ?? '', themeColor: m['theme-color'] ?? '',
      themeColors: head.tags.filter(tag => tag.tag === 'meta' && tag.name?.toLowerCase() === 'theme-color' && tag.content).map(tag => ({ color: tag.content, ...(tag.media ? { media: tag.media } : {}) })),
      og: {
        type: m['og:type'] ?? '', url: m['og:url'] ?? '', siteName: m['og:site_name'] ?? '', locale: m['og:locale'] ?? '',
        title: m['og:title'] ?? '', description: m['og:description'] ?? '',
        image: ogImage && { ...ogImage, declaredType: m['og:image:type'] ?? '', declaredWidth: m['og:image:width'] ? Number(m['og:image:width']) : null,
          declaredHeight: m['og:image:height'] ? Number(m['og:image:height']) : null, alt: m['og:image:alt'] ?? '' },
      },
      twitter: { card: m['twitter:card'] ?? '', title: m['twitter:title'] ?? '', description: m['twitter:description'] ?? '', image: twitterImage,
        imageAlt: m['twitter:image:alt'] ?? '', site: m['twitter:site'] ?? '', creator: m['twitter:creator'] ?? '' },
      icons: { favicon: favicon?.local ?? null, faviconUrl: favicon?.url ?? null, touch: touch?.local ?? null, touchUrl: touch?.url ?? null },
      ld: { websiteName: site.name, websiteAlternateName: site.alternateName, types: ldTypes(head.ld) },
    });
  }
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  await writeData(out, 'preview-data.js', 'PREVIEW_DATA', { generatedAt: `${stamp} UTC`, source: config.site.root, pages }, WRITER);

  // The gallery's own settings. A configured icon is copied beside the gallery; otherwise the home page's favicon is used.
  const gallery = { ...config.gallery };
  if (gallery.icon) {
    const name = path.basename(gallery.icon);
    await copyFile(path.resolve(config.dir, gallery.icon), path.join(out, 'assets', name));
    gallery.icon = `assets/${name}`;
  } else {
    const home = pages.find(p => p.key === (gallery.homeKey ?? 'home')) ?? pages[0];
    if (home.icons.favicon) gallery.icon = home.icons.favicon;
  }
  await writeData(out, 'siteconfig.js', 'GALLERY_CONFIG', gallery, WRITER);
  await writeData(out, 'proposed-metadata.js', 'PROPOSED_METADATA', config.proposed, WRITER);
  if (!existsSync(path.join(out, 'share-cards.js'))) await writeData(out, 'share-cards.js', 'SHARE_CARDS', [], WRITER);
  if (!existsSync(path.join(out, 'proposed-files.js'))) await writeData(out, 'proposed-files.js', 'PROPOSED_FILES', [], WRITER);
  if (!existsSync(path.join(out, 'site-icons.js'))) await writeData(out, 'site-icons.js', 'SITE_ICONS', { files: [] }, WRITER);
  if (!existsSync(path.join(out, 'metadata-audit.js'))) await writeData(out, 'metadata-audit.js', 'METADATA_AUDIT', null, WRITER);

  for (const page of pages) {
    const image = page.og.image;
    console.log(`${page.key.padEnd(10)} title ${String([...page.title].length).padStart(3)} ch | description ${String([...page.description].length).padStart(3)} ch | og:image ${image?.local ? `${image.width ?? '?'}x${image.height ?? '?'} ${Math.round((image.bytes ?? 0) / 1024)} KB` : image?.note ?? 'none'}`);
  }
  console.log(`gallery: ${path.join(out, 'index.html')}`);
  return { pages: pages.length };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => {
    await buildGallery(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)));
    return true;
  });
}
