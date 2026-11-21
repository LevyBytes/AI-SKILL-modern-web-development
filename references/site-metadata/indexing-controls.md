# Indexing controls

Open when keeping a page or file out of search results, limiting its snippet or image preview, addressing one crawler's robots rules, or choosing a page's canonical address.

## Where the rules go

- **Meta tag:** `<meta name="robots" content="noindex, nosnippet">` speaks to every crawler. A crawler's own name addresses it alone: `googlebot`, `googlebot-news` [1], `bingbot` [5] or `applebot` [4].
- **Combining rules:** separate them with commas or use several tags; names and values are case-insensitive. When rules conflict, Google applies the more restrictive one [1].
- **In the body:** Google also reads robots meta tags placed in the body [1]; other crawlers may read only the head, so keep them in the head.
- **HTTP header:** `X-Robots-Tag: noindex` carries the same rules for files that have no head, such as PDFs and images. Prefix a crawler's name to address it, as in `X-Robots-Tag: googlebot: nofollow` or `X-Robots-Tag: applebot: nosnippet` [1, 4]. Static hosts that cannot set headers can only use meta tags.

## Google's rules

| Rule | Effect [1] |
| --- | --- |
| `noindex` | Keep the page out of results. |
| `nofollow` | Do not follow the page's links. |
| `none` | Same as `noindex, nofollow`. |
| `nosnippet` | No text snippet or video preview, and no use of the content as a direct input for AI Overviews and AI Mode. |
| `max-snippet:[n]` | At most n characters of snippet, which also limits how much feeds AI Overviews and AI Mode; `0` is none, `-1` no limit. |
| `max-image-preview:[none, standard, large]` | The largest image preview allowed. Google Discover's large cards need `large` [7]. |
| `max-video-preview:[n]` | At most n seconds of video preview; `-1` no limit. |
| `indexifembedded` | With `noindex`, still index the content when it is embedded in another page through an iframe. |
| `notranslate` | Do not offer a translation in results. |
| `noimageindex` | Do not index the page's images. |
| `unavailable_after:[date]` | Drop the page after a date in RFC 822, RFC 850 or ISO 8601 form. |

- **Defaults:** `index` and `follow` (or `all`) are the default and need no tag [1].
- **No longer used by Google:** `noarchive`, `nocache` and `nositelinkssearchbox` [1]. Bing reads `noarchive` and `nocache` as AI controls until its new preferences replace them; see [AI usage preferences](ai-usage-preferences.md).
- **`data-nosnippet`:** an attribute on a `span`, `div` or `section` element that keeps that element's text out of snippets [1].
- **Other Google tags:** `<meta name="google" content="nopagereadaloud">` stops Google's text-to-speech services reading the page aloud [6].

## Other crawlers

- **Applebot:** reads `noindex`, `nosnippet`, `nofollow`, `none` and `all`. `nosnippet` also keeps content out of the context Apple's AI models use for answers in Siri and Search [4].
- **Applebot without its own rules:** robots.txt rules that name Googlebot but not Applebot also apply to Applebot [4].
- **Bing:** reads the standard rules, and from 1 February 2027 its AI training and grounding preferences in `<meta name="Bingbot">` [5].

## Crawling and indexing are separate

- **`noindex` needs crawling:** a crawler reads `noindex` only on a page it may fetch. A page disallowed in robots.txt can still be listed by address, without a snippet [1, 3].
- **Keeping a page out:** allow crawling and set `noindex`. Disallow it in robots.txt only to save crawling, not to hide it.
- **Sitemaps:** list only pages meant to be indexed; see [Crawl files](crawl-files.md).

## Canonical addresses

- **Signals, strongest first:** redirects, `rel="canonical"` annotations, then inclusion in a sitemap [2].
- **The link element:** `<link rel="canonical" href="https://example.com/page">` in the head. Use an absolute URL; relative ones work but invite mistakes [2].
- **The header:** `Link: <https://example.com/file.pdf>; rel="canonical"` for files without a head [2].
- **Self-referencing:** put a canonical link on the canonical page too, and keep it when the page has hreflang alternates [2].
- **What not to use:** robots.txt and the URL removal tool do not canonicalize, and `noindex` takes a page out of Search altogether [2].
- **Agree everywhere:** give the same URL in the canonical link, `og:url`, the sitemap and internal links.

## Check it

- **Before deployment:** the bundled [metadata audit](metadata-audit.md) reads every robots value, flags unknown or retired ones, a `noindex` page listed in the sitemap or blocked in robots.txt, and a canonical page that is itself `noindex`.
- **After deployment:** Search Console's URL Inspection shows which canonical Google chose and whether the page is indexed.

## Sources

1. Google Search Central, [Robots meta tag, data-nosnippet and X-Robots-Tag specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
2. Google Search Central, [How to specify a canonical URL with rel="canonical" and other methods](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
3. Google Search Central, [How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
4. Apple Support, [About Applebot](https://support.apple.com/en-us/119829)
5. Bing blog (2026), [Your content, your choice: clearer preferences for training and grounding](https://blogs.bing.com/search/2026/10/your-content-your-choice-clearer-preferences-for-training-and-grounding/)
6. Google Search Central, [Meta tags and attributes that Google supports](https://developers.google.com/search/docs/crawling-indexing/special-tags)
7. Google Search Central, [Discover and your website](https://developers.google.com/search/docs/appearance/google-discover)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/indexing-controls.md). Written for this skill from the primary sources listed above.
