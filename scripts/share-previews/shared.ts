// Shared helpers for the share-preview scripts: the configuration file, page heads, image sizes and embedded image
// metadata, Playwright and the gallery's data files. Node.js 22.18 or later runs these TypeScript files directly.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';

export const skillRoot = fileURLToPath(new URL('../../', import.meta.url));
export const galleryShell = path.join(skillRoot, 'assets', 'share-preview-gallery');
export const defaultCardTemplate = path.join(skillRoot, 'assets', 'share-preview-card', 'card.html');

export interface PageEntry { key: string; label: string; file: string }
export interface Config {
  file: string;
  dir: string;
  site: { root: string; url: string; base: string };
  pages: PageEntry[];
  gallery: Record<string, any>;
  proposed: any;
  shareCards: any[];
  icons: any;
  siteFiles: any;
}

export function fail(message: string): never {
  throw new Error(message);
}

// Reads preview.config.json. Paths in it are relative to the file; the site URL must end with a slash.
export function readConfig(file: string): Config {
  const full = path.resolve(file);
  const dir = path.dirname(full);
  const raw = JSON.parse(readFileSync(full, 'utf8'));
  const site = raw.site ?? fail('config: "site" is required');
  if (typeof site.root !== 'string' || typeof site.url !== 'string') fail('config: site.root and site.url are required');
  if (!/^https?:\/\/[^/]+\/(.*\/)?$/.test(site.url)) fail('config: site.url must be an absolute URL ending with "/"');
  const root = path.resolve(dir, site.root);
  if (!existsSync(root)) fail(`config: site.root not found: ${root}`);
  const base = site.base ?? '';
  if (base && !base.endsWith('/')) fail('config: site.base must end with "/" (for example "docs/")');
  const pages: PageEntry[] = raw.pages ?? fail('config: "pages" is required');
  if (!Array.isArray(pages) || !pages.length) fail('config: "pages" must list at least one page');
  const keys = new Set<string>();
  for (const page of pages) {
    if (!page.key || !page.label || !page.file) fail('config: every page needs key, label and file');
    if (keys.has(page.key)) fail(`config: repeated page key "${page.key}"`);
    keys.add(page.key);
    if (!existsSync(path.join(root, page.file))) fail(`config: page file not found: ${page.file}`);
  }
  let proposed = raw.proposed ?? null;
  if (typeof proposed === 'string') proposed = JSON.parse(readFileSync(path.resolve(dir, proposed), 'utf8'));
  if (proposed) {
    for (const key of Object.keys(proposed.pages ?? {})) if (!keys.has(key)) fail(`proposed metadata: unknown page key "${key}"`);
    if (!proposed.website?.name) fail('proposed metadata: website.name is required');
  }
  return { file: full, dir, site: { root, url: site.url, base }, pages, gallery: raw.gallery ?? {}, proposed, shareCards: raw.shareCards ?? [], icons: raw.icons ?? null, siteFiles: raw.siteFiles ?? null };
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
export function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

export function readAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [, name, double, single] of source.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attributes[name.toLowerCase()] = decode(double ?? single);
  return attributes;
}

// The <head> element's bounds, skipping comments, so a comment that mentions "<head>" is not mistaken for it.
export function headBounds(html: string): { start: number; end: number } {
  const blank = html.replace(/<!--[\s\S]*?-->/g, match => ' '.repeat(match.length));
  const open = /<head(\s[^>]*)?>/i.exec(blank);
  const close = /<\/head\s*>/i.exec(blank);
  if (!open || !close || close.index < open.index) fail('no <head> element found');
  return { start: open.index, end: close.index + close[0].length };
}

export type Tag = Record<string, string> & { tag: string };
export interface Head {
  title: string;
  titles: number;
  meta: Record<string, string>;
  tags: Tag[];
  links: Tag[];
  ld: any[];
  ldErrors: string[];
  lang: string | null;
  charsetByte: number | null;
  bodyMeta: Tag[];
  microdata: boolean;
  rdfa: boolean;
  // <script type="application/c2pa"> elements in the head: a C2PA manifest for the HTML document itself.
  c2paScripts: number;
}

