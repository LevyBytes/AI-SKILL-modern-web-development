# Localized versions

Open when a site has the same page in several languages or for several regions, and search engines and link cards should send each reader to the right one.

## What hreflang does

- **It links versions, it does not detect language:** hreflang tells Google that pages are localized variations of the same content. Google works out a page's language from its text and does not use hreflang or the `lang` attribute for that [1].
- **`lang` still matters:** set `<html lang>` for screen readers, hyphenation and browser translation; it is an accessibility requirement, not a search signal.
- **Same content:** use it for translations and for regional variants of one language, such as prices in dollars and pounds [1].

## Three ways to declare it

- **Link elements in the head:** one `<link rel="alternate" hreflang="..." href="...">` per version, the page itself included [1].
- **HTTP header:** `Link: <https://example.com/file.pdf>; rel="alternate"; hreflang="en", <https://de.example.com/file.pdf>; rel="alternate"; hreflang="de"`, the same on every version; useful for PDFs and other files without a head [1].
- **Sitemap:** each `<url>` lists every version, itself included, as `<xhtml:link rel="alternate" hreflang="..." href="..."/>` children [1]. A static site can declare it here without touching the pages.
- **One method is enough:** the three are equivalent to Google, and using several brings no benefit in Search, only more to maintain [1].

## Rules every method shares

- **List every version, itself included,** on each version [1].
- **Return links:** if two pages do not both point to each other, Google ignores the pair, so that another site cannot claim to be a version of yours [1].
- **Fully qualified URLs,** with `https://` [1].
- **Canonical:** each version keeps a self-referencing canonical link [2].
- **Fallback:** `hreflang="x-default"` names the page for readers whose language matches none of the versions, typically a language selector or the main version [1].

## Codes

- **Form:** a language code, optionally a script, optionally a region: `de`, `en-GB`, `zh-Hant`, `zh-Hans-US` [1].
- **Language:** ISO 639-1 (two letters). A country code alone is wrong: `be` means Belarusian, not Belgium [1].
- **Region:** ISO 3166-1 alpha-2. Google does not support other region codes, such as the UN M.49 `es-419` [1]. The United Kingdom is `GB`, not `UK` [3].
- **Script:** ISO 15924, such as `Hant` and `Hans`. Google derives the script from the region when it is left out (`zh-TW` means Traditional Chinese) [1].
- **Case:** case-insensitive; upper-case regions follow the ISO convention [1].
- **Separator:** a hyphen. `en_GB` is the Open Graph locale form, not an hreflang code.

## Link cards and other readers

- **Open Graph:** `og:locale` names the page's own locale as `language_TERRITORY` (default `en_US`), and `og:locale:alternate` lists the others [4].
- **Feeds and readers:** a feed's language belongs in the feed itself (RSS `<language>`, Atom `xml:lang`); see [Feeds and embeds](feeds-and-embeds.md).

## Example for two languages

```html
<link rel="canonical" href="https://example.com/de/">
<link rel="alternate" hreflang="en" href="https://example.com/">
<link rel="alternate" hreflang="de" href="https://example.com/de/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
<meta property="og:locale" content="de_DE">
<meta property="og:locale:alternate" content="en_GB">
```

## In the bundled scripts

- **Proposing the links:** a page's `extraTags` in the proposed metadata can carry its hreflang links; they replace the page's existing set ([Preview configuration](preview-config.md)).
- **Checking them:** the [metadata audit](metadata-audit.md) checks every code against the IANA Language Subtag Registry, absolute URLs, the self-reference, duplicates and, between configured pages, the return links, in heads and in sitemaps.

## Sources

1. Google Search Central, [Tell Google about localized versions of your page](https://developers.google.com/search/docs/specialty/international/localized-versions)
2. Google Search Central, [How to specify a canonical URL with rel="canonical" and other methods](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
3. IANA, [Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry)
4. [The Open Graph protocol](https://ogp.me/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/localized-versions.md). Written for this skill from the primary sources listed above.
