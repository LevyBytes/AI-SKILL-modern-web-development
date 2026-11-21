// The proposed head markup for a page, as the gallery writes it (headMarkup in assets/share-preview-gallery/gallery.js)
// with the first share card. check-metadata.ts merges it into the page to audit the head the proposal would give.
// The test compares this markup with the gallery's, line for line, so the two stay in step.

const a = (value: unknown) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const meta = (key: string, value: unknown, attr = 'name') => (value ? `<meta ${attr}="${key}" content="${a(value)}">` : null);
const tag = (t: Record<string, unknown>) => `<${t.tag}${Object.entries(t).filter(([key, value]) => key !== 'tag' && value !== undefined && value !== null).map(([key, value]) => ` ${key}="${a(value)}"`).join('')}>`;
export const themeList = (value: unknown): { color: string; media?: string }[] => ([] as unknown[]).concat(value ?? [])
  .map(item => (typeof item === 'string' ? { color: item } : item as { color: string; media?: string })).filter(item => item && item.color);

// page and home are entries of preview-data.js; cards is share-cards.js; proposed is the proposed metadata.
export function proposedMarkup(page: any, home: any, proposed: any, cards: any[]): string | null {
  const prop = proposed?.pages?.[page.key];
  if (!prop) return null;
  const card = cards[0];
  const image = card && card.local ? { url: proposed.imageUrl, type: card.type, width: card.width, height: card.height, alt: card.alt } : { ...home.og.image };
  const img = image && image.url ? image : null;
  const lines = [
    `<title>${a(prop.title)}</title>`,
    meta('description', prop.description),
    page.canonical ? `<link rel="canonical" href="${a(page.canonical)}">` : null,
    meta('robots', prop.robots),
    ...themeList(prop.themeColor).map(t => `<meta name="theme-color" content="${a(t.color)}"${t.media ? ` media="${a(t.media)}"` : ''}>`),
    meta('application-name', prop.applicationName),
    meta('apple-mobile-web-app-title', prop.appleTitle),
    meta('og:type', prop.ogType ?? 'website', 'property'),
    meta('og:url', page.url, 'property'),
    meta('og:site_name', prop.siteName, 'property'),
    meta('og:locale', prop.locale, 'property'),
    meta('og:title', prop.ogTitle, 'property'),
    meta('og:description', prop.ogDescription, 'property'),
    meta('og:image', img && img.url, 'property'),
    meta('og:image:type', img && img.type, 'property'),
    meta('og:image:width', img && img.width && String(img.width), 'property'),
    meta('og:image:height', img && img.height && String(img.height), 'property'),
    meta('og:image:alt', img && img.alt, 'property'),
    meta('twitter:card', prop.twitterCard),
    meta('twitter:title', prop.twitterTitle),
    meta('twitter:description', prop.twitterDescription),
    meta('twitter:image', img && img.url),
    meta('twitter:image:alt', (img && img.alt) || ''),
    ...(prop.twitterLabels || []).flatMap(([label, data]: [string, string], index: number) => [meta(`twitter:label${index + 1}`, label), meta(`twitter:data${index + 1}`, data)]),
    ...(prop.extraTags ?? []).map(tag),
  ].filter(Boolean);
  if (prop.jsonLd) {
    const json = JSON.stringify(prop.jsonLd, null, 2).split('\n').map(line => `  ${line}`).join('\n');
    lines.push(`<script type="application/ld+json">\n${json}\n</script>`);
  }
  return lines.join('\n');
}