// The key a head tag is managed under: one proposed tag of a kind replaces every page tag of that kind. Meta tags go
// by name or property, links by their relation (hreflang alternates, feed and oEmbed alternates by type, icons).
export function tagKey(tag: Tag): string | null {
  if (tag.tag === 'title') return 'title';
  if (tag.tag === 'meta') {
    if (tag.charset !== undefined) return 'charset';
    if (tag['http-equiv']) return `http-equiv ${tag['http-equiv'].toLowerCase()}`;
    const key = tag.name ?? tag.property;
    return key ? (key.includes(':') ? key : key.toLowerCase()) : null;
  }
  if (tag.tag === 'link') {
    const rel = (tag.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (rel.includes('canonical')) return 'canonical';
    if (rel.includes('alternate') && tag.hreflang) return 'hreflang';
    if (rel.includes('alternate') && tag.type) return `alternate ${tag.type.toLowerCase()}`;
    if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) return 'apple-touch-icon';
    if (rel.includes('icon')) return 'icon';
    return rel.length ? rel.join(' ') : null;
  }
  return null;
}

const TAG_SOURCE = /<(meta|link)\b([^>]*)>/gi;
const tagsIn = (text: string): Tag[] => [...text.matchAll(TAG_SOURCE)].map(([, tag, source]) => ({ tag: tag.toLowerCase(), ...readAttributes(source) }));

