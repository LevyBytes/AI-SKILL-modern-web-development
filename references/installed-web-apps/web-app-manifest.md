# Web app manifest

Open when writing the manifest file of an installable site: its name, identity, start page, scope, display mode, colors, icons and shortcuts, or checking that it makes the site installable.

## Linking it

```html
<link rel="manifest" href="/manifest.webmanifest">
```

- **File name:** `.webmanifest` is the registered extension. Serve it as `application/manifest+json` where the host allows; any JSON media type works [1].
- **On every page** that belongs to the app, in the head [1].

## A complete manifest

```json
{
  "id": "/",
  "name": "Example Tide Tables",
  "short_name": "Tide Tables",
  "description": "Tide times and heights for coastal stations.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#133744",
  "background_color": "#ffffff",
  "color_scheme_dark": { "theme_color": "#0b1f27", "background_color": "#000000" },
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [{ "name": "Nearest station", "url": "/nearest" }]
}
```

## Members

| Member | Rule [1] |
| --- | --- |
| `name`, `short_name` | The app's name, and a shorter one for small spaces such as under a Home Screen icon. |
| `id` | The app's identity, a URL on the start URL's origin. Without it the identity is the `start_url`, so a later change of start page makes a different app; set `id` once and keep it. |
| `start_url` | The page the app opens on. Advisory: browsers may let the user change it. |
| `scope` | The paths that belong to the app; the manifest applies only to pages inside it. It must contain `start_url`, or browsers ignore it and use the start URL's folder. |
| `display` | `fullscreen`, `standalone`, `minimal-ui` or `browser`. Chrome's install criteria also accept `window-controls-overlay` [2]. |
| `theme_color`, `background_color` | The app's frame color, and the color shown while it loads. A page's `<meta name="theme-color">` may override the theme color while that page is shown. |
| `color_scheme_dark` | Replacement `theme_color` and `background_color` values for when the operating system uses a dark theme; no other member can change. |
| `icons` | Each has `src`, `sizes`, `type` and an optional `purpose`; see [Site icons](../site-metadata/site-icons.md). |
| `shortcuts` | Key tasks, most important first; each has `name` and `url`. How many show depends on the platform. |
| `lang`, `dir` | The language and text direction of the manifest's text members. |

## Installability

- **Chrome:** served over HTTPS, with a manifest that has `name` or `short_name`, a 192 px and a 512 px icon, `start_url`, a `display` of `fullscreen`, `standalone`, `minimal-ui` or `window-controls-overlay`, and no `prefer_related_applications: true` [2].
- **Richer install dialogs:** Chrome recommends `screenshots` and `description` [2].
- **Safari:** from Safari 26 on iOS and iPadOS, any site added to the Home Screen opens as a web app by default, and the manifest's settings, icons and service worker still apply [3]. Manifest icons are used when the head has no `apple-touch-icon` [4]; see [Apple platforms](../site-metadata/apple-platforms.md).
- **A native app instead:** `related_applications` with `prefer_related_applications: true` sends Android users to the app's Google Play page instead of installing the site [2]; see [Native app links](../site-metadata/native-app-links.md).

## In the bundled scripts

- **Writing it:** `siteFiles.manifest` in the [preview configuration](../site-metadata/preview-config.md) writes the manifest at `manifest.webmanifest` (or its `path`), passes every member through, fills in the rendered icons of 144 px and larger, and defaults `start_url` and `display`.
- **Checking it:** the [metadata audit](../site-metadata/metadata-audit.md) checks the name, `display`, `start_url` against the origin and `scope`, `id`, the 192 and 512 px icons against their files, icon purposes, `color_scheme_dark` and `prefer_related_applications`.
- **Linking it:** propose `<link rel="manifest">` in each page's `extraTags`.

## Sources

1. W3C, [Web Application Manifest](https://www.w3.org/TR/appmanifest/)
2. web.dev, [What does it take to be installable?](https://web.dev/articles/install-criteria)
3. WebKit (2025), [News from WWDC25: WebKit in Safari 26 beta](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
4. WebKit (2022), [New WebKit Features in Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/installed-web-apps/web-app-manifest.md). Written for this skill from the primary sources listed above.
