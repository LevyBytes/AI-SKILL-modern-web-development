# Preview configuration

Open when writing `preview.config.json` and the proposed metadata for the preview scripts. The fixture in `assets/share-preview-fixture/` is a complete, tested example to copy.

Paths in the configuration are relative to its own file. Keep the configuration, proposals and output in a work folder outside the site.

## preview.config.json

| Key | Meaning |
| --- | --- |
| `site.root` | The folder the site is served from, such as the repository's `docs` folder. It is only read. |
| `site.url` | The site's address, ending with `/`. Images on other hosts are listed but not copied. |
| `site.base` | Where `site.root` sits in the repository, such as `docs/`, so proposed files and heads get repository paths. Empty for a site at the repository root. |
| `pages` | `{ "key", "label", "file" }` for each page. The key names the page in the URL and the proposal; the file is relative to `site.root`. |
| `gallery` | The gallery's settings; see below. |
| `proposed` | The proposed metadata, inline or as the path of a JSON file. Leave it out to preview the site as it is. |
| `shareCards` | The cards to render; see below. |
| `icons` | The site icons to render; see below. |
| `siteFiles` | The site files to propose; see [Site files configuration](site-files-config.md). |

## gallery

- **`title`:** the gallery's heading and tab title.
- **`icon`, `iconBackground`:** the icon beside the heading, and the color behind it. Without an icon, the home page's favicon is used.
- **`homeKey`:** the page key of the home page; the first page by default.
- **`searchQuery`:** the search each page's search mockups show, by page key. A page without one uses the home page's query followed by its label.
- **`redditCommunity`:** the community the Reddit mockup posts in.
- **`platformNotes`:** extra notes under a mockup, by platform id: `google-desktop`, `google-mobile`, `bing`, `duckduckgo`, `brave`, `google-discover`, `facebook`, `x`, `linkedin`, `reddit`, `bluesky`, `mastodon`, `threads`, `discord`, `slack`, `teams`, `telegram`, `whatsapp`, `imessage`, `signal`.
- **`textChecks`:** writing checks.
  - **Form:** `{ "pattern", "flags", "fields", "warn", "html" }`. The regular expression is tested on the named fields (`title`, `description`, `shareTitle`, `shareDescription` or `siteName`; `description` by default), and `html` is the finding shown when it matches.
  - **`warn: false`** lists the finding under "Looks right" instead of "Needs a look".
- **`findings`:** `{ "html", "warn" }` notes added to every page's overview.
- **`headKeeps`:** a phrase naming the tags each head keeps besides the managed metadata.
- **`notMocked`:** places the site is shared that the gallery does not mock, and how to check them.

## Proposed metadata

```json
{ "imageUrl": "https://example.com/media/share.jpg",
  "website": { "name": "Site Name", "alternateName": ["Short Name"] },
  "pages": { "home": { "title": "", "description": "", "robots": "", "themeColor": "", "applicationName": "", "appleTitle": "",
    "siteName": "", "locale": "en_US", "ogType": "website", "ogTitle": "", "ogDescription": "", "twitterCard": "summary_large_image",
    "twitterTitle": "", "twitterDescription": "", "twitterLabels": [["Price", "Free"]], "jsonLd": {}, "status": { "title": "fix" } } } }
```

- **`imageUrl`:** where the chosen share card will be published. It must match a card's `publishAs`.
- **`status`:** marks each tag in the metadata table: `owner` (the owner's decision), `fix` (a proposed fix) or `same` (unchanged). Tags not listed show as unchanged.
- **Empty values:** a value left empty is not written. The tag it would replace stays as the page has it.
- **`jsonLd`:** replaces every JSON-LD block in the page's head; a block in the body stays (see [Limits](preview-gallery.md#limits)). See [Structured data](structured-data.md).
- **`themeColor`:** one color, or `[{ "color", "media" }]` for a color per scheme, such as `"(prefers-color-scheme: dark)"`.
- **`extraTags`:** further head tags as `[{ "tag": "link" | "meta", ...attributes }]`, such as icons, the manifest link, feeds, hreflang links, `twitter:site` or verification tags. They replace every tag of the same kind in the page (all `icon` links, all hreflang links), and their `status` key is that kind, such as `icon` or `twitter:site`.

## shareCards

- **Identity:** `id` and `label` name the card in the gallery; `file` is the output name without an extension.
- **`alt`:** the card's alt text.
- **`imageMetadata`:** `{ "creator", "creditText", "copyrightNotice", "webStatement", "licensorUrl", "digitalSourceType" }` embedded as XMP in the PNG and JPEG and read back. See [Image metadata](image-metadata.md).
- **`publishAs`:** the card's path in the site, such as `media/share.jpg`.
- **`template`:** an HTML page; by default the skill's `assets/share-preview-card/card.html`.
- **`query`:** the template's URL parameters. A value starting with `./` or `../` is a file beside the configuration.
- **Size and format:** `width` and `height` default to 1200 × 630; `format` is `jpeg` (default) or `png`; `jpegQuality` defaults to 90.
- **One frame of an animation:** `frameMs` runs the page on a fake clock to that time. `waitFor` is a selector to wait for first.
- **`copies`:** `[{ "from", "to", "replace": [[old, new]] }]` copies a site script beside the template with values changed. Each old text must match exactly once.
- **`checks`:**
  - **`textSelector`:** the text to measure; `[data-share-text]` by default.
  - **`safeSquare`:** set to `false` to skip the center-square rule.
  - **`avoid`:** rectangles `{ "name", "left", "right", "top", "bottom" }` that text must not enter. X's title band by default.
  - **`maxTextShare`:** the most of the image, in percent, that text may cover.

## icons

```json
"icons": { "source": "./logo.svg", "background": "#133744", "files": [
  { "publishAs": "favicon.ico", "sizes": [16, 32, 48] },
  { "publishAs": "icon-512.png", "size": 512 },
  { "publishAs": "icon-maskable-512.png", "size": 512, "purpose": "maskable" } ] }
```

- **`source`:** one SVG or PNG image every icon is rendered from.
- **Each file:** `publishAs` (its path in the site), `size`, or `sizes` for an ICO file, and optional `purpose`, `background` and `padding`.
- **Maskable icons:** need a `background`; the default padding keeps a square source inside the safe zone. See [Site icons](site-icons.md).

## siteFiles

The robots.txt, sitemap, security.txt, IndexNow, llms.txt, ads.txt, manifest and `.well-known` files to propose, and their options, are in [Site files configuration](site-files-config.md).

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/preview-config.md). Written for this skill from the bundled scripts and their tests.