export function readHead(html: string): Head {
  const { start, end } = headBounds(html);
  const head = html.slice(start, end).replace(/<!--[\s\S]*?-->/g, '');
  const tags = tagsIn(head);
  const meta: Record<string, string> = {};
  for (const tag of tags) {
    const key = tag.tag === 'meta' ? (tag.property ?? tag.name) : undefined;
    if (key && tag.content !== undefined && !(key in meta)) meta[key] = tag.content;
  }
  const links = tags.filter(tag => tag.tag === 'link');
  const titleTags = [...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)];
  const title = decode((titleTags[0]?.[1] ?? '').trim());
  const whole = html.replace(/<!--[\s\S]*?-->/g, match => ' '.repeat(match.length));
  // JSON-LD may sit anywhere in the document, not only in the head. A block that is not valid JSON is reported, not
  // thrown, so one broken block does not hide the rest of the page.
  const ld: any[] = [];
  const ldErrors: string[] = [];
  for (const [index, [, json]] of [...whole.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    try { ld.push(JSON.parse(json)); } catch (error) { ldErrors.push(`JSON-LD block ${index + 1}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const charset = /<meta\b[^>]*\bcharset\s*=|<meta\b[^>]*http-equiv\s*=\s*["']?content-type/i.exec(whole);
  return {
    title, titles: titleTags.length, meta, tags, links, ld, ldErrors,
    lang: readAttributes(/<html\b([^>]*)>/i.exec(whole)?.[1] ?? '').lang ?? null,
    charsetByte: charset ? Buffer.byteLength(html.slice(0, charset.index)) : null,
    bodyMeta: tagsIn(whole.slice(end)).filter(tag => tag.tag === 'meta'),
    microdata: /\bitemscope\b/i.test(whole),
    rdfa: /<[^>]+\b(typeof|vocab)\s*=/i.test(whole),
    c2paScripts: (head.match(/<script\b[^>]*\btype\s*=\s*["']?application\/c2pa["'\s>]/gi) ?? []).length,
  };
}

// The page's address: its canonical link, else the site URL with the file's path (index.html becomes its folder).
export function pageUrl(config: Config, page: PageEntry, canonical?: string | null): string {
  if (canonical) return new URL(canonical, config.site.url).href;
  return new URL(page.file.replace(/(^|\/)index\.html$/, '$1'), config.site.url).href;
}

export interface ImageInfo { type: string; width: number | null; height: number | null; sizes?: string[] }

// The type and pixel size of an image file, read from its header: PNG, JPEG, GIF, WebP, AVIF, BMP, ICO (its largest
// entry, with every size listed), TIFF and PPM (type only for TIFF), and SVG (its width and height or viewBox).
export function imageInfo(bytes: Buffer): ImageInfo {
  const ascii = (from: number, to: number) => bytes.subarray(from, to).toString('latin1');
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return { type: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    // The width and height in a JPEG's start-of-frame segment (markers C0 to CF, except C4, C8 and CC).
    for (let offset = 2; offset + 9 < bytes.length && bytes[offset] === 0xff; offset += 2 + bytes.readUInt16BE(offset + 2)) {
      const marker = bytes[offset + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: 'image/jpeg', width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    return { type: 'image/jpeg', width: null, height: null };
  }
  if (/^GIF8[79]a$/.test(ascii(0, 6))) return { type: 'image/gif', width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    const chunk = ascii(12, 16);
    if (chunk === 'VP8 ' && bytes.length > 30) return { type: 'image/webp', width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L' && bytes.length > 25) {
      const bits = bytes.readUInt32LE(21);
      return { type: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X' && bytes.length > 30) return { type: 'image/webp', width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
    return { type: 'image/webp', width: null, height: null };
  }
  if (ascii(4, 8) === 'ftyp' && /avif|avis/.test(ascii(8, 12))) {
    const at = bytes.indexOf('ispe', 0, 'latin1');
    return { type: 'image/avif', width: at > 0 ? bytes.readUInt32BE(at + 8) : null, height: at > 0 ? bytes.readUInt32BE(at + 12) : null };
  }
  if (ascii(0, 2) === 'BM' && bytes.length > 26) return { type: 'image/bmp', width: bytes.readInt32LE(18), height: Math.abs(bytes.readInt32LE(22)) };
  if (bytes.readUInt32BE(0) === 0x00000100 && bytes.length > 6) {
    const count = bytes.readUInt16LE(4);
    const entries = Array.from({ length: count }, (_, i) => 6 + i * 16).filter(at => at + 16 <= bytes.length)
      .map(at => ({ width: bytes[at] || 256, height: bytes[at + 1] || 256 }));
    const largest = entries.sort((a, b) => b.width - a.width)[0];
    return { type: 'image/x-icon', width: largest?.width ?? null, height: largest?.height ?? null, sizes: entries.map(e => `${e.width}x${e.height}`).reverse() };
  }
  if (ascii(0, 4) === 'II*\u0000' || ascii(0, 4) === 'MM\u0000*') return { type: 'image/tiff', width: null, height: null };
  const ppm = /^P[36]\s+(?:#[^\n]*\n\s*)*(\d+)\s+(\d+)/.exec(ascii(0, 64));
  if (ppm) return { type: 'image/x-portable-pixmap', width: Number(ppm[1]), height: Number(ppm[2]) };
  const text = bytes.subarray(0, 2048).toString('utf8');
  const svg = /<svg\b([^>]*)>/i.exec(text);
  if (svg) {
    const attributes = readAttributes(svg[1]);
    const box = (attributes.viewbox ?? '').trim().split(/[\s,]+/).map(Number);
    const size = (value?: string) => (value && /^\d+(\.\d+)?(px)?$/.test(value) ? parseFloat(value) : null);
    return { type: 'image/svg+xml', width: size(attributes.width) ?? (box.length === 4 ? box[2] : null), height: size(attributes.height) ?? (box.length === 4 ? box[3] : null) };
  }
  return { type: 'unknown', width: null, height: null };
}

// ---- Embedded image metadata: EXIF (and whether it holds a GPS position), XMP, IPTC IIM and a C2PA manifest ----
export interface ImageMetadata {
  exif: boolean;
  gps: boolean;
  iptc: boolean;
  c2pa: boolean;
  xmp: string | null;
  fields: Record<string, string>;
}

// The IPTC Photo Metadata fields Google Images reads, by their XMP property names.
export const XMP_FIELDS: Record<string, string> = {
  creator: 'dc:creator', creditText: 'photoshop:Credit', copyrightNotice: 'dc:rights', webStatement: 'xmpRights:WebStatement',
  licensorUrl: 'plus:LicensorURL', digitalSourceType: 'Iptc4xmpExt:DigitalSourceType',
};

function exifHasGps(tiff: Buffer): boolean {
  if (tiff.length < 8) return false;
  const le = tiff.toString('latin1', 0, 2) === 'II';
  const u16 = (at: number) => (le ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at));
  const ifd = le ? tiff.readUInt32LE(4) : tiff.readUInt32BE(4);
  if (ifd + 2 > tiff.length) return false;
  for (let i = 0, count = u16(ifd); i < count && ifd + 2 + i * 12 + 2 <= tiff.length; i++) if (u16(ifd + 2 + i * 12) === 0x8825) return true;
  return false;
}

function xmpFields(xmp: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, name] of Object.entries(XMP_FIELDS)) {
    const element = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(xmp);
    const attribute = new RegExp(`\\s${name}="([^"]*)"`).exec(xmp);
    const resource = new RegExp(`<${name}\\b[^>]*rdf:resource="([^"]*)"`).exec(xmp);
    const raw = element ? element[1] : attribute?.[1] ?? resource?.[1];
    if (raw === undefined) continue;
    const items = [...raw.matchAll(/<rdf:li\b[^>]*>([\s\S]*?)<\/rdf:li>/g)].map(([, text]) => text);
    const text = (items.length ? items.join('; ') : raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) fields[key] = decode(text);
  }
  return fields;
}

