'use strict';
// gallery.js: renders share and search mockups of a site's pages, in collapsible sections with a contents list.
// It is generic; the site comes from its data files, all optional except the first:
//   window.PREVIEW_DATA       the pages as the site source has them (preview-data.js)
//   window.GALLERY_CONFIG     the site's title, search queries, extra notes and checks (siteconfig.js)
//   window.PROPOSED_METADATA  proposed metadata for each page (proposed-metadata.js)
//   window.SHARE_CARDS        rendered share images (share-cards.js)
//   window.PROPOSED_FILES     proposed site files outside the page heads (proposed-files.js)
//   window.SITE_ICONS         rendered site icons (site-icons.js)
//   window.METADATA_AUDIT     the metadata audit of every page and site file (metadata-audit.js)
// The scripts in the skill's scripts/share-previews folder write all seven: build-gallery.ts, render-share-cards.ts,
// render-icons.ts, build-site-files.ts and check-metadata.ts.
// URL parameters: ?page=<page key>&theme=light|dark&meta=proposed|source&image=<share card id>&open=all|<section,...>
// Which sections are open is remembered in this browser unless the URL's open parameter sets it.

(() => {
  const D = window.PREVIEW_DATA;
  const CONFIG = window.GALLERY_CONFIG ?? {};
  const app = document.getElementById('app');
  if (!D) {
    app.textContent = 'preview-data.js is missing. Build the gallery with scripts/share-previews/build-gallery.ts.';
    return;
  }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ESC[c]);
  const len = text => [...String(text ?? '')].length;
  const utf8 = text => new TextEncoder().encode(String(text ?? '')).length;
  // The longest start of text that fits in max UTF-8 bytes, cut between code points.
  const fitBytes = (text, max) => {
    let out = '';
    let used = 0;
    for (const ch of String(text ?? '')) {
      used += utf8(ch);
      if (used > max) break;
      out += ch;
    }
    return out;
  };
  const kb = bytes => `${Math.round(bytes / 1024)} KB`;
  // Discord's link preview limits: titles are trimmed at 70 bytes and 3 lines, descriptions at 350 bytes and 20 lines.
  const DISCORD_TITLE_BYTES = 70;
  const DISCORD_DESCRIPTION_BYTES = 350;
  const home = D.pages.find(p => p.key === (CONFIG.homeKey ?? 'home')) ?? D.pages[0];

  const params = new URLSearchParams(location.search);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const PROPOSED = window.PROPOSED_METADATA ?? null;
  const IMAGES = window.SHARE_CARDS ?? [];
  const ICONS = window.SITE_ICONS ?? { files: [] };
  const AUDIT = window.METADATA_AUDIT ?? null;
  const pick = (list, id) => (list.some(item => item.id === id) ? id : list[0]?.id ?? '');
  const state = {
    page: D.pages.some(p => p.key === params.get('page')) ? params.get('page') : home.key,
    theme: params.get('theme') === 'dark' || params.get('theme') === 'light' ? params.get('theme') : (prefersDark ? 'dark' : 'light'),
    meta: params.get('meta') === 'source' || !PROPOSED ? 'source' : 'proposed',
    image: pick(IMAGES, params.get('image')),
  };

  // Open sections: the URL's open parameter for this visit, else what this browser remembered, else the overview.
  const OPEN_KEY = 'preview-gallery-open-sections';
  const urlOpen = params.get('open');
  const remembered = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(OPEN_KEY));
      return Array.isArray(saved) ? saved : null;
    } catch {
      return null;
    }
  };
  let openSections = urlOpen ? (urlOpen === 'all' ? 'all' : urlOpen.split(',')) : (remembered() ?? ['overview']);
  const isOpen = key => openSections === 'all' || openSections.includes(key);
  function rememberOpen() {
    openSections = [...document.querySelectorAll('details.sec[open]')].map(el => el.dataset.sec);
    if (urlOpen) return;
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(openSections)); } catch { /* storage unavailable: the page still works */ }
  }

  // The kind a head tag is managed under, as tagKey in scripts/share-previews/shared.ts names it: its meta name or
  // property, or for a link canonical, hreflang, "alternate <type>", icon, apple-touch-icon or its rel value.
  function tagKind(t) {
    if (t.tag === 'meta') {
      const key = String(t.name ?? t.property ?? '');
      return key.includes(':') ? key : key.toLowerCase();
    }
    const rel = String(t.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (rel.includes('canonical')) return 'canonical';
    if (rel.includes('alternate') && t.hreflang) return 'hreflang';
    if (rel.includes('alternate') && t.type) return `alternate ${String(t.type).toLowerCase()}`;
    if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) return 'apple-touch-icon';
    if (rel.includes('icon')) return 'icon';
    return rel.join(' ');
  }
  // theme-color as a list of { color, media }: one value, or one per media query (light and dark, say).
  const themeList = value => [].concat(value ?? []).map(item => (typeof item === 'string' ? { color: item } : item)).filter(item => item && item.color);
  const mainTheme = list => (list.find(item => !item.media) ?? list[0])?.color ?? '';

  // A page as the selected metadata describes it: the site source as it is, or the proposed metadata with the
  // selected share image. The canonical URL comes from the source; so do the icons, unless the proposal links icons
  // that render-icons.ts rendered.
  function effective(source) {
    if (state.meta === 'source' || !PROPOSED || !PROPOSED.pages[source.key]) return source;
    const prop = PROPOSED.pages[source.key];
    const p = structuredClone(source);
    const card = IMAGES.find(item => item.id === state.image);
    const image = card && card.local
      ? { url: PROPOSED.imageUrl, local: card.local, bytes: card.bytes, type: card.type, width: card.width, height: card.height, declaredType: card.type, declaredWidth: card.width, declaredHeight: card.height, alt: card.alt, xSafe: card.xSafe, crop11: card.crop11, textShare: card.textShare }
      : { ...home.og.image };
    const extraTags = prop.extraTags ?? [];
    const rendered = kind => {
      const link = extraTags.find(t => t.tag === 'link' && tagKind(t) === kind && t.href);
      return link ? ICONS.files.find(file => file.url === new URL(link.href, p.url).href && file.local) ?? null : null;
    };
    const icon = rendered('icon');
    const touch = rendered('apple-touch-icon');
    const themes = themeList(prop.themeColor);
    Object.assign(p, {
      title: prop.title,
      description: prop.description,
      robots: prop.robots,
      themeColor: mainTheme(themes),
      themeColors: themes,
      applicationName: prop.applicationName,
      appleTitle: prop.appleTitle,
      extraTags,
      icons: { favicon: icon?.local ?? p.icons.favicon, faviconUrl: icon?.url ?? p.icons.faviconUrl, touch: touch?.local ?? p.icons.touch, touchUrl: touch?.url ?? p.icons.touchUrl },
      og: { type: prop.ogType ?? 'website', url: p.url, siteName: prop.siteName, locale: prop.locale, title: prop.ogTitle, description: prop.ogDescription, image },
      twitter: { card: prop.twitterCard, title: prop.twitterTitle, description: prop.twitterDescription, image: { ...image }, imageAlt: image.alt || '', site: source.twitter.site || '', creator: source.twitter.creator || '', labels: prop.twitterLabels || [] },
      ld: { websiteName: PROPOSED.website.name, websiteAlternateName: PROPOSED.website.alternateName, types: prop.jsonLd ? [].concat(prop.jsonLd['@graph'] ?? prop.jsonLd).flatMap(node => [].concat(node['@type'] ?? [])) : [] },
      jsonLd: prop.jsonLd,
      status: prop.status,
      proposed: true,
    });
    return p;
  }
  let homeNow = home;

  const ICON = {
    globe: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.7 8h12.6M8 1.7c-2.2 2.4-2.2 10.2 0 12.6M8 1.7c2.2 2.4 2.2 10.2 0 12.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    ext: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5l-6 6M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10.6 10.6 3.4 3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    link: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.9.9M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.9-.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    ticks: '<svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true"><path d="M1 6l3 3 6-7M6.5 9.5l.5.5 6-8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // The search the search-engine mockups show: the site's query for the page, else the home page's query (or the
  // site name) followed by the page's label.
  function searchQuery(p) {
    const queries = CONFIG.searchQuery ?? {};
    if (queries[p.key]) return queries[p.key];
    const base = queries[home.key] ?? (homeNow.ld.websiteName || homeNow.og.siteName || new URL(p.url).hostname).toLowerCase();
    return p.key === home.key ? base : `${base} ${p.label.toLowerCase()}`;
  }

  // ---- Field resolution: what each page offers, with the fallbacks platforms use ----
  function fields(p) {
    const u = new URL(p.url);
    const ogImage = p.og.image && p.og.image.local ? p.og.image : null;
    const twImage = p.twitter.image && p.twitter.image.local ? p.twitter.image : ogImage;
    // Breadcrumb names from BreadcrumbList markup, after the home page item; Google desktop and Bing show them.
    const crumbList = p.jsonLd ? p.jsonLd['@graph'].find(node => node['@type'] === 'BreadcrumbList') : null;
    return {
      page: p,
      url: p.url,
      host: u.hostname,
      segments: u.pathname.split('/').filter(Boolean),
      crumbNames: crumbList ? crumbList.itemListElement.slice(1).map(item => item.name) : null,
      labels: p.twitter.labels || [],
      title: p.title || u.hostname,
      description: p.description,
      siteName: p.og.siteName,
      searchSiteName: homeNow.ld.websiteName || homeNow.og.siteName || u.hostname,
      shareTitle: p.og.title || p.twitter.title || p.title || u.hostname,
      shareDescription: p.og.description || p.twitter.description || p.description,
      image: ogImage,
      imageAlt: (p.og.image && p.og.image.alt) || p.twitter.imageAlt || '',
      hasOg: Boolean(p.og.title || p.og.description || p.og.image),
      twCard: p.twitter.card,
      twTitle: p.twitter.title || p.og.title || p.title,
      twImage,
      themeColor: p.themeColor,
      favicon: p.icons.favicon || home.icons.favicon,
      touchIcon: p.icons.touch || home.icons.touch,
      query: searchQuery(p),
    };
  }

  const field = (tag, cls, name, text) => `<${tag} class="${cls}" data-field="${name}">${esc(text)}</${tag}>`;
  // A field the platform trims to max UTF-8 bytes before layout. An ellipsis marks the cut, and data-trimmed makes
  // settle() list the field as cut short, like one the layout clips.
  const fieldBytes = (tag, cls, name, text, max) => {
    const value = String(text ?? '');
    if (utf8(value) <= max) return field(tag, cls, name, value);
    return `<${tag} class="${cls}" data-field="${name}" data-trimmed="${max}">${esc(fitBytes(value, max).trimEnd())}…</${tag}>`;
  };
  const img = (src, cls, alt = '') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}">`;
  const avatar = () => '<span class="av" aria-hidden="true">EU</span>';
  const skeleton = () => '<div class="sk" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
  const searchBox = f => `<div class="sbox"><span>${esc(f.query)}</span>${ICON.search}</div>`;
  const crumbs = f => (f.segments.length ? ` › ${f.segments.map(esc).join(' › ')}` : '');
  const markupCrumbs = f => (f.crumbNames ? ` › ${f.crumbNames.map(esc).join(' › ')}` : crumbs(f));
  const shortUrl = f => {
    const full = f.host + (f.segments.length ? `/${f.segments.join('/')}` : '');
    return full.length > 26 ? `${full.slice(0, 25)}…` : full;
  };

  // ---- Contrast (WCAG relative luminance) for the Discord stripe finding ----
  function luminance(hex) {
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  }
  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  // Discord reads theme-color only as #RRGGBB or #RRGGBBAA.
  const isHex = value => /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value || '');

  // Google Discover's large image: at least 1200 px wide, more than 300,000 pixels, with max-image-preview:large.
  const discoverLarge = f => Boolean(f.image && f.image.width >= 1200 && f.image.width * f.image.height > 300000 && /max-image-preview\s*:\s*large/i.test(f.page.robots));

  // ---- Platform renderers ----
  const R = {
    googleDesktop: f => `
      ${searchBox(f)}
      <div class="g-site">
        <span class="g-fav">${img(f.favicon, '')}</span>
        <span class="g-site-text"><span class="g-name">${esc(f.searchSiteName)}</span><span class="g-url">https://${esc(f.host)}${markupCrumbs(f)}</span></span>
        <span class="g-more" aria-hidden="true">⋮</span>
      </div>
      ${field('h3', 'g-title oneline', 'title', f.title)}
      ${field('div', 'g-snip clamp2', 'description', f.description)}
      ${skeleton()}`,

    googleMobile: f => `
      ${searchBox(f)}
      <div class="g-site">
        <span class="g-fav">${img(f.favicon, '')}</span>
        <span class="g-site-text"><span class="g-name">${esc(f.searchSiteName)}</span><span class="g-url">https://${esc(f.host)}</span></span>
        <span class="g-more" aria-hidden="true">⋮</span>
      </div>
      ${field('h3', 'g-title clamp3', 'title', f.title)}
      <div class="gm-body">
        ${field('div', 'g-snip clamp4', 'description', f.description)}
        ${f.image ? img(f.image.local, 'gm-thumb') : ''}
      </div>
      ${skeleton()}`,

    bing: f => `
      ${searchBox(f)}
      <div class="b-site">
        <span class="b-fav">${img(f.favicon, '')}</span>
        <span class="b-site-text"><span class="b-name">${esc(f.searchSiteName)}</span><span class="b-url">https://${esc(f.host)}${markupCrumbs(f)}</span></span>
      </div>
      ${field('h3', 'b-title oneline', 'title', f.title)}
      ${field('div', 'b-snip clamp2', 'description', f.description)}
      ${skeleton()}`,

    ddg: f => `
      ${searchBox(f)}
      <div class="d-site">
        <span class="d-fav">${img(f.favicon, '')}</span>
        <span class="d-name">${esc(f.host)}</span>
        <span class="d-url">https://${esc(f.host)}${crumbs(f)}</span>
      </div>
      ${field('h3', 'd-title oneline', 'title', f.title)}
      ${field('div', 'd-snip clamp2', 'description', f.description)}
      ${skeleton()}`,

    brave: f => `
      ${searchBox(f)}
      <div class="br-row">
        <div class="br-main">
          <div class="br-site">${img(f.favicon, '')}<span class="br-name">${esc(f.searchSiteName)}</span><span class="br-url">${esc(f.host)}${crumbs(f)}</span></div>
          ${field('h3', 'br-title oneline', 'title', f.title)}
          ${field('div', 'br-snip clamp3', 'description', f.description)}
        </div>
        ${f.image ? img(f.image.local, 'br-thumb') : ''}
      </div>
      ${skeleton()}`,

    facebook: f => `
      <div class="fb-post">
        <div class="fb-head">${avatar()}<div><b>Example User</b><small>Just now · ${ICON.globe}</small></div></div>
        <p class="fb-text">Example post text</p>
        <div class="fb-link">
          ${f.image ? img(f.image.local, 'wide-img', f.imageAlt) : ''}
          <div class="fb-meta">
            ${field('div', 'fb-domain oneline', 'domain', f.host)}
            ${field('div', 'fb-title clamp2', 'title', f.shareTitle)}
            ${field('div', 'fb-desc clamp1', 'description', f.shareDescription)}
          </div>
        </div>
        <div class="fb-actions"><span>Like</span><span>Comment</span><span>Share</span></div>
      </div>`,

    x: f => {
      const head = `<div class="x-head"><b>Example User</b><span>@example · 1m</span></div>`;
      const actions = '<div class="x-actions" aria-hidden="true"><span>Reply</span><span>Repost</span><span>Like</span><span>Views</span><span>Share</span></div>';
      if (!f.twCard && !f.hasOg) {
        return `<div class="x-post">${avatar()}<div>${head}<p class="x-text">Example post text <a>${esc(shortUrl(f))}</a></p>${actions}</div></div>`;
      }
      let card;
      if ((f.twCard || 'summary') === 'summary_large_image' && f.twImage) {
        card = `<div class="x-card">${img(f.twImage.local, 'wide-img', f.imageAlt)}${field('span', 'x-overlay oneline', 'title', f.twTitle)}</div><div class="x-from">From ${esc(f.host)}</div>`;
      } else {
        const thumb = f.twImage ? img(f.twImage.local, '') : `<span class="x-noimg">${ICON.link}</span>`;
        card = `<div class="x-card x-small">${thumb}<div class="x-sm">${field('span', 'oneline', 'domain', f.host)}${field('b', 'clamp1', 'title', f.twTitle)}${field('span', 'clamp2', 'description', f.shareDescription)}</div></div>`;
      }
      return `<div class="x-post">${avatar()}<div>${head}<p class="x-text">Example post text</p>${card}${actions}</div></div>`;
    },

    linkedin: f => `
      <div class="li-post">
        <div class="li-head">${avatar()}<div><b>Example User</b><small>Example headline</small><small>Now · ${ICON.globe}</small></div></div>
        <p class="li-text">Example post text</p>
        ${f.image
          ? `<div>${img(f.image.local, 'wide-img', f.imageAlt)}<div class="li-meta">${field('div', 'li-title clamp2', 'title', f.shareTitle)}${field('div', 'li-domain oneline', 'domain', f.host)}</div></div>`
          : `<div class="li-small"><span class="li-ph">${ICON.link}</span><div>${field('div', 'li-title clamp2', 'title', f.shareTitle)}${field('div', 'li-domain oneline', 'domain', f.host)}</div></div>`}
        <div class="li-actions"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div>
      </div>`,

    reddit: f => `
      <div class="rd-head"><span class="rd-sub"></span><b>${esc(CONFIG.redditCommunity ?? 'r/example')}</b><span>· 1 hr. ago</span></div>
      <div class="rd-main">
        <div>
          <h3 class="rd-title">Example post title written by the poster</h3>
          <span class="rd-domain">${esc(f.host)} ${ICON.ext}</span>
        </div>
        <div class="rd-thumb">${f.image ? img(f.image.local, '') : ICON.link}<span class="rd-badge">${ICON.ext}</span></div>
      </div>
      <div class="rd-actions" aria-hidden="true"><span>Vote 12</span><span>3 comments</span><span>Share</span></div>`,

    bluesky: f => `
      <div class="bs-post">${avatar()}<div>
        <div class="bs-head"><b>Example User</b><span>@example.bsky.social · 1m</span></div>
        <p class="bs-text">Example post text</p>
        <div class="bs-embed">
          ${f.image ? img(f.image.local, 'wide-img', f.imageAlt) : ''}
          <div class="bs-meta">
            ${field('div', 'bs-title clamp3', 'title', f.shareTitle)}
            ${field('div', 'bs-desc clamp2', 'description', f.shareDescription)}
            <div class="bs-domain">${ICON.globe}${esc(f.host)}</div>
          </div>
        </div>
      </div></div>`,

    mastodon: f => `
      <div class="ms-head">${avatar()}<div><b>Example User</b><span>@example@mastodon.social</span></div><time>1m</time></div>
      <p class="ms-text">Example post text</p>
      <div class="ms-card">
        ${f.image ? img(f.image.local, 'wide-img', f.imageAlt) : ''}
        <div class="ms-meta">
          ${field('span', 'ms-prov oneline', 'site name', f.siteName || f.host)}
          ${field('strong', 'ms-title clamp2', 'title', f.shareTitle)}
          ${field('span', 'ms-desc clamp2', 'description', f.shareDescription)}
        </div>
      </div>`,

    threads: f => `
      <div class="th-post">${avatar()}<div>
        <div class="th-head"><b>example</b><span>1m</span></div>
        <p class="th-text">Example post text</p>
        <div class="th-card">
          ${f.image ? img(f.image.local, 'wide-img', f.imageAlt) : ''}
          <div class="th-meta">${field('div', 'th-domain oneline', 'domain', f.host)}${field('div', 'th-title clamp2', 'title', f.shareTitle)}</div>
        </div>
      </div></div>`,

    discord: f => {
      const stripe = isHex(f.themeColor) ? ` style="--stripe:${esc(f.themeColor)}"` : '';
      const large = (f.twCard === 'summary_large_image') && f.image;
      return `
      <div class="dc-msg">${avatar()}<div>
        <div class="dc-head"><b>Example User</b><span>Today at 12:04</span></div>
        <div class="dc-text"><a>${esc(f.url)}</a></div>
        <div class="dc-embed"${stripe}>
          ${f.siteName ? field('div', 'dc-prov', 'site name', f.siteName) : ''}
          ${fieldBytes('div', 'dc-title clamp3', 'title', f.shareTitle, DISCORD_TITLE_BYTES)}
          ${f.shareDescription ? fieldBytes('div', 'dc-desc', 'description', f.shareDescription, DISCORD_DESCRIPTION_BYTES) : ''}
          ${large ? img(f.image.local, 'dc-img', f.imageAlt) : ''}
        </div>
      </div></div>`;
    },

    slack: f => `
      <div class="sl-msg"><span class="av" aria-hidden="true">EU</span><div>
        <div class="sl-head"><b>Example User</b><span>12:04 PM</span></div>
        <div class="sl-text"><a>${esc(f.url)}</a></div>
        <div class="sl-att">
          <div class="sl-svc">${img(f.favicon, '')}<span>${esc(f.siteName || f.host)}</span></div>
          ${field('div', 'sl-title', 'title', f.shareTitle)}
          ${f.shareDescription ? field('div', 'sl-desc', 'description', f.shareDescription) : ''}
          ${f.labels.length ? `<div class="sl-fields">${f.labels.map(([label, data]) => `<div><b>${esc(label)}</b><span>${esc(data)}</span></div>`).join('')}</div>` : ''}
          ${f.image ? img(f.image.local, 'sl-img', f.imageAlt) : ''}
        </div>
      </div></div>`,

    teams: f => `
      <div class="tm-msg"><span class="av" aria-hidden="true">EU</span><div class="tm-bub">
        <div class="tm-head"><b>Example User</b>12:04 PM</div>
        <div class="tm-text"><a>${esc(f.url)}</a></div>
        <div class="tm-card">
          ${f.image ? img(f.image.local, '', f.imageAlt) : ''}
          <div class="tm-meta">
            ${field('div', 'tm-title clamp2', 'title', f.shareTitle)}
            ${field('div', 'tm-desc clamp2', 'description', f.shareDescription)}
            ${field('div', 'tm-domain oneline', 'domain', f.host)}
          </div>
        </div>
      </div></div>`,

    telegram: f => `
      <div class="tg-bub">
        <div class="tg-text">${esc(f.url)}</div>
        <div class="tg-prev">
          ${f.siteName ? field('div', 'tg-site', 'site name', f.siteName) : ''}
          ${field('div', 'tg-title', 'title', f.shareTitle)}
          ${f.shareDescription ? field('div', 'tg-desc', 'description', f.shareDescription) : ''}
          ${f.image ? img(f.image.local, 'tg-img', f.imageAlt) : ''}
        </div>
        <div class="tg-time">12:04</div>
      </div>`,

    whatsapp: f => `
      <div class="wa-row"><div class="wa-bub">
        <div class="wa-prev">
          ${f.image ? img(f.image.local, 'wide-img', f.imageAlt) : ''}
          <div class="wa-meta">
            ${field('div', 'wa-title clamp2', 'title', f.shareTitle)}
            ${field('div', 'wa-desc clamp2', 'description', f.shareDescription)}
            ${field('div', 'wa-domain oneline', 'domain', f.host)}
          </div>
        </div>
        <div class="wa-text">${esc(f.url)}</div>
        <div class="wa-foot">12:04 ${ICON.ticks}</div>
      </div></div>`,

    // Messages ignores an image under 150 px wide or shows it as an icon (Apple TN3156).
    imessage: f => {
      const icon = f.touchIcon || f.favicon;
      return `
      <div class="im-row">
        <div class="im-bub">
          ${f.image && !(f.image.width < 150)
            ? `${img(f.image.local, 'wide-img', f.imageAlt)}<div class="im-meta">${field('div', 'im-title clamp2', 'title', f.shareTitle)}${field('div', 'im-domain oneline', 'domain', f.host)}</div>`
            : `<div class="im-small"><div class="im-meta">${field('div', 'im-title clamp2', 'title', f.shareTitle)}${field('div', 'im-domain oneline', 'domain', f.host)}</div>${icon ? img(icon, '') : ''}</div>`}
        </div>
        <div class="im-status">Delivered</div>
      </div>`;
    },

    // Discover shows a large image only when the page allows large previews and the image is at least 1200 px wide.
    discover: f => {
      const large = discoverLarge(f);
      return `
      <div class="dv-card">
        ${large ? img(f.image.local, 'dv-img', f.imageAlt) : ''}
        <div class="dv-body">
          <div class="dv-row">${field('div', 'dv-title clamp3', 'title', f.title)}${!large && f.image ? img(f.image.local, 'dv-thumb') : ''}</div>
          <div class="dv-site"><span class="g-fav">${img(f.favicon, '')}</span><span>${esc(f.searchSiteName)}</span><span>· 1d</span></div>
        </div>
      </div>`;
    },

    signal: f => `
      <div class="sg-row"><div class="sg-bub">
        <div class="sg-prev">
          ${f.image ? img(f.image.local, 'wide-img', f.imageAlt) : ''}
          <div class="sg-meta">
            ${field('div', 'sg-title clamp2', 'title', f.shareTitle)}
            ${field('div', 'sg-desc clamp2', 'description', f.shareDescription)}
            ${field('div', 'sg-domain oneline', 'domain', f.host)}
          </div>
        </div>
        <div class="sg-text">${esc(f.url)}</div>
        <div class="sg-time">12:04</div>
      </div></div>`,
  };

  // ---- Mock catalogue ----
  const c = name => `<code>${esc(name)}</code>`;
  const MOCKS = [
    { id: 'google-desktop', group: 'search', name: 'Google', variant: 'desktop', w: 692, conf: 'high', frame: 'p-google', render: R.googleDesktop,
      notes: f => [`Reads ${c('<title>')}, the meta description, the favicon, and the site name from the WebSite JSON-LD (“${esc(f.searchSiteName)}”). Google can rewrite the title or snippet.`] },
    { id: 'google-mobile', group: 'search', name: 'Google', variant: 'phone', w: 390, conf: 'high', frame: 'p-google mobile', render: R.googleMobile,
      notes: f => ['Titles wrap onto more lines on phones.',
        f.image ? `A thumbnail like this one can appear; Google picks the image and crops it square. ${/max-image-preview:large/.test(f.page.robots) ? `${c('max-image-preview:large')} is set, which allows it.` : ''}` : 'No share image on this page, so no thumbnail.'] },
    { id: 'bing', group: 'search', name: 'Bing', variant: 'desktop', w: 680, conf: 'medium', frame: 'p-bing', render: R.bing,
      notes: () => [`Reads ${c('<title>')} and the meta description. Yahoo and Ecosia show results from Bing’s index.`] },
    { id: 'duckduckgo', group: 'search', name: 'DuckDuckGo', variant: 'desktop', w: 680, conf: 'medium', frame: 'p-ddg', render: R.ddg,
      notes: () => [`Reads ${c('<title>')} and the meta description; most of its results come from Bing’s index.`] },
    { id: 'brave', group: 'search', name: 'Brave Search', variant: 'desktop', w: 680, conf: 'medium', frame: 'p-brave', render: R.brave,
      notes: f => [`Runs its own index. ${f.image ? `Often shows ${c('og:image')} as a thumbnail beside the result.` : 'No share image, so no thumbnail.'}`] },
    { id: 'google-discover', group: 'search', name: 'Google Discover', variant: 'feed', w: 412, conf: 'medium', frame: 'p-discover', render: R.discover,
      notes: f => [discoverLarge(f)
        ? `A large image: ${c('max-image-preview:large')} is set and the image is ${f.image.width} px wide. Google crops it, usually toward 16:9.`
        : `A small thumbnail at most. Discover shows large images only when ${c('max-image-preview:large')} is set and the image is at least 1200 px wide with more than 300,000 pixels.`,
      'Google does not document which title Discover shows; this mockup uses the page title. Avoid a logo or a text-heavy image as the share image.'] },

    { id: 'facebook', group: 'social', name: 'Facebook', variant: 'feed', w: 532, conf: 'high', frame: 'p-fb', render: R.facebook,
      notes: f => [`Reads ${c('og:title')}, ${c('og:description')}, ${c('og:image')}. ${f.image ? 'The 1200 × 630 image fills the card.' : 'Without an image the card is text only.'}`,
        'The description line is often hidden, and phones usually drop it.'] },
    { id: 'x', group: 'social', name: 'X', variant: 'timeline', w: 598, conf: 'high', frame: 'p-x', render: R.x,
      notes: f => (!f.twCard && !f.hasOg
        ? ['No X or Open Graph tags on this page, so X shows the bare link with no card.']
        : [f.page.twitter.title
          ? `Reads ${c('twitter:card')} (${esc(f.twCard || 'not set, so summary')}), ${c('twitter:title')} and ${c('twitter:image')}, falling back to Open Graph.`
          : `Reads ${c('twitter:card')} (${esc(f.twCard || 'not set, so summary')}); the title and image come from ${c('og:title')} and ${c('og:image')}, which X uses when its own tags are absent.`,
          'X shows only the title, laid over the image’s bottom-left corner, and “From domain” below it. The description is not displayed.']) },
    { id: 'linkedin', group: 'social', name: 'LinkedIn', variant: 'feed', w: 587, conf: 'medium', frame: 'p-li', render: R.linkedin,
      notes: () => [`Reads ${c('og:title')}, ${c('og:image')} and the domain; the description is not shown.`,
        'LinkedIn has also shown links as a smaller card with the image as a thumbnail. Its Post Inspector shows which one a URL gets and refreshes LinkedIn’s cached copy.'] },
    { id: 'reddit', group: 'social', name: 'Reddit', variant: 'feed', w: 640, conf: 'medium', frame: 'p-rd', render: R.reddit,
      notes: () => ['The post title is whatever the poster types; Reddit does not use the page title.',
        `${c('og:image')} becomes a small thumbnail cropped from the center.`] },
    { id: 'bluesky', group: 'social', name: 'Bluesky', variant: 'feed', w: 600, conf: 'high', frame: 'p-bs', render: R.bluesky,
      notes: () => ['The posting app fetches the title, description and image once, when the post is written. Later changes to the page do not update existing posts.'] },
    { id: 'mastodon', group: 'social', name: 'Mastodon', variant: 'web', w: 560, conf: 'medium', frame: 'p-ms', render: R.mastodon,
      notes: () => ['Each server fetches and caches its own copy of the card. How much text shows varies with the server’s Mastodon version.'] },
    { id: 'threads', group: 'social', name: 'Threads', variant: 'feed', w: 560, conf: 'medium', frame: 'p-th', render: R.threads,
      notes: () => [`Shows ${c('og:image')}, the domain and ${c('og:title')}.`] },

    { id: 'discord', group: 'chat', name: 'Discord', variant: 'chat', w: 540, conf: 'high', frame: 'p-dc', render: R.discord,
      notes: f => {
        const out = [`Reads ${c('og:site_name')}, ${c('og:title')}, ${c('og:description')}, ${c('og:image')}; ${c('twitter:card')} ${c('summary_large_image')} makes the image large. ${c('theme-color')} colors the left stripe.`];
        if (isHex(f.themeColor)) {
          const bg = state.theme === 'dark' ? '#2b2d31' : '#f2f3f5';
          out.push(`Stripe ${esc(f.themeColor)} against this theme’s embed background: ${contrast(f.themeColor, bg).toFixed(2)}:1.`);
        }
        const over = [['title', f.shareTitle, DISCORD_TITLE_BYTES], ['description', f.shareDescription, DISCORD_DESCRIPTION_BYTES]].filter(([, text, max]) => utf8(text) > max);
        if (over.length) out.push(`Discord trims ${over.map(([name, text, max]) => `the ${name} (${utf8(text)} bytes) to ${max} bytes`).join(' and ')}; the mockup shows what is left.`);
        return out;
      } },
    { id: 'slack', group: 'chat', name: 'Slack', variant: 'chat', w: 600, conf: 'high', frame: 'p-sl', render: R.slack,
      notes: () => [`Shows the site name with the favicon, ${c('og:title')}, ${c('og:description')} and the image up to 360 px wide. Workspace admins can turn previews off.`] },
    { id: 'teams', group: 'chat', name: 'Microsoft Teams', variant: 'chat', w: 560, conf: 'medium', frame: 'p-tm', render: R.teams,
      notes: () => ['Shows a thumbnail cropped from the image, the title, the description and the domain.'] },
    { id: 'telegram', group: 'chat', name: 'Telegram', variant: 'chat', w: 420, conf: 'high', frame: 'p-tg', render: R.telegram,
      notes: () => [`Shows ${c('og:site_name')}, ${c('og:title')}, ${c('og:description')} and a large image. Telegram caches previews; @WebpageBot refreshes them.`] },
    { id: 'whatsapp', group: 'chat', name: 'WhatsApp', variant: 'chat', w: 420, conf: 'high', frame: 'p-wa', render: R.whatsapp,
      notes: f => [`Shows ${c('og:image')}, ${c('og:title')}, ${c('og:description')} and the domain.`,
        f.image ? `The image is ${kb(f.image.bytes)}. WhatsApp asks for under 600 KB and at least 300 px wide${f.image.bytes >= 600000 ? ', so this image may get no preview' : ''}.` : 'No image, so the preview is text only.'] },
    { id: 'imessage', group: 'chat', name: 'iMessage', variant: 'Messages', w: 360, conf: 'high', frame: 'p-im', render: R.imessage,
      notes: f => [`Shows ${c('og:image')}, ${c('og:title')} and the domain; no description. Apple asks for images at least 900 px wide and square icons at least 108 px.`,
        f.image && !(f.image.width < 150)
          ? `${f.image.width < 900 ? `This image is ${f.image.width} px wide, under Apple's 900 px. ` : ''}Without an image it would show the apple-touch-icon beside the title instead.`
          : `${f.image ? 'The share image is under 150 px wide, so Messages treats it as an icon and' : 'No share image, so it'} shows the apple-touch-icon (or the favicon) beside the title.`] },
    { id: 'signal', group: 'chat', name: 'Signal', variant: 'chat', w: 380, conf: 'medium', frame: 'p-sg', render: R.signal,
      notes: () => ['The sender’s app fetches the preview before sending; the recipient never contacts the site.'] },
  ];

  // The mockup sections, in the order the gallery shows them.
  const MOCK_GROUPS = [
    { key: 'search', title: 'Search engines',
      intro: f => {
        const appType = (homeNow.ld.types ?? []).find(type => /Application$/.test(type));
        const rated = (homeNow.jsonLd?.['@graph'] ?? []).some(node => node.aggregateRating || node.review);
        const appNote = appType && !rated ? ` Google’s software-app rich result needs ratings or reviews as well as a price, and the home page’s ${c(appType)} JSON-LD has neither, so a plain result like these is what to expect.` : '';
        const ownLd = f.page.key !== home.key && !(f.page.ld?.types ?? []).length ? ' This page has no JSON-LD of its own; Google takes the site name from the home page.' : '';
        return `Search results use ${c('<title>')} and the meta description, and the engine may rewrite either.${appNote}${ownLd}`;
      } },
    { key: 'social', title: 'Social networks', intro: () => `Feed cards read Open Graph tags; X reads its own ${c('twitter:')} tags first.` },
    { key: 'chat', title: 'Messaging and team chat', intro: () => 'Chat apps fetch the page when a link is pasted or sent, then cache what they got.' },
  ];

  // ---- Findings for the selected page ----
  function findings(f) {
    const out = [];
    for (const brand of new Set([homeNow.og.siteName, homeNow.ld.websiteName].filter(Boolean))) {
      const suffix = new RegExp(`\\s[|:\\-\\u2013\\u2014]\\s*${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
      if (suffix.test(f.shareTitle) || suffix.test(f.title)) {
        out.push({ warn: true, html: `<b>Brand repeated in the title.</b> The title ends with “${esc(f.shareTitle.match(suffix)?.[0]?.trim() ?? f.title.match(suffix)[0].trim())}”, but every surface already names the site: Google prints the site name “${esc(f.searchSiteName)}” above the title; Discord, Slack, Telegram and Mastodon print ${c('og:site_name')} above it; X, Facebook and LinkedIn print the domain. Meta’s sharing guide asks for ${c('og:title')} without branding such as the site name.` });
        break;
      }
    }
    if (f.siteName && homeNow.ld.websiteName && f.siteName !== homeNow.ld.websiteName) {
      out.push({ warn: false, html: `<b>Two site names, each where it belongs.</b> Google’s site-name line reads the WebSite JSON-LD: “${esc(homeNow.ld.websiteName)}”. Discord, Slack, Telegram and Mastodon print ${c('og:site_name')} above the title: “${esc(f.siteName)}”.` });
    }
    // The site's own writing checks (siteconfig.js).
    for (const check of CONFIG.textChecks ?? []) {
      const pattern = new RegExp(check.pattern, check.flags ?? '');
      if ((check.fields ?? ['description']).some(name => pattern.test(f[name] ?? ''))) out.push({ warn: check.warn !== false, html: check.html });
    }
    if (!f.hasOg && !f.twCard) {
      out.push({ warn: true, html: `<b>No share tags on this page.</b> It has no Open Graph or X tags, so X shows a bare link, and Facebook, LinkedIn, WhatsApp, iMessage and the rest build text-only previews from ${c('<title>')} and the meta description.` });
    }
    if (isHex(f.themeColor)) {
      const dark = contrast(f.themeColor, '#2b2d31');
      const light = contrast(f.themeColor, '#f2f3f5');
      if (dark < 1.5) {
        out.push({ warn: true, html: `<b>Discord stripe.</b> Discord paints the embed’s left stripe with ${c('theme-color')} ${esc(f.themeColor)}. On Discord’s dark theme that is ${dark.toFixed(2)}:1 against the embed, so the stripe all but disappears; on the light theme it is a near-black bar (${light.toFixed(1)}:1). The same value also tints mobile browser bars.` });
      } else {
        out.push({ warn: false, html: `<b>Discord stripe.</b> ${c('theme-color')} ${esc(f.themeColor)} gives Discord’s embed stripe ${dark.toFixed(1)}:1 on the dark theme and ${light.toFixed(1)}:1 on the light theme, so it stands out on the dark theme; on the light theme it shows by its color more than its brightness. The page’s own design does not use this tag; Chrome on Android also paints its address bar with it.` });
      }
    } else if (f.themeColor) {
      out.push({ warn: true, html: `<b>Discord stripe.</b> ${c('theme-color')} is ${esc(f.themeColor)}, but Discord reads only ${c('#RRGGBB')} or ${c('#RRGGBBAA')}, so its embed gets no stripe. Browsers accept any CSS color.` });
    }
    if ((f.page.themeColors ?? []).length > 1) {
      out.push({ warn: false, html: `<b>Theme color per color scheme.</b> ${f.page.themeColors.map(t => `${esc(t.color)}${t.media ? ` for ${c(t.media)}` : ''}`).join(', ')}. Browsers pick the tag whose media query matches. Discord does not document which tag it reads; the mockups use ${esc(f.themeColor)}.` });
    }
    if (f.image) {
      const img = f.image;
      if (img.declaredWidth && (img.declaredWidth !== img.width || img.declaredHeight !== img.height)) {
        out.push({ warn: true, html: `<b>Image size mismatch.</b> ${c('og:image:width/height')} say ${img.declaredWidth} × ${img.declaredHeight}, but the file is ${img.width} × ${img.height}.` });
      }
      if (f.twCard === 'summary_large_image') {
        out.push(img.xSafe
          ? { warn: false, html: '<b>X title box.</b> X lays the title over the image’s bottom-left corner; this card keeps that corner empty.' }
          : { warn: true, html: '<b>X title box.</b> X lays the title over the image’s bottom-left corner, so anything the share image has there is hidden on X (see the X mockup).' });
      }
      if (img.textShare) {
        out.push({ warn: img.textShare >= 20, html: `<b>Text in the image.</b> Text covers ${img.textShare}% of this card. Meta reports that images with less than 20% text perform better.` });
      }
      out.push(img.crop11
        ? { warn: false, html: '<b>Thumbnail crops.</b> Reddit (4:3), Google on phones and Teams (1:1) crop from the center. Every word on this card sits inside the center square, so every crop keeps all of its text (see the crop panel).' }
        : { warn: true, html: '<b>Thumbnail crops.</b> Reddit, Teams and Google on phones crop the share image from the center, and some of this image’s text falls outside the crops (see the crop panel).' });
    }
    // The site's own notes on its pages (siteconfig.js).
    for (const note of CONFIG.findings ?? []) out.push({ warn: note.warn === true, html: note.html });
    if (len(f.title) > 60) out.push({ warn: true, html: `<b>Long title.</b> ${len(f.title)} characters; Google desktop cuts at about 600 px.` });
    if (AUDIT) {
      const mode = f.page.proposed ? 'proposed' : 'source';
      const items = [...(AUDIT.pages?.[f.page.key]?.[mode] ?? []), ...(AUDIT.site?.[mode] ?? [])];
      const errors = items.filter(item => item.level === 'error').length;
      const checks = items.filter(item => item.level === 'warn').length;
      out.push({ warn: errors + checks > 0, html: `<b>Metadata audit.</b> ${errors} errors and ${checks} checks for this page and the site files${errors + checks ? '; see the audit section' : ''}.` });
    }
    return out;
  }

  // ---- Metadata table ----
  function metaRows(p) {
    const img = p.og.image;
    const STATUS = { owner: 'Your decision', fix: 'Proposed fix', same: 'Unchanged' };
    const statusKey = { '<title>': 'title', 'meta description': 'description' };
    const row = (name, value, size, guide) => {
      const status = p.proposed ? (p.status?.[statusKey[name] ?? name] ?? 'same') : null;
      return `<tr><td>${c(name)}</td><td>${value ? esc(value) : `<span class="unset">${p.proposed && status === 'fix' ? 'removed' : 'not set'}</span>`}</td><td>${size ?? ''}</td>${p.proposed ? `<td class="st st-${status}">${STATUS[status]}</td>` : ''}<td>${guide}</td></tr>`;
    };
    const chars = text => (text ? `${len(text)} ch` : '');
    return [
      row('<title>', p.title, chars(p.title), 'Google cuts titles to the result’s width: about 600 px on desktop in observed results.'),
      row('meta description', p.description, chars(p.description), 'Google cuts snippets to fit the device: about two lines on desktop in observed results, less on phones.'),
      row('canonical', p.canonical, '', 'The URL that shares and search results are grouped under.'),
      row('robots', p.robots, '', `${c('index')} and ${c('follow')} are the defaults and need no tag; ${c('max-image-preview:large')} lets Google show large image previews.`),
      row('theme-color', (p.themeColors ?? []).length > 1 ? p.themeColors.map(t => `${t.color}${t.media ? ` for ${t.media}` : ''}`).join(', ') : p.themeColor, '', 'Discord’s embed stripe (hex only) and mobile browser bars; not used by the page’s own design.'),
      ...(p.proposed ? [
        row('application-name', p.applicationName, '', 'The website’s name where a browser or OS labels a pinned site.'),
        row('apple-mobile-web-app-title', p.appleTitle, '', 'The short name under the icon when the site is added to an iPhone or iPad home screen.'),
      ] : []),
      row('og:type', p.og.type, '', ''),
      row('og:url', p.og.url, '', 'Should equal the canonical URL.'),
      row('og:site_name', p.og.siteName, '', 'Discord, Slack, Telegram and Mastodon show it above the title.'),
      row('og:title', p.og.title, chars(p.og.title), 'Facebook shows up to two lines.'),
      row('og:description', p.og.description, chars(p.og.description), 'Often hidden in feeds; chat apps show it.'),
      row('og:image', img && img.url, img && img.local ? `${img.width} × ${img.height} · ${kb(img.bytes)}` : '', img && img.local ? (img.declaredWidth === img.width && img.declaredHeight === img.height ? 'Declared size matches the file. Meta asks for about 1.91:1 and at least 1080 px wide, LinkedIn for at least 1200 × 627, WhatsApp for under 600 KB.' : 'Declared size does not match the file.') : 'Meta asks for about 1.91:1 and at least 1080 px wide.'),
      row('og:image:alt', img && img.alt, chars(img && img.alt), 'Read aloud by screen readers; X allows 420 characters.'),
      row('twitter:card', p.twitter.card, '', `${c('summary_large_image')} gives X’s large card.`),
      row('twitter:title', p.twitter.title, chars(p.twitter.title), `X falls back to ${c('og:title')} when this is absent.`),
      row('twitter:description', p.twitter.description, chars(p.twitter.description), `X falls back to ${c('og:description')}, and no longer displays it anyway.`),
      row('twitter:image', p.twitter.image && p.twitter.image.url, '', `X falls back to ${c('og:image')}.`),
      row('twitter:image:alt', p.twitter.imageAlt, chars(p.twitter.imageAlt), `X falls back to ${c('og:image:alt')}.`),
      ...(p.twitter.labels || []).flatMap(([label, data], index) => [
        row(`twitter:label${index + 1}`, label, '', 'Slack shows each label and data pair under its preview; X ignores them.'),
        row(`twitter:data${index + 1}`, data, '', ''),
      ]),
      row('JSON-LD WebSite name', p.ld.websiteName, '', 'Google’s site name above results; it uses the home page’s.'),
      ...(p.extraTags ?? []).filter(t => !['icon', 'apple-touch-icon'].includes(tagKind(t))).map(t => row(tagKind(t), t.content ?? t.href, '', extraGuide(t))),
      row('icon', iconValue('icon', p.icons.faviconUrl), '', 'Search results, Discover and Slack. Google reads BMP, GIF, ICO, PNG, JPEG, PPM and TIFF, not SVG.'),
      row('apple-touch-icon', iconValue('apple-touch-icon', p.icons.touchUrl), '', 'iMessage’s icon when there is no share image, and the Home Screen icon on iPhone and iPad.'),
    ].join('');
    function iconValue(kind, fallback) {
      const links = (p.extraTags ?? []).filter(t => tagKind(t) === kind && t.href);
      return links.length ? links.map(t => `${t.href}${t.sizes ? ` (${t.sizes})` : ''}`).join(', ') : fallback;
    }
  }

  // What an extra proposed tag is for, by its kind.
  function extraGuide(t) {
    const kind = tagKind(t);
    const known = {
      hreflang: `Another language version of the page (${esc(t.hreflang ?? '')}); every version lists every other one and itself.`,
      'alternate application/rss+xml': 'Feed autodiscovery for readers and browsers.',
      'alternate application/atom+xml': 'Feed autodiscovery for readers and browsers.',
      'alternate application/feed+json': 'Feed autodiscovery for readers and browsers.',
      'alternate application/json+oembed': 'oEmbed discovery; Discord reads the first such link.',
      me: 'Identity link: Mastodon verifies a profile link when the page links back with rel="me".',
      'fediverse:creator': 'The author byline on Mastodon link cards, for domains the author allows.',
      manifest: 'The web app manifest: install name, icons and display mode.',
      'apple-itunes-app': 'Safari’s Smart App Banner for the site’s iOS app.',
      'color-scheme': 'The color schemes the page supports, so the browser can match form controls and the canvas.',
    };
    return known[kind] ?? (/verif|validate/i.test(kind) ? 'Site ownership verification. Google keeps checking its token; Pinterest lets its tag go once the site is claimed.' : '');
  }

  // ---- Crop panel ----
  function cropPanel(f) {
    if (!f.image) return `<p class="intro">This page has no ${c('og:image')}, so there is nothing to crop; platforms show text-only previews or the site icon.</p>`;
    const W = f.image.width;
    const H = f.image.height;
    const crops = [
      { ratio: W / H, title: `Full image (${(W / H).toFixed(2)} : 1)`, who: 'Facebook, LinkedIn, Bluesky, Threads, WhatsApp, iMessage, Signal, Discord, Slack, Telegram.' },
      { ratio: 2, title: '2 : 1', who: 'X’s documented large-card ratio; trims a strip from the top and bottom.' },
      { ratio: 4 / 3, title: '4 : 3 from the center', who: 'Reddit’s thumbnail.' },
      { ratio: 1, title: '1 : 1 from the center', who: 'Google on phones, Teams.' },
      { ratio: 16 / 9, title: '16 : 9 from the center', who: 'Google Discover’s large card; Google crops automatically.' },
    ];
    return `<div class="crops">${crops.map(crop => {
      let cw = W;
      let ch = W / crop.ratio;
      if (ch > H) { ch = H; cw = H * crop.ratio; }
      const style = `left:${((W - cw) / 2 / W) * 100}%;top:${((H - ch) / 2 / H) * 100}%;width:${(cw / W) * 100}%;height:${(ch / H) * 100}%`;
      return `<figure class="crop" style="margin:0"><div class="crop-box">${img(f.image.local, '', '')}<span class="crop-rect" style="${style}"></span></div><h3>${esc(crop.title)}</h3><p>${esc(crop.who)}</p></figure>`;
    }).join('')}</div>`;
  }

  // The proposed <head> metadata as markup, ready to compare with the source file.
  // scripts/share-previews/proposed-markup.ts writes the same markup for the metadata audit; keep the two in step.
  function headMarkup(p) {
    const a = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const meta = (key, value, attr = 'name') => (value ? `<meta ${attr}="${key}" content="${a(value)}">` : null);
    const tag = t => `<${t.tag}${Object.entries(t).filter(([key, value]) => key !== 'tag' && value !== undefined && value !== null).map(([key, value]) => ` ${key}="${a(value)}"`).join('')}>`;
    const img = p.og.image && p.og.image.url ? p.og.image : null;
    const lines = [
      `<title>${a(p.title)}</title>`,
      meta('description', p.description),
      p.canonical ? `<link rel="canonical" href="${a(p.canonical)}">` : null,
      meta('robots', p.robots),
      ...themeList(p.themeColors ?? p.themeColor).map(t => `<meta name="theme-color" content="${a(t.color)}"${t.media ? ` media="${a(t.media)}"` : ''}>`),
      meta('application-name', p.applicationName),
      meta('apple-mobile-web-app-title', p.appleTitle),
      meta('og:type', p.og.type, 'property'),
      meta('og:url', p.og.url, 'property'),
      meta('og:site_name', p.og.siteName, 'property'),
      meta('og:locale', p.og.locale, 'property'),
      meta('og:title', p.og.title, 'property'),
      meta('og:description', p.og.description, 'property'),
      meta('og:image', img && img.url, 'property'),
      meta('og:image:type', img && img.type, 'property'),
      meta('og:image:width', img && img.width && String(img.width), 'property'),
      meta('og:image:height', img && img.height && String(img.height), 'property'),
      meta('og:image:alt', img && img.alt, 'property'),
      meta('twitter:card', p.twitter.card),
      meta('twitter:title', p.twitter.title),
      meta('twitter:description', p.twitter.description),
      meta('twitter:image', p.twitter.image && p.twitter.image.url),
      meta('twitter:image:alt', p.twitter.imageAlt),
      ...(p.twitter.labels || []).flatMap(([label, data], index) => [meta(`twitter:label${index + 1}`, label), meta(`twitter:data${index + 1}`, data)]),
      ...(p.extraTags ?? []).map(tag),
    ].filter(Boolean);
    if (p.jsonLd) {
      const json = JSON.stringify(p.jsonLd, null, 2).split('\n').map(line => `  ${line}`).join('\n');
      lines.push(`<script type="application/ld+json">\n${json}\n</script>`);
    }
    return lines.join('\n');
  }

  // ---- Sections ----
  // Every part of the gallery is a collapsible section: a heading with a short summary and status chips, then its
  // body. The contents list on the left is built from the same list of sections.
  const chip = (html, kind = '') => `<span class="chip${kind ? ` ${kind}` : ''}">${html}</span>`;
  function section(s) {
    return `
      <details class="sec" id="sec-${s.key}" data-sec="${s.key}"${isOpen(s.key) ? ' open' : ''}>
        <summary><span class="sec-head"><h2>${esc(s.title)}</h2>${s.sub ? `<span class="sec-sub">${s.sub}</span>` : ''}</span><span class="badges" data-badges="${s.key}">${(s.badges ?? []).join('')}</span></summary>
        <div class="sec-body">${s.body}</div>
      </details>`;
  }
  // A collapsible part inside a section, such as one proposed file.
  const subsection = (id, heading, body, open) => `<details class="sub" id="${id}"${open ? ' open' : ''}><summary>${heading}</summary><div class="sub-body">${body}</div></details>`;

  function mockCard(m, f) {
    const notes = [...m.notes(f), ...(CONFIG.platformNotes?.[m.id] ?? []).map(esc)].filter(Boolean);
    return `
      <article class="mock" id="mock-${m.id}" data-id="${m.id}" data-name="${esc(m.name)}" data-variant="${esc(m.variant)}" style="--w:${m.w}px">
        <header class="mock-head"><h3>${esc(m.name)}<small>${esc(m.variant)}</small></h3><span class="mock-chips"><span class="conf ${m.conf}">${m.conf === 'high' ? 'Layout well known' : 'Layout approximate'}</span><span data-fit></span></span></header>
        <div class="stage"><div class="frame ${m.frame}">${m.render(f)}</div></div>
        <ul class="mock-notes">${notes.map(note => `<li>${note}</li>`).join('')}</ul>
      </article>`;
  }

  // The overview: what the selected page shows, and what needs a look.
  function overview(page, f, found) {
    const warn = found.filter(item => item.warn);
    const ok = found.filter(item => !item.warn);
    const list = (items, kind) => `<ul class="find-list ${kind}" id="findings-${kind}">${items.length ? items.map(item => `<li>${item.html}</li>`).join('') : '<li class="none">None.</li>'}</ul>`;
    const rows = [
      [c('<title>'), f.title, true],
      ...(f.shareTitle !== f.title ? [[c('og:title'), f.shareTitle, true]] : []),
      ['Description', f.description, true],
      ['Address', f.url, false],
    ];
    return `
      <p class="mode">${page.proposed ? 'Showing the proposed metadata with the chosen share image.' : 'Showing the metadata as the site source has it.'}</p>
      <div class="summary">
        ${f.image ? `<figure class="summary-thumb">${img(f.image.local, '', f.imageAlt)}<figcaption>${esc(f.image.local.split('/').pop())} · ${f.image.width} × ${f.image.height} · ${kb(f.image.bytes)}</figcaption></figure>` : '<div class="summary-thumb none">No share image</div>'}
        <dl class="showing">${rows.map(([name, value, count]) => `<div><dt>${name}</dt><dd>${esc(value)}${count && value ? ` <small>${len(value)} ch</small>` : ''}</dd></div>`).join('')}</dl>
      </div>
      <div class="findings" id="findings">
        <div class="find-col"><h3>Needs a look <span class="count" data-count="warn">${warn.length}</span></h3>${list(warn, 'warn')}</div>
        <div class="find-col"><h3>Looks right <span class="count" data-count="ok">${ok.length}</span></h3>${list(ok, 'ok')}</div>
      </div>
      <p class="about">These are local mockups built from the page source, not screenshots from the platforms. Each layout is rebuilt from the platform’s current interface using the fonts on this computer, so a line can break a word earlier or later than the real thing. Platforms change these layouts and may rewrite titles; the tools in the last section confirm the real result after deployment.</p>`;
  }

  // ---- Metadata audit (check-metadata.ts) ----
  const LEVELS = [['error', 'Error'], ['warn', 'Check'], ['info', 'Note'], ['ok', 'Passes']];
  // Audit text marks code with backticks.
  const auditText = text => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>');
  function auditItems(items) {
    if (!items.length) return '<ul class="audit-list"><li class="none">Nothing to report.</li></ul>';
    return `<ul class="audit-list">${LEVELS.flatMap(([level, label]) => items.filter(item => item.level === level)
      .map(item => `<li class="au au-${level}"><span class="au-level">${label}</span><span><b>${esc(item.subject)}</b> ${auditText(item.text)}</span></li>`)).join('')}</ul>`;
  }
  function auditSection(page) {
    const mode = page.proposed ? 'proposed' : 'source';
    const title = page.proposed ? 'Metadata audit of the proposal' : 'Metadata audit of the site source';
    if (!AUDIT) return { key: 'audit', title, nav: 'Audit', sub: 'Not run', body: `<p class="sec-intro">No audit data. ${c('check-metadata.ts')} checks every head tag and site file against its standard; ${c('run-previews.ts')} runs it.</p>` };
    const pageItems = AUDIT.pages?.[page.key]?.[mode] ?? [];
    const siteItems = AUDIT.site?.[mode] ?? [];
    const all = [...pageItems, ...siteItems];
    const errors = all.filter(item => item.level === 'error').length;
    const checks = all.filter(item => item.level === 'warn').length;
    return { key: 'audit', title, nav: 'Audit', sub: `${all.length} results`,
      badges: [errors ? chip(`${errors} errors`, 'warn') : '', checks ? chip(`${checks} to check`, 'warn') : '', !errors && !checks ? chip('Every check passes', 'ok') : ''],
      body: `<p class="sec-intro">${page.proposed ? 'The page and site files as they would be after the proposals are applied' : 'The page and site files as the site has them'}, checked against each standard and platform rule. Errors break a standard or a documented rule; checks are worth a look.</p>
        ${subsection('audit-page', `<h3>Head of ${esc(page.file)}</h3>`, auditItems(pageItems), true)}
        ${subsection('audit-site', '<h3>Site files</h3>', auditItems(siteItems), openSections === 'all')}`,
      items: [{ id: 'audit-page', label: 'Head' }, { id: 'audit-site', label: 'Site files' }] };
  }

  const CHECK_TOOLS = [
    '<a href="https://developers.facebook.com/tools/debug/">Meta Sharing Debugger</a>: shows what Facebook scraped and refreshes its cache.',
    '<a href="https://www.linkedin.com/post-inspector/">LinkedIn Post Inspector</a>: shows LinkedIn’s card and refreshes its cache.',
    '<a href="https://search.google.com/test/rich-results">Google Rich Results Test</a> and <a href="https://search.google.com/search-console">Search Console</a> URL Inspection: structured data and how Google indexed the page.',
    '<a href="https://validator.schema.org/">Schema Markup Validator</a>: every schema.org type on the page, including those no Google feature uses.',
    '<a href="https://www.bing.com/webmasters">Bing Webmaster Tools</a> URL Inspection: the same for Bing, which also feeds Yahoo, DuckDuckGo and Ecosia.',
    '<a href="https://t.me/WebpageBot">Telegram @WebpageBot</a>: send it the URL to refresh Telegram’s cached preview.',
    '<a href="https://discord.com/developers/embeds">Discord Embed Debugger</a>: shows which tags Discord read and which layout it chose. Discord caches a preview for about 30 minutes; share the URL with a new query string to see a change at once.',
  ];
  const NO_TOOL = 'Slack, X, WhatsApp, iMessage and Signal have no public preview tool. Slack unfurls links in posted messages, so post the link in a private channel; apps that preview while a message is written show the card in an unsent draft.';

  // The contents list: every section, and the mockups or files inside it, each with a status dot.
  function contents(sections) {
    const link = (id, label) => `<a href="#${id}" data-jump="${id}"><span>${esc(label)}</span><i class="toc-dot" data-dot="${id}"></i></a>`;
    return `
      <button type="button" class="toc-toggle" aria-expanded="false" aria-controls="tocBody">Contents</button>
      <div class="toc-body" id="tocBody">
        <div class="toc-actions"><button type="button" data-expand="all">Expand all</button><button type="button" data-expand="none">Collapse all</button></div>
        <ol>${sections.map(s => `<li>${link(`sec-${s.key}`, s.nav ?? s.title)}${s.items ? `<ol>${s.items.map(item => `<li>${link(item.id, item.label)}</li>`).join('')}</ol>` : ''}</li>`).join('')}</ol>
      </div>`;
  }

  function render() {
    document.documentElement.dataset.theme = state.theme;
    homeNow = effective(home);
    const source = D.pages.find(p => p.key === state.page);
    const page = effective(source);
    const f = fields(page);
    const query = `?page=${state.page}&theme=${state.theme}&meta=${state.meta}&image=${state.image}${urlOpen ? `&open=${urlOpen}` : ''}`;
    try { history.replaceState(null, '', query + location.hash); } catch { /* file: URLs may refuse; the controls still work */ }

    const title = CONFIG.title ?? 'Share and search previews';
    document.title = title;
    document.getElementById('galleryTitle').textContent = title;
    // The site's icon beside the heading and in the tab; without one the heading stands alone.
    const icon = document.getElementById('brandIcon');
    if (icon && CONFIG.icon) {
      icon.src = CONFIG.icon;
      icon.hidden = false;
      if (CONFIG.iconBackground) icon.style.background = CONFIG.iconBackground;
      if (!document.querySelector('link[rel="icon"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'icon', href: CONFIG.icon }));
    } else if (icon) icon.remove();
    document.getElementById('sourceLine').textContent = `Read from ${D.source}${D.source.includes('\\') ? '\\' : '/'}${source.file} on ${D.generatedAt} · ${page.url}`;

    const proposed = state.meta === 'proposed';
    const buttons = (attr, items, current) => items.map(([key, label]) => `<button type="button" ${attr}="${esc(key)}" aria-pressed="${key === current}">${esc(label)}</button>`).join('');
    const control = (label, inner) => `<div class="ctl"><span class="ctl-label">${esc(label)}</span>${inner}</div>`;
    document.getElementById('controls').innerHTML = [
      control('Page', `<span class="seg" role="group" aria-label="Page">${buttons('data-page', D.pages.map(p => [p.key, p.label]), state.page)}</span>`),
      PROPOSED ? control('Metadata', `<span class="seg" role="group" aria-label="Metadata">${buttons('data-meta-choice', [['proposed', 'Proposed'], ['source', 'Site source']], state.meta)}</span>`) : '',
      IMAGES.length > 1 ? control('Share image', `<select data-option="image" aria-label="Share image"${proposed ? '' : ' disabled'}>${IMAGES.map(item => `<option value="${esc(item.id)}"${item.id === state.image ? ' selected' : ''}>${esc(item.label)}</option>`).join('')}</select>`) : '',
      control('Theme', `<span class="seg" role="group" aria-label="Theme">${buttons('data-theme-choice', [['light', 'Light'], ['dark', 'Dark']], state.theme)}</span>`),
    ].join('');

    const rows = metaRows(page);
    const marked = status => (rows.match(new RegExp(`class="st st-${status}"`, 'g')) ?? []).length;
    const files = page.proposed && page.key === home.key ? window.PROPOSED_FILES ?? [] : [];
    const slug = text => text.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    const sections = [
      { key: 'overview', title: `Overview: ${page.label}`, nav: 'Overview', body: overview(page, f, findings(f)) },
      ...MOCK_GROUPS.map(group => {
        const mocks = MOCKS.filter(m => m.group === group.key);
        return { key: group.key, title: group.title, sub: `${mocks.length} mockups`,
          body: `<p class="sec-intro">${group.intro(f)}</p><div class="cards">${mocks.map(m => mockCard(m, f)).join('')}</div>`,
          items: mocks.map(m => ({ id: `mock-${m.id}`, label: `${m.name} ${m.variant}` })) };
      }),
      { key: 'image', title: 'Share image crops', nav: 'Share image', sub: f.image ? `${f.image.width} × ${f.image.height}` : 'No share image',
        badges: f.image && 'crop11' in f.image ? [f.image.crop11 ? chip('Text inside every crop', 'ok') : chip('Cut by some crops', 'warn')] : [],
        body: `<p class="sec-intro">How the share image fits each frame. The shaded part is cut away.</p><div id="group-crops">${cropPanel(f)}</div>` },
      { key: 'metadata', title: page.proposed ? 'Proposed metadata' : 'Metadata read from the source', nav: 'Metadata', sub: esc(page.file),
        badges: page.proposed ? [marked('owner') ? chip(`Your decision: ${marked('owner')}`, 'accent') : '', marked('fix') ? chip(`Proposed fix: ${marked('fix')}`) : ''] : [],
        body: `<p class="sec-intro">${page.proposed ? `Every value the mockups use for ${esc(page.file)}, with what each change is.` : `Every value the mockups use, read from ${esc(page.file)}.`}</p>
          <div class="table-wrap"><table class="meta-table"><thead><tr><th>Tag</th><th>Value</th><th>Size</th>${page.proposed ? '<th>Status</th>' : ''}<th>Where it matters</th></tr></thead><tbody>${rows}</tbody></table></div>` },
      auditSection(page),
      ...(page.proposed ? [{ key: 'changes', title: 'Proposed changes', sub: files.length ? `Head markup and ${files.length} site files` : 'Head markup',
        body: `<p class="sec-intro">Each change as it would go into the site. <code>proposed-head/</code> has each page’s complete head${files.length ? ', and <code>proposed-files/</code> each site file' : ''}.</p>
          ${subsection('group-head', `<h3>Head markup for ${esc(page.file)}</h3>`, `<p class="file-note">The metadata tags as they would replace the current ones. Every other tag in the page’s head stays as it is${CONFIG.headKeeps ? `: ${esc(CONFIG.headKeeps)}` : ''}.</p><pre class="head-code"><code>${esc(headMarkup(page))}</code></pre>`, true)}
          ${files.map(file => subsection(`file-${slug(file.path)}`, `<h3 class="file-path">${esc(file.path)}</h3>`, `<p class="file-note">${esc(file.note)}</p><pre class="head-code"><code>${esc(file.content)}</code></pre>`, openSections === 'all')).join('')}`,
        items: [{ id: 'group-head', label: 'Head markup' }, ...files.map(file => ({ id: `file-${slug(file.path)}`, label: file.path }))] }] : []),
      { key: 'verify', title: 'Check on the real platforms after deployment', nav: 'After deployment', sub: `${CHECK_TOOLS.length} tools`,
        body: `<p class="sec-intro">These fetch the live page; each submission is a request to that service.</p>
          <ul class="checks">${CHECK_TOOLS.map(item => `<li>${item}</li>`).join('')}<li>${esc(NO_TOOL)}</li>${(CONFIG.notMocked ?? []).map(text => `<li>Not mocked here: ${esc(text)}</li>`).join('')}</ul>` },
    ];

    document.getElementById('toc').innerHTML = contents(sections);
    app.innerHTML = sections.map(section).join('');
    measureTop();
    settle();
  }

  // Wait for fonts and images, then measure which fields the mockups cut short and fill in each status.
  async function settle() {
    document.body.dataset.ready = 'false';
    try { await document.fonts.ready; } catch { /* no font API */ }
    await Promise.all([...document.images].map(image => (image.complete ? null : image.decode().catch(() => null))));
    // A closed section has no layout to measure, so every closed one is opened and closed again in the same task,
    // before the browser paints.
    const closed = [...document.querySelectorAll('details:not([open])')];
    for (const el of closed) el.open = true;
    const cuts = {};
    for (const mock of document.querySelectorAll('.mock')) {
      const cut = [...mock.querySelectorAll('[data-field]')].filter(el => el.dataset.trimmed || el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
      cuts[mock.dataset.id] = [...new Set(cut.map(el => el.dataset.field))];
    }
    for (const el of closed) el.open = false;

    const summary = [];
    for (const mock of document.querySelectorAll('.mock')) {
      const cut = cuts[mock.dataset.id];
      mock.querySelector('[data-fit]').outerHTML = cut.length ? chip(`Cut short: ${esc(cut.join(', '))}`, 'warn') : chip('Every field fits', 'ok');
      document.querySelector(`[data-dot="mock-${mock.dataset.id}"]`)?.classList.add(cut.length ? 'warn' : 'ok');
      if (cut.length) summary.push(`${mock.dataset.name} ${mock.dataset.variant} (${cut.join(', ')})`);
    }
    for (const group of MOCK_GROUPS) {
      const cut = MOCKS.filter(m => m.group === group.key && cuts[m.id]?.length).length;
      document.querySelector(`[data-badges="${group.key}"]`)?.insertAdjacentHTML('beforeend', cut ? chip(`${cut} cut short`, 'warn') : chip('Every field fits', 'ok'));
    }
    const list = document.getElementById(summary.length ? 'findings-warn' : 'findings-ok');
    list.querySelector('li.none')?.remove();
    list.insertAdjacentHTML('beforeend', `<li>${summary.length
      ? `<b>Cut short in ${summary.length} of ${MOCKS.length} mockups:</b> ${esc(summary.join('; '))}.`
      : `<b>Nothing cut short.</b> Every field fits in all ${MOCKS.length} mockups.`}</li>`);
    for (const kind of ['warn', 'ok']) document.querySelector(`[data-count="${kind}"]`).textContent = document.querySelectorAll(`#findings-${kind} li:not(.none)`).length;
    const toLook = document.querySelectorAll('#findings-warn li:not(.none)').length;
    document.querySelector('[data-badges="overview"]').innerHTML = toLook ? chip(`${toLook} to look at`, 'warn') : chip('Nothing to look at', 'ok');
    // Each section's dot in the contents follows its chips.
    for (const sec of document.querySelectorAll('details.sec')) {
      const warn = Boolean(sec.querySelector(':scope > summary .chip.warn'));
      const dot = document.querySelector(`[data-dot="sec-${sec.dataset.sec}"]`);
      dot?.classList.toggle('warn', warn);
      dot?.classList.toggle('ok', !warn && Boolean(sec.querySelector(':scope > summary .chip.ok')));
    }
    window.__CUTS__ = cuts;
    document.body.dataset.ready = 'true';
  }

  // The sticky top bar's height, so sections scrolled to stop below it.
  function measureTop() {
    const top = document.querySelector('.top');
    document.documentElement.style.setProperty('--top-h', `${getComputedStyle(top).position === 'sticky' ? top.offsetHeight : 0}px`);
  }

  // Opens a section, mockup or file and every section around it, then scrolls to it.
  function reveal(id) {
    const target = document.getElementById(id);
    if (!target) return;
    for (let el = target.closest('details'); el; el = el.parentElement?.closest('details')) el.open = true;
    target.scrollIntoView({ block: 'start' });
    try { history.replaceState(null, '', `${location.search}#${id}`); } catch { /* file: URLs may refuse */ }
  }

  document.addEventListener('change', event => {
    const select = event.target.closest('[data-option]');
    if (select) { state[select.dataset.option] = select.value; render(); }
  });

  document.addEventListener('click', event => {
    const jump = event.target.closest('[data-jump]');
    if (jump) {
      event.preventDefault();
      reveal(jump.dataset.jump);
      document.getElementById('toc').classList.remove('open');
      document.querySelector('.toc-toggle')?.setAttribute('aria-expanded', 'false');
      return;
    }
    const expand = event.target.closest('[data-expand]');
    if (expand) {
      for (const el of document.querySelectorAll('details.sec, details.sub')) el.open = expand.dataset.expand === 'all';
      return;
    }
    const tocToggle = event.target.closest('.toc-toggle');
    if (tocToggle) {
      const open = document.getElementById('toc').classList.toggle('open');
      tocToggle.setAttribute('aria-expanded', String(open));
      return;
    }
    const pageButton = event.target.closest('[data-page]');
    const themeButton = event.target.closest('[data-theme-choice]');
    const metaButton = event.target.closest('[data-meta-choice]');
    if (pageButton) { state.page = pageButton.dataset.page; render(); }
    if (themeButton) { state.theme = themeButton.dataset.themeChoice; render(); }
    if (metaButton) { state.meta = metaButton.dataset.metaChoice; render(); }
  });

  // Remember which sections this viewer leaves open. The toggle event does not bubble, so it is caught on the way down.
  document.addEventListener('toggle', event => {
    if (event.target.matches?.('details.sec')) rememberOpen();
  }, true);
  window.addEventListener('resize', measureTop);

  render();
  if (location.hash) reveal(decodeURIComponent(location.hash.slice(1)));
})();
