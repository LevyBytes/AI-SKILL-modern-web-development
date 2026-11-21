# Platform previews

Open when predicting what a search engine, social network or chat app shows for a link, which crop it takes from the share image, and how to refresh its cached copy.

"Documented" means the platform's own documentation states it. "Observed" means it was seen in the platform's current interface or behavior and is not documented, so it can change without notice. The preview gallery labels its mockups the same way: "Layout well known" or "Layout approximate". What these crops and layouts mean for the image itself is in [Share image design](share-image-design.md).

## Search engines

| Platform | Shows | Image | Basis |
| --- | --- | --- | --- |
| Google, desktop | Site name from the `WebSite` markup, favicon, breadcrumb or address, title link, snippet | None in the standard result | Documented [1, 2, 3] |
| Google, phone | Site name, favicon, domain only, title, snippet | A thumbnail Google picks and crops square from the center; `max-image-preview:large` allows it | Domain documented [4]; thumbnail observed |
| Bing | Title, address, description | Sometimes a thumbnail | Observed; markup rules documented [5] |
| DuckDuckGo, Yahoo, Ecosia | Title, address, description; DuckDuckGo draws most links from Bing [6] | None | Observed |
| Brave Search | Title, address, description | Often `og:image` as a thumbnail | Observed |
| Google Discover | Title, site name and favicon | Large only with `max-image-preview:large` and an image at least 1200 px wide with more than 300,000 pixels; Google crops toward 16:9. Otherwise a small thumbnail [18] | Image rules documented [18]; which title tag it reads is not |

- **Preferred sources:** readers can choose a site as a preferred source, so its stories appear more often in Google's Top Stories and carry a "preferred" badge there and in AI Overviews and AI Mode. Only domain and subdomain sites are eligible, not subfolders, and AI features need the site's Search generative AI setting on [19].
- **The button:** `<script async src="https://news.google.com/swg/js/v1/publisher.js"></script>` in the head and `<div google-add-preferred-source-btn></div>` where it should show, with optional `data-theme="dark"` and `data-lang`. Without JavaScript, link to `https://www.google.com/preferences/source?q=example.com` [19].

## Social networks

| Platform | Shows | Image | Basis |
| --- | --- | --- | --- |
| Facebook | Domain, `og:title`, sometimes `og:description` | 1.91:1 fills the card, and at least 1080 px wide shows uncropped in the feed [8]. Video playback is not guaranteed [7] | Documented [7, 8] |
| X | Title over the image's bottom-left corner, then "From domain" | `summary_large_image` at 2:1, at least 300 × 157 px, under 5 MB, as JPG, PNG, WEBP or GIF, not SVG; only a GIF's first frame shows [9]. Every card type is in [X cards](x-cards.md) | Tags and image documented [9]; layout observed |
| LinkedIn | `og:title` and domain over the image, or a small card with a thumbnail | 1.91:1, at least 1200 × 627 px, at most 5 MB [10] | Documented [10] |
| Reddit | The poster's own title; the page title is not used | `og:image` as a small 4:3 thumbnail cropped from the center | Observed |
| Bluesky | Title, description, domain | Large image | Documented [11] |
| Mastodon | Site name, title, description; byline from `fediverse:creator` | Large image | Byline documented [12]; layout observed |
| Threads | Image, domain and `og:title` | Large image | Observed |

## Messaging and team chat

| Platform | Shows | Image | Basis |
| --- | --- | --- | --- |
| Discord | `og:site_name`, title, description; `theme-color` stripe | Large with `summary_large_image`. Video plays only with `og:video` and a video type or a `player` card, which reclassifies the page for every platform. Titles are trimmed at 70 bytes and descriptions at 350; an `og:site_name` over 256 characters or alt text over 4,096 stops the preview [13] | Documented [13] |
| Slack | Site name and favicon, title, description, `twitter:label`/`data` pairs | Up to 360 px wide | Unfurling documented [14, 15]; size observed |
| Microsoft Teams | Thumbnail, title, description, domain | A square crop from the center | Observed |
| Telegram | Site name, title, description | Large image | Observed |
| WhatsApp | Image, title, description, domain | Under 600 KB, at least 300 px wide, no wider than 4:1 | Documented [16] |
| iMessage | Image, title, domain; no description | At least 900 px wide; under 150 px it may be ignored or shown as an icon. Icons square, at least 108 px; the `apple-touch-icon` beside the title when there is no image. The page is read up to 1 MB, and its images and icons up to 10 MB together [17]. More in [Apple platforms](apple-platforms.md) | Documented [17] |
| Signal | Image, title, domain | Large image | Observed |

