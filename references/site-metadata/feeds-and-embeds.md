# Feeds and embeds

Open when publishing an RSS, Atom or JSON Feed, letting browsers and readers find it, pushing updates with WebSub, or offering an oEmbed endpoint so other sites and chat apps can embed a page.

## Choosing a format

| Format | Media type | Required [1, 2, 3] |
| --- | --- | --- |
| RSS 2.0 | `application/rss+xml` | A channel with `title`, `link` and `description`; each item has a `title` or a `description`. |
| Atom (RFC 4287) | `application/atom+xml` | A feed with `id`, `title` and `updated`; each entry has `id`, `title` and `updated`; an `author` on the feed or on every entry. |
| JSON Feed 1.1 | `application/feed+json` | `version` (`https://jsonfeed.org/version/1.1`), `title` and `items`; each item has an `id` and `content_html` or `content_text`. |

- **Dates:** Atom dates are RFC 3339, such as `2026-11-21T09:00:00Z`, with an uppercase `T` and `Z` [2]; RSS dates follow RFC 822, such as `Sat, 21 Nov 2026 09:00:00 GMT` [1].
- **Stable item IDs:** readers use an RSS `guid` to tell new items from old [1]; an Atom `id` must not change when the entry is moved or republished [2], and a JSON Feed `id` should stay the same when the item is updated [3].
- **A self link:** an Atom feed should have `<link rel="self">` with its own URL [2]; JSON Feed's `feed_url` and `home_page_url` are strongly recommended [3].
- **Language:** RSS `<language>`, Atom `xml:lang` and JSON Feed `language` name it [1, 2, 3].
- **Caching:** RSS `<ttl>` gives the minutes a reader may cache the channel [1].

## Autodiscovery

```html
<link rel="alternate" type="application/rss+xml" title="Example updates" href="https://example.com/feed.xml">
```

- **In the head** of the home page and any page where a reader may want the feed [4].
- **`rel` exactly `alternate`**, in lowercase, with no other keywords, and a lowercase `type` [4].
- **A full URL:** some software ignores the base URL, so give the feed's whole address [4].
- **Several feeds:** one link each, each with its own `title`, which readers show in their list [4].

## WebSub

- **What it does:** a hub pushes each update to subscribers instead of having them poll the feed [5].
- **Discovery:** the feed names one or more hubs with `rel="hub"` and its topic URL with exactly one `rel="self"`, as links in the feed or as HTTP `Link` headers [5].
- **Publishing:** after each change, the publisher notifies every hub it names [5].

## oEmbed

oEmbed lets another site turn a link to a page into an embed by asking the provider's endpoint for a JSON or XML description [6].

- **Discovery:** `<link rel="alternate" type="application/json+oembed" href="https://example.com/oembed?url=...&format=json">` in the page's head, or the same as an HTTP `Link` header; XML uses `text/xml+oembed` [6].
- **Response:** `type` (`photo`, `video`, `link` or `rich`) and `version` `"1.0"`. A `photo` adds `url`, `width` and `height`; a `video` or `rich` adds `html`, `width` and `height` [6].
- **Thumbnails:** `thumbnail_url`, `thumbnail_width` and `thumbnail_height` go together [6].
- **Requests:** HTTP GET with `url`, and optional `maxwidth`, `maxheight` and `format`, which the provider must respect where they apply [6].
- **On a static host:** a site without a server can publish a fixed JSON response per page and link it from that page.

### Discord's use of oEmbed

- **JSON only,** from the first matching link [7].
- **Fills gaps:** it runs after Open Graph, so its `title`, `thumbnail_url` and `type` apply only when the page's tags leave them out [7].
- **Its own fields:** `author_name` and `author_url` set an author line, which only oEmbed can give; `provider_name` and `provider_url` replace `og:site_name` and link it [7].
- **Ignored:** `html`, `url`, `width`, `height` and `cache_age`, and any fetch or parse error [7].

## In the bundled scripts

The [metadata audit](metadata-audit.md) checks every feed and oEmbed response a page links against the rules above, the autodiscovery links' form, and WebSub's self link. A feed link proposed in `extraTags` replaces the page's existing one; see [Preview configuration](preview-config.md).

## Sources

1. RSS Advisory Board, [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
2. IETF, [RFC 4287: The Atom Syndication Format](https://www.rfc-editor.org/rfc/rfc4287)
3. [JSON Feed Version 1.1](https://www.jsonfeed.org/version/1.1/)
4. RSS Advisory Board, [RSS Autodiscovery](https://www.rssboard.org/rss-autodiscovery)
5. W3C, [WebSub](https://www.w3.org/TR/websub/)
6. [oEmbed](https://oembed.com/)
7. Discord Developer Documentation, [Link previews](https://docs.discord.com/developers/link-previews/overview)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/feeds-and-embeds.md). Written for this skill from the primary sources listed above.