export function imageMetadata(bytes: Buffer): ImageMetadata {
  const found: ImageMetadata = { exif: false, gps: false, iptc: false, c2pa: false, xmp: null, fields: {} };
  const XMP_ID = 'http://ns.adobe.com/xap/1.0/\u0000';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let at = 2; at + 4 <= bytes.length && bytes[at] === 0xff;) {
      const marker = bytes[at + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = bytes.readUInt16BE(at + 2);
      const data = bytes.subarray(at + 4, at + 2 + length);
      if (marker === 0xe1 && data.toString('latin1', 0, 6) === 'Exif\u0000\u0000') { found.exif = true; found.gps ||= exifHasGps(data.subarray(6)); }
      if (marker === 0xe1 && data.toString('latin1', 0, XMP_ID.length) === XMP_ID) found.xmp = data.subarray(XMP_ID.length).toString('utf8');
      if (marker === 0xed && data.toString('latin1', 0, 13) === 'Photoshop 3.0') found.iptc = data.includes(Buffer.from([0x38, 0x42, 0x49, 0x4d, 0x04, 0x04]));
      if (marker === 0xeb && data.includes('jumb') && data.includes('c2pa')) found.c2pa = true;
      at += 2 + length;
    }
  } else if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    for (let at = 8; at + 8 <= bytes.length;) {
      const length = bytes.readUInt32BE(at);
      const type = bytes.toString('latin1', at + 4, at + 8);
      const data = bytes.subarray(at + 8, at + 8 + length);
      if (type === 'eXIf') { found.exif = true; found.gps ||= exifHasGps(data); }
      if (type === 'iTXt' && data.toString('latin1', 0, 18) === 'XML:com.adobe.xmp\u0000') {
        // keyword, null, compression flag and method, then a language tag and a translated keyword, each ending in null.
        let text = 20;
        for (let nulls = 0; nulls < 2 && text < data.length; text++) if (data[text] === 0) nulls++;
        found.xmp = data.subarray(text).toString('utf8');
      }
      if (type === 'caBX') found.c2pa = true;
      if (type === 'IEND') break;
      at += 12 + length;
    }
  } else if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    for (let at = 12; at + 8 <= bytes.length;) {
      const type = bytes.toString('latin1', at, at + 4);
      const length = bytes.readUInt32LE(at + 4);
      const data = bytes.subarray(at + 8, at + 8 + length);
      if (type === 'EXIF') { found.exif = true; found.gps ||= exifHasGps(data.toString('latin1', 0, 6) === 'Exif\u0000\u0000' ? data.subarray(6) : data); }
      if (type === 'XMP ') found.xmp = data.toString('utf8');
      if (type === 'C2PA') found.c2pa = true;
      at += 8 + length + (length % 2);
    }
  }
  if (found.xmp) found.fields = xmpFields(found.xmp);
  return found;
}

