# Head tags

Open when writing a page's title, description, canonical address, robots rules, Open Graph tags, X card tags and icons.

The tags below are the ones nearly every page needs. Tags for other jobs have their own pages: [Indexing controls](indexing-controls.md) for robots rules per crawler, [Localized versions](localized-versions.md) for hreflang, [Feeds and embeds](feeds-and-embeds.md), [Identity and verification](identity-and-verification.md), [Apple platforms](apple-platforms.md) and [Native app links](native-app-links.md).

## What each tag feeds

| Tag | Read by | Notes |
| --- | --- | --- |
| `meta charset` | Browsers | Must sit within the first 1024 bytes of the document [10]; put it first in the head. |
| `<title>` | Search title links, browser tabs, bookmarks | Google builds title links mainly from it [1]. For the wording, see [Titles and descriptions](titles-and-descriptions.md). |
| `meta name="description"` | Search snippets | Google may show page text instead [2]. For the wording, see [Titles and descriptions](titles-and-descriptions.md). |
| `link rel="canonical"` | Search engines | Names the preferred address of duplicate or near-duplicate pages [3]. |
| `meta name="robots"` | Search engines | `index, follow` is the default. `max-image-preview:large` allows large image previews. `nosnippet` and `max-snippet` limit snippets [4]. Their effect on AI features is in [AI usage preferences](ai-usage-preferences.md). |
| `data-nosnippet` | Search engines | An attribute on an element in the body, not a robots value. It keeps that element's text out of snippets [4]. |
| `og:title`, `og:type`, `og:image`, `og:url` | Facebook, LinkedIn, chat apps | The four required Open Graph properties [5]. Types, arrays and video are in [Open Graph](open-graph.md). |
| `og:description`, `og:site_name`, `og:locale` | Most social and chat previews | Optional Open Graph properties [5]. Chat apps show `og:site_name` above the title; see [Platform previews](platform-previews.md). |
| `og:image:type`, `:width`, `:height`, `:alt` | Meta's crawler, screen readers | Width and height let Meta draw the image on the first share without fetching it first [6]. |
| `twitter:card` | X, Slack, Discord | `summary_large_image` asks for the large image layout [7]. Every card type and limit is in [X cards](x-cards.md). |
| `twitter:title`, `:description`, `:image`, `:image:alt` | X | X reads its own tags first and falls back to the Open Graph ones when they are absent [7]. |
| `twitter:label1` and `twitter:data1` | Slack | Slack shows each label and data pair under the preview [8]. |
| `twitter:site`, `twitter:creator` | X | X's card reference lists `twitter:site` (or `twitter:site:id`), the site's account, as required for every card. `twitter:creator` names the author's account [7]. |
| `fediverse:creator` | Mastodon | Shows the author's fediverse account as a byline on the link card [9], once the author's Mastodon profile lists the site's domain under "Websites allowed to credit you" [14]. |
| `meta name="theme-color"` | Browsers, Discord | A color for the browser's interface. Several tags, each with a `media` query such as `(prefers-color-scheme: dark)`, give one color per scheme [10]. Discord colors the embed's side stripe with it, and reads only `#RRGGBB` or `#RRGGBBAA` [11]. |
| `meta name="color-scheme"` | Browsers | The color schemes the page supports, such as `light dark`, so the browser can render in the right one before the CSS loads [10]. |
| `application-name`, `apple-mobile-web-app-title` | Browsers, iOS home screen | The name of a web application [10] and the name under its home screen icon. An installable app also names itself in its manifest; see [Installed web applications](../installed-web-apps/index.md). |
| `link rel="icon"`, `apple-touch-icon` | Search results, tabs, iMessage | Google needs a square icon at least 8 × 8 px at a stable address and recommends one larger than 48 × 48 px. Its formats are BMP, GIF, ICO, PNG, JPEG, PPM and TIFF; SVG is not among them, so also offer one of those [12]. Sizes and rendering are in [Site icons](site-icons.md). |

## Values

- **Absolute addresses:** `og:url`, `og:image` and `twitter:image` take full `https://` URLs [5, 7].
- **One text, several tags:** give `og:title` and `twitter:title` the same text, and likewise each description and image pair, unless a platform needs something different. X reads its own tags first, so once they exist, a change made only to the Open Graph tags does not reach X [7].
- **Image:** its size, format and the crops it must survive are in [Share image design](share-image-design.md).
- **Image alt text:** describe what the image says, for readers who cannot see it [7]. A description of the logo's colors tells them nothing.
- **A page-specific image:** Apple asks for an image specific to the page in `og:image` and a logo as the icon, and it shows the icon when no image loads [13].

## Changing an existing head

- **Change values, not the tag set:** keep every tag the page has and change only the values the work calls for. Each platform reads its own subset, so a tag that looks redundant can be the one a platform reads.
- **Keep the other tags in place:** charset, viewport, referrer, Content Security Policy, links, icons and stylesheets keep their place. Proposed metadata replaces only the tags it manages. The bundled head writer works this way; its input rules are in [Preview gallery](preview-gallery.md).
- **Check it live:** after deployment, fetch the live page with the tools in [Platform previews](platform-previews.md), and refresh any card a platform has cached.

## Sources

1. Google Search Central, [Influencing your title links in search results](https://developers.google.com/search/docs/appearance/title-link)
2. Google Search Central, [Control your snippets in search results](https://developers.google.com/search/docs/appearance/snippet)
3. Google Search Central, [How to specify a canonical URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
4. Google Search Central, [Robots meta tag, data-nosnippet and X-Robots-Tag specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
5. [The Open Graph protocol](https://ogp.me/)
6. Meta for Developers, [A Guide to Sharing for Webmasters](https://developers.facebook.com/documentation/sharing/webmasters)
7. X Developer Platform, [Cards markup](https://web.archive.org/web/20260201012312/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) (archived 1 February 2026; X has since taken its card documentation down)
8. Slack Platform Blog (2015), [Everything you ever wanted to know about unfurling](https://medium.com/slack-developer-blog/e64b4bb9254)
9. Mastodon blog (2024), [Highlighting journalism on Mastodon](https://blog.joinmastodon.org/2024/07/highlighting-journalism-on-mastodon/)
10. WHATWG, [HTML Standard: the meta element](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element) and [standard metadata names](https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names)
11. Discord Developer Documentation, [Link previews](https://docs.discord.com/developers/link-previews/overview)
12. Google Search Central, [Define a favicon to show in search results](https://developers.google.com/search/docs/appearance/favicon-in-search)
13. Apple, [TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages); [Ensuring beautiful rich links](https://developer.apple.com/videos/play/tech-talks/205/)
14. Mastodon documentation, [Setting up your profile](https://docs.joinmastodon.org/user/profile/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/head-tags.md). Written for this skill from the primary sources listed above.
