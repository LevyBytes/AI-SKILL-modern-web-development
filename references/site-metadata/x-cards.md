# X cards

Open when writing the `twitter:` tags for a page shared on X, choosing a card type, or finding out why X shows no card or an old one.

X removed its card documentation from its developer site in 2026. The rules here come from X's own pages as archived between January and February 2026 [1, 2, 3, 4, 5], and X can change them without notice.

## Card types

| `twitter:card` | Shows | Notes |
| --- | --- | --- |
| `summary` | Title, description and a thumbnail | X may render one from Open Graph tags when `twitter:card` is absent [1]. |
| `summary_large_image` | A large image with the title | Images at 2:1, from 300 × 157 to 4096 × 4096 px [2]. |
| `player` | A video or audio player in an iframe | Needs X's approval before it shows [4]. |
| `app` | An app's name, icon, rating and install link | Data comes from the app stores [5]. |

## Tags and limits

| Tag | Rule [1] |
| --- | --- |
| `twitter:site` | The site's @username. It, or `twitter:site:id` with the account's numeric ID, is listed as required. |
| `twitter:creator` | The author's @username, or `twitter:creator:id`. |
| `twitter:title` | At most 70 characters. Falls back to `og:title`. |
| `twitter:description` | At most 200 characters. Falls back to `og:description`. |
| `twitter:image` | Under 5 MB; JPG, PNG, WEBP or GIF, only a GIF's first frame; not SVG. Falls back to `og:image`. |
| `twitter:image:alt` | At most 420 characters. Falls back to `og:image:alt`. |

- **Open Graph fallback:** with `og:type`, `og:title` and `og:description` but no `twitter:card`, X may render a summary card [1].
- **Its own tags first:** X reads `twitter:` tags before Open Graph ones, so a change made only to the Open Graph tags does not reach X once its own tags exist [1].
- **Image choice:** use an image unique to the page, not the site logo or an author photo used across pages [2]. Images under 144 × 144 px may not be fetched [3].
- **Slack's extra fields:** `twitter:label1` and `twitter:data1` are read by Slack, not X; see [Head tags](head-tags.md).

## Player card

- **Tags:** `twitter:player` (an https URL of the iframe page), `twitter:player:width` and `twitter:player:height`, and `twitter:image` for platforms that cannot play inline. `twitter:player:stream` can name the raw media file [4].
- **Image:** at least 68,600 pixels, such as 262 × 262 or 350 × 196, or the card does not render [4].
- **Policy:** https for the iframe and every asset with no mixed-content warning, a responsive player, no autoplay for content over 10 seconds, linear audio or video only, and no extra interactivity such as purchases or forms [4].
- **Where it plays:** on phones the card opens the player from the post's detail view; on the web the player opens when the post expands [4].
- **Apple Messages** plays the file in `twitter:player:stream` directly; see [Apple platforms](apple-platforms.md).

## App card

- **Tags:** `twitter:app:id:iphone`, `twitter:app:id:ipad` and `twitter:app:id:googleplay`, with matching `twitter:app:name:*` and `twitter:app:url:*` deep links, and `twitter:app:country` when the app is not in the US store [5].
- **IDs:** the App Store ID is the number alone; an "id" prefix is the most common reason an app card fails [3, 5].
- **Data from the stores:** X fetches the icon, rating and price from the store, so the app must be public there, and the store image must be under 1 MB [5].
- **Store links:** a post that links straight to an App Store or Google Play page gets an app card automatically [5].

## Fetching and caching

- **Crawler:** `Twitterbot`, which follows Google's robots.txt rules; a robots.txt that blocks it means no card [3].
- **Limits:** TLS 1.1 or later, and at most 2 MB of page response [3].
- **Refresh:** X re-reads a page's card tags roughly every seven days. To see a change sooner, share the address with an added query parameter or fragment [3].
- **Images are cached by URL:** a changed image needs a new address, such as one with a version parameter [3].
- **No preview tool:** X has no public tool that previews a card. The bundled [preview gallery](preview-gallery.md) mocks the X card, and the [metadata audit](metadata-audit.md) checks every rule above that a static file shows.

## Sources

1. X Developer Platform, [Cards markup](https://web.archive.org/web/20260201012312/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) (archived 1 February 2026)
2. X Developer Platform, [Summary card with large image](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image) (archived 4 February 2026)
3. X Developer Platform, [Troubleshooting cards](https://web.archive.org/web/20260124210156/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards) (archived 24 January 2026)
4. X Developer Platform, [Player card](https://web.archive.org/web/20260204163853/https://developer.x.com/en/docs/x-for-websites/cards/overview/player-card) (archived 4 February 2026)
5. X Developer Platform, [App card](https://web.archive.org/web/20260204163853/https://developer.x.com/en/docs/x-for-websites/cards/overview/app-card) (archived 4 February 2026)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/x-cards.md). Written for this skill from the primary sources listed above.
