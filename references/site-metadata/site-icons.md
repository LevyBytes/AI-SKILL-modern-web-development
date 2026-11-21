# Site icons

Open when choosing a site's favicon, Apple touch icon and manifest icons, deciding their sizes and formats, or rendering them with the bundled icon script.

## The set to publish

| File | Declared with | Used by |
| --- | --- | --- |
| `favicon.ico` holding 16, 32 and 48 px images | `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">`, and found at the root without a link [1] | Browser tabs and bookmarks |
| An SVG icon | `<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any">` [1] | Browsers that read SVG icons; not Google Search [2] |
| A raster icon larger than 48 px | `<link rel="icon">` on the home page [2] | The favicon in Google results [2] |
| `apple-touch-icon.png`, 180 × 180 px | `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` [3] | The iPhone and iPad Home Screen, and the icon in Messages link previews [4] |
| 192 and 512 px PNG icons | The manifest's `icons` list [5] | Installing the site as an app in Chrome [6] |
| A 512 px maskable icon | A manifest icon with `"purpose": "maskable"` [5] | Platforms that crop icons to a circle or rounded square |

## How browsers choose

- **Most appropriate first:** a browser picks the icon whose `type`, `media` and `sizes` suit the place it needs one; among equally suitable icons, the last one declared wins. An unusable icon, such as one in an unsupported format, is skipped for the next best [1].
- **`sizes`:** lists the sizes the file really contains, such as `16x16 32x32`; `any` marks a scalable icon such as SVG [1].
- **Without a link:** a browser may fetch `/favicon.ico` from the site's root [1].
- **Dark and light:** `media="(prefers-color-scheme: dark)"` on an icon link offers a separate icon for dark mode, because `media` is one of the attributes the choice weighs [1].

## Google Search

- **One icon per hostname:** `example.com` and `news.example.com` can each have one; a subdirectory cannot have its own [2].
- **Where it looks:** a `<link>` with `rel` set to `icon`, `shortcut icon`, `apple-touch-icon` or `apple-touch-icon-precomposed` in the home page's head [2].
- **Shape and size:** square, at least 8 × 8 px; Google recommends larger than 48 × 48 px [2].
- **Formats:** BMP, GIF, ICO, PNG, JPEG, PPM and TIFF [2]. SVG is not on the list, so pair an SVG icon with a raster one.
- **Crawlable and stable:** Googlebot must reach the home page and Googlebot-Image the icon file, and the icon's URL should not change often [2]. A new icon can take days to weeks to appear [2].

## Apple devices

- **Touch icon first:** Safari uses the `apple-touch-icon` link for the Home Screen; since Safari 15.4 it falls back to manifest icons whose `purpose` is absent or `any` [7].
- **Sizes:** Apple's archived guide lists 180 × 180 px for iPhone, 167 px for iPad Pro and 152 px for iPad [3].
- **Messages:** a square icon of at least 108 px beside the link [4]; see [Apple platforms](apple-platforms.md).

## Manifest icons

- **Members:** each entry has `src`, `sizes`, `type` and an optional `purpose` [5].
- **Purposes:** `any` (the default), `maskable` (designed to be cropped to a shape) and `monochrome` (only the alpha channel is used, as a mask over one color). An icon whose purposes are all unknown is ignored [5].
- **The safe zone:** a maskable icon keeps everything important inside a centered circle with a radius of 40% of the icon's size; the platform may crop everything outside it [5].
- **Chrome's install criteria:** a manifest with a 192 px and a 512 px icon [6]. The rest of the manifest is in [Web app manifest](../installed-web-apps/web-app-manifest.md).

## Rendering them with the bundled script

`render-icons.ts` renders every icon from one SVG or PNG source, headless, after the share cards in [run-previews](preview-gallery.md):

```json
"icons": {
  "source": "./site/logo.svg",
  "files": [
    { "publishAs": "favicon.ico", "sizes": [16, 32, 48] },
    { "publishAs": "icon-192.png", "size": 192 },
    { "publishAs": "icon-512.png", "size": 512 },
    { "publishAs": "icon-maskable-512.png", "size": 512, "purpose": "maskable", "background": "#133744" },
    { "publishAs": "apple-touch-icon.png", "size": 180, "background": "#133744" }
  ]
}
```

- **Output:** each file goes to `proposed-files/` at its path in the site and to the gallery; every file is read back and its pixel sizes checked.
- **ICO files:** hold one PNG image per entry in `sizes`.
- **Maskable icons:** need a `background`. The default `padding` (0.22 of the size on each side) fits the whole source square inside the safe zone circle; a round mark can set a smaller `padding`, down to 0.1, and the script reports anything less.
- **The manifest:** `siteFiles.manifest` lists the rendered PNG icons of 144 px and larger, without the Apple icon; see [Preview configuration](preview-config.md).
- **Head tags:** propose the icon links with `extraTags` in the proposed metadata. The [metadata audit](metadata-audit.md) then checks each link's file, sizes and squareness against the rules above.

## Sources

1. WHATWG HTML Living Standard, [Link type "icon"](https://html.spec.whatwg.org/multipage/links.html#rel-icon)
2. Google Search Central, [Define a favicon to show in search results](https://developers.google.com/search/docs/appearance/favicon-in-search)
3. Apple Safari Web Content Guide (archived), [Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
4. Apple, [TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)
5. W3C, [Web Application Manifest](https://www.w3.org/TR/appmanifest/)
6. web.dev, [What does it take to be installable?](https://web.dev/articles/install-criteria)
7. WebKit (2022), [New WebKit Features in Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/site-icons.md). Written for this skill from the primary sources listed above.