## Who fetches and keeps the card

- **Meta:** caches images by URL [7]. Posts already shared keep the copy it cached.
- **X:** re-reads a page's card roughly every seven days and caches images by URL, so a changed image needs a new address, such as one with an added query parameter [9].
- **Apple Messages:** does not follow meta refresh redirects or run JavaScript; it follows server redirects [17].
- **Discord:** fetches HTML only, through at most 5 redirects, 50 MB and 10 seconds, and caches a preview for about 30 minutes. To see a change at once, share the address with a new query string, such as `?v=2` [13].
- **Bluesky:** the posting app fetches the card once and stores it in the post [11], so a later change to the page does not reach that post.
- **Mastodon:** each server fetches its own copy when a post reaches it (observed).
- **Signal:** the sender's app fetches the preview, and the recipient never contacts the site (observed).
- **Telegram:** keeps its own cached preview, which `@WebpageBot` refreshes (observed).

## After deployment

- **Tools that fetch the live page:** Meta's Sharing Debugger, LinkedIn's Post Inspector, Discord's Embed Debugger, Google's URL Inspection and Bing Webmaster Tools' URL Inspection [7, 10, 13]. For structured data, see [Structured data](structured-data.md).
- **Replacing an image at the same address:** ask Meta's Sharing Debugger and LinkedIn's Post Inspector to fetch the page again [7, 10]. Posts already shared keep the copy each platform cached.
- **Telegram:** send the address to `@WebpageBot` to refresh its preview.
- **No public tool:** Slack, X, WhatsApp, iMessage and Signal. Slack unfurls links in posted messages [14], so post the link in a private channel or a message to yourself. Apps that preview while a message is written show the card in an unsent draft.

## Sources

1. Google Search Central, [Provide a site name to Google Search](https://developers.google.com/search/docs/appearance/site-names)
2. Google Search Central, [Influencing your title links in search results](https://developers.google.com/search/docs/appearance/title-link)
3. Google Search Central, [Define a favicon to show in search results](https://developers.google.com/search/docs/appearance/favicon-in-search)
4. Google Search Central blog (2025), [Simplifying the visible URL element on mobile search results](https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs)
5. Bing, [Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
6. DuckDuckGo Help, [Where do DuckDuckGo search results come from?](https://duckduckgo.com/duckduckgo-help-pages/results/sources/)
7. Meta for Developers, [A Guide to Sharing for Webmasters](https://developers.facebook.com/documentation/sharing/webmasters)
8. Meta for Developers, [Sharing best practices](https://developers.facebook.com/documentation/sharing/best-practices)
9. X Developer Platform, archived in 2026 after X took its card documentation down: [Cards markup](https://web.archive.org/web/20260201012312/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup); [Summary card with large image](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image); [Troubleshooting cards](https://web.archive.org/web/20260124210156/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards)
10. LinkedIn Help, [Make your website shareable on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a521928)
11. Bluesky Documentation, [Creating a post: website card embeds](https://docs.bsky.app/docs/advanced-guides/posts#website-card-embeds)
12. Mastodon blog (2024), [Highlighting journalism on Mastodon](https://blog.joinmastodon.org/2024/07/highlighting-journalism-on-mastodon/)
13. Discord Developer Documentation, [Link previews](https://docs.discord.com/developers/link-previews/overview)
14. Slack Developer Docs, [Unfurling links in messages](https://docs.slack.dev/messaging/unfurling-links-in-messages/)
15. Slack Platform Blog (2015), [Everything you ever wanted to know about unfurling](https://medium.com/slack-developer-blog/e64b4bb9254)
16. Meta for Developers, [WhatsApp link previews](https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/)
17. Apple, [TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages); [Ensuring beautiful rich links](https://developer.apple.com/videos/play/tech-talks/205/)
18. Google Search Central, [Discover and your website](https://developers.google.com/search/docs/appearance/google-discover)
19. Google Search Central, [Help your readers find your site through preferred sources in Google Search](https://developers.google.com/search/docs/appearance/preferred-sources)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/platform-previews.md). Written for this skill from the primary sources listed above.