const xmlText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// An XMP packet with the IPTC fields Google Images reads: creator, credit line, copyright notice, web statement of
// rights, licensor URL and digital source type. Empty fields are left out.
export function xmpPacket(fields: Record<string, string>): string {
  const unknown = Object.keys(fields).filter(key => !(key in XMP_FIELDS));
  if (unknown.length) fail(`imageMetadata: unknown fields ${unknown.join(', ')}; use ${Object.keys(XMP_FIELDS).join(', ')}`);
  if (fields.digitalSourceType && !fields.digitalSourceType.startsWith('http://cv.iptc.org/newscodes/digitalsourcetype/')) fail('imageMetadata.digitalSourceType must be an IPTC NewsCodes URI, http://cv.iptc.org/newscodes/digitalsourcetype/<code>');
  for (const key of ['webStatement', 'licensorUrl']) if (fields[key] && !/^https?:\/\//.test(fields[key])) fail(`imageMetadata.${key} must be an absolute URL`);
  const attributes = [
    fields.creditText ? `\n    photoshop:Credit="${xmlText(fields.creditText)}"` : '',
    fields.webStatement ? `\n    xmpRights:WebStatement="${xmlText(fields.webStatement)}"` : '',
    fields.digitalSourceType ? `\n    Iptc4xmpExt:DigitalSourceType="${xmlText(fields.digitalSourceType)}"` : '',
  ].join('');
  const elements = [
    fields.creator ? `   <dc:creator><rdf:Seq><rdf:li>${xmlText(fields.creator)}</rdf:li></rdf:Seq></dc:creator>` : '',
    fields.copyrightNotice ? `   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${xmlText(fields.copyrightNotice)}</rdf:li></rdf:Alt></dc:rights>` : '',
    fields.licensorUrl ? `   <plus:Licensor><rdf:Bag><rdf:li rdf:parseType="Resource"><plus:LicensorURL>${xmlText(fields.licensorUrl)}</plus:LicensorURL></rdf:li></rdf:Bag></plus:Licensor>` : '',
  ].filter(Boolean).join('\n');
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/"
    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"${attributes}>
${elements}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`;
}

// Writes an XMP packet into a JPEG (an APP1 segment after the JFIF header) or a PNG (an iTXt chunk after IHDR).
// Any XMP the image already has is replaced. Writing metadata changes the file, so it would break a C2PA signature;
// the share cards are rendered here and carry none.
export function embedXmp(bytes: Buffer, packet: string): Buffer {
  const xmp = Buffer.from(packet, 'utf8');
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const id = Buffer.from('http://ns.adobe.com/xap/1.0/\u0000', 'latin1');
    if (id.length + xmp.length + 2 > 0xffff) fail('XMP packet too large for one JPEG segment');
    const kept: Buffer[] = [];
    let at = 2;
    let insert = 0;
    while (at + 4 <= bytes.length && bytes[at] === 0xff && bytes[at + 1] !== 0xda) {
      const length = bytes.readUInt16BE(at + 2);
      const segment = bytes.subarray(at, at + 2 + length);
      const isXmp = bytes[at + 1] === 0xe1 && segment.subarray(4, 4 + id.length).equals(id);
      if (!isXmp) kept.push(segment);
      if (bytes[at + 1] === 0xe0) insert = kept.length;
      at += 2 + length;
    }
    const header = Buffer.alloc(4);
    header.writeUInt16BE(0xffe1, 0);
    header.writeUInt16BE(id.length + xmp.length + 2, 2);
    kept.splice(insert, 0, Buffer.concat([header, id, xmp]));
    return Buffer.concat([bytes.subarray(0, 2), ...kept, bytes.subarray(at)]);
  }
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    const chunks: Buffer[] = [];
    for (let at = 8; at + 8 <= bytes.length;) {
      const length = bytes.readUInt32BE(at);
      const chunk = bytes.subarray(at, at + 12 + length);
      const type = bytes.toString('latin1', at + 4, at + 8);
      if (!(type === 'iTXt' && chunk.toString('latin1', 8, 26) === 'XML:com.adobe.xmp\u0000')) chunks.push(chunk);
      at += 12 + length;
    }
    const data = Buffer.concat([Buffer.from('XML:com.adobe.xmp\u0000\u0000\u0000\u0000\u0000', 'latin1'), xmp]);
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write('iTXt', 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    chunks.splice(1, 0, Buffer.concat([head, data, crc]));
    return Buffer.concat([bytes.subarray(0, 8), ...chunks]);
  }
  fail('XMP can be written into JPEG and PNG images only');
}

// Playwright from this skill's scripts folder (npm ci --prefix scripts), else a global installation.
export function loadChromium() {
  const attempts = [path.join(skillRoot, 'scripts', 'package.json')];
  try { attempts.push(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'index.js')); } catch { /* no global npm */ }
  for (const from of attempts) {
    for (const name of ['@playwright/test', 'playwright']) {
      try { return createRequire(from)(name).chromium; } catch { /* try the next */ }
    }
  }
  fail('Playwright not found. Run: npm ci --prefix scripts --ignore-scripts --no-audit --no-fund (in a working copy), or install it globally.');
}

// A headless browser: the given channel (such as "chrome"), else Playwright's Chromium, else the installed Chrome.
export async function launchBrowser(channel?: string) {
  const chromium = loadChromium();
  const chosen = channel ?? process.env.PLAYWRIGHT_CHANNEL;
  if (chosen) return chromium.launch({ channel: chosen, headless: true });
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (!/Executable doesn't exist|executable/i.test(String(error))) throw error;
    console.log("Playwright's Chromium is not installed; using the installed Chrome.");
    return chromium.launch({ channel: 'chrome', headless: true });
  }
}

// Writes one of the gallery's data files: a script that sets a window global.
export async function writeData(dir: string, file: string, name: string, data: unknown, writer: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), `// Written by ${writer}. Do not edit; run the script again.\nwindow.${name} = ${JSON.stringify(data, null, 2)};\n`);
}

// Reads back one of the gallery's data files, or the fallback when it is missing.
export function readData<T>(dir: string, file: string, fallback: T): T {
  const full = path.join(dir, file);
  if (!existsSync(full)) return fallback;
  return JSON.parse(readFileSync(full, 'utf8').replace(/^[\s\S]*?window\.\w+ = /, '').replace(/;\s*$/, '')) ?? fallback;
}

export const isMain = (url: string) => Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(url);

export function cliOptions(argv: string[]) {
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const match = /^--([\w-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!match) fail(`unexpected argument: ${argv[i]}`);
    if (match[2] !== undefined) options[match[1]] = match[2];
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) options[match[1]] = argv[++i];
    else options[match[1]] = true;
  }
  return options;
}

export async function runCli(help: string, main: (options: Record<string, string | boolean>) => Promise<boolean>) {
  const options = cliOptions(process.argv.slice(2));
  if (options.help) { console.log(help); return; }
  try {
    if (!(await main(options))) process.exitCode = 1;
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 2;
  }
}

export function required(options: Record<string, string | boolean>, name: string, help: string): string {
  const value = options[name];
  if (typeof value !== 'string') fail(`--${name} is required.\n${help}`);
  return value;
}
