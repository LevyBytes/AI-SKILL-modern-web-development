# Apple platforms

Open when a link should preview well in Messages, a site should look right on the iPhone and iPad Home Screen, a page should promote its App Store app, or a site sets rules for Applebot.

## Link previews in Messages

Messages on iOS and macOS shows a gray bubble with the page title, domain and a small icon until the page gives Open Graph tags; `og:title` and `og:image` turn it into a rich preview [1].

- **Same tags for every user agent:** serve the same metadata to mobile and desktop requests; a client should not have to change its `User-Agent` to get it [1].
- **Image:** `og:image`, at least 900 px wide. Images under 150 px wide may be ignored or shown as icons [1].
- **Icon:** a square of at least 108 px, from `apple-touch-icon`, a favicon or another `<link rel>` icon. Without a good enough share image, give an `apple-touch-icon` [1].
- **No text in the image:** previews appear at many sizes, so keep the image graphical and put the words in the tags, which VoiceOver also reads [1].
- **Title:** `og:title` short and specific to the page, without the site name or branding; name the site in `og:site_name` [1].
- **Video:** an `og:video` or `twitter:player:stream` that points at a downloadable file, such as MPEG-4, downloads and plays automatically. A stream that cannot be downloaded, such as HLS, plays on tap, and a video that needs embedding HTML does not play inline [1].
- **Reachable tags:** previews follow server-side redirects but not `meta` refresh redirects, and run no JavaScript, so the tags must be in the served HTML [1].
- **Pages behind a sign-in:** give the linked page's own meaningful title and image without revealing private content, so every page does not preview as "Sign In" [1].
- **Size limits:** the page itself at most 1 MB, and its icons, images and videos together at most 10 MB. Apple calls these guidelines that may change [1].
- **Posts on social networks:** a preview of a user's post takes the post text from `og:description`, and the page also needs `twitter:card` set to `summary` or `summary_large_image` and a `<link>` with `type="application/activity+json"` [1].

In apps, Apple's LinkPresentation framework fetches a URL's metadata, presents the rich link and hands link metadata to the share sheet [2].

## Home Screen web apps

- **Every site opens as a web app:** from Safari 26 on iOS and iPadOS, a site added to the Home Screen opens as a web app by default, and the user can turn off "Open as Web App" to get a bookmark instead [3]. On Mac, sites added to the Dock have always opened as web apps since web apps arrived in September 2023 [3].
- **The manifest still counts:** a web app manifest's settings, its icons and a service worker's offline support all apply [3]; see [Web app manifest](../installed-web-apps/web-app-manifest.md).
- **Icon order:** an `apple-touch-icon` in the head takes precedence. Since Safari 15.4, manifest icons are used when there is none and their `purpose` is absent or `any` [4].
- **Icon sizes:** Apple's archived guide lists 180 × 180 px for iPhone, 167 × 167 for iPad Pro and 152 × 152 for iPad, each in its own `<link rel="apple-touch-icon" sizes="...">` [5]. Without a link element, Safari looks for `apple-touch-icon.png` at the site root [5].
- **Home Screen name:** `<meta name="apple-mobile-web-app-title" content="...">` replaces the `<title>` under the icon [5].

| Older tag | Effect [5, 6] | Status |
| --- | --- | --- |
| `apple-mobile-web-app-capable` | `yes` opened a Home Screen site without Safari's interface. | Not needed to open as a web app from Safari 26 [3]. |
| `apple-mobile-web-app-status-bar-style` | `default`, `black` or `black-translucent`; the last one draws the page under the status bar. | Has no effect outside a standalone web app [6]. |
| `apple-touch-startup-image` | A launch image shown while the web app starts. | Documented only in the archived guide. |
| `format-detection` | `telephone=no` stops Safari turning phone numbers into links. | Documented only in the archived reference. |

## Smart App Banner

- **The tag:** `<meta name="apple-itunes-app" content="app-id=myAppStoreID, app-argument=myURL">` in the head of each page that should promote the app [7].
- **`app-id`:** the app's numeric App Store ID [7].
- **`app-argument`:** an optional URL passed to the app when it opens, so it can show the same content; it must be a valid URL [7].
- **What the reader sees:** a banner that opens the app if it is installed and links to the App Store if it is not [7].
- **When it hides:** not inside a frame, not in the iOS simulator, and not when the device cannot run the app or the app is unavailable in the reader's region [7].
- **Deep links without a banner:** universal links open the app from any link to the site; see [Native app links](native-app-links.md).

## Applebot

- **What it feeds:** Spotlight, Siri and Safari search suggestions, and the context Apple's AI models use for answers in Siri and Search [8].
- **Rules it reads:** robots.txt groups for `Applebot`; groups for `Googlebot` when none names Applebot. It does not read `Crawl-delay` [8].
- **Meta and header rules:** `noindex`, `nosnippet`, `nofollow`, `none` and `all` in `<meta name="robots">` or `<meta name="applebot">`, or `X-Robots-Tag: applebot: nosnippet` [8].
- **Snippets and AI answers:** `nosnippet` shows only the title and keeps the page out of the context for Apple's AI answers [8].
- **Paywalls:** page-level JSON-LD with `isAccessibleForFree: false` keeps a page in search but out of that AI context; section markup with `hasPart` does not [8].
- **Training:** a robots.txt group for `Applebot-Extended` controls training of Apple's foundation models. It crawls nothing, it does not affect search ranking, and a page it is disallowed from can still appear in results [8]. See [AI crawlers](ai-crawlers.md).
- **Verifying traffic:** reverse DNS in `*.applebot.apple.com`, or Apple's published IP ranges [8].

## In the bundled scripts

The [metadata audit](metadata-audit.md) checks share image and icon sizes against these limits, a missing `apple-touch-icon`, meta refresh, page size, `apple-itunes-app` and status bar values, and whether robots.txt keeps Applebot off a page. The [preview gallery](preview-gallery.md) mocks the Messages bubble.

## Sources

1. Apple, [TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)
2. Apple Developer Documentation, [LinkPresentation](https://developer.apple.com/documentation/linkpresentation)
3. WebKit (2025), [News from WWDC25: WebKit in Safari 26 beta](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
4. WebKit (2022), [New WebKit Features in Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
5. Apple Safari Web Content Guide (archived), [Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
6. Apple Safari HTML Reference (archived), [Supported Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
7. Apple Developer Documentation, [Promoting apps with Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners)
8. Apple Support, [About Applebot](https://support.apple.com/en-us/119829)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/apple-platforms.md). Written for this skill from the primary sources listed above.
