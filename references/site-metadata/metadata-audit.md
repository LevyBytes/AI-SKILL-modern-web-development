# Metadata audit

Open when checking a site's head tags and metadata files before deployment with the bundled audit, reading its findings, or knowing what it cannot see.

## What it checks

| Area | Rules from |
| --- | --- |
| Document basics: `<meta charset>` in the first 1024 bytes, `<html lang>`, one `<title>`, page size | [Head tags](head-tags.md), [Apple platforms](apple-platforms.md) |
| Titles, descriptions and duplicates across pages | [Titles and descriptions](titles-and-descriptions.md) |
| Robots meta values, canonical links, `noindex` against the sitemap and robots.txt | [Indexing controls](indexing-controls.md) |
| hreflang codes against the IANA Language Subtag Registry, self links and return links | [Localized versions](localized-versions.md) |
| Open Graph properties and types, X card tags and limits | [Open Graph](open-graph.md), [X cards](x-cards.md) |
| The share image's size, type, weight and embedded metadata (XMP, IPTC, Exif GPS, C2PA) | [Share image design](share-image-design.md), [Image metadata](image-metadata.md) |
| Icons, the Apple touch icon and the manifest | [Site icons](site-icons.md), [Web app manifest](../installed-web-apps/web-app-manifest.md) |
| JSON-LD syntax, required properties per Google feature, dates, ratings, prices, retired types | [Structured data](structured-data.md), [Structured data features](structured-data-features.md) |
| robots.txt syntax, groups, crawler tokens, Content Signals and IETF usage lines, sitemaps | [Crawl files](crawl-files.md), [AI crawlers](ai-crawlers.md), [AI usage preferences](ai-usage-preferences.md) |
| `security.txt`, `.well-known` files and their placement | [security.txt](security-txt.md), [Well-known files](well-known-files.md) |
| Feeds and their autodiscovery links, WebSub, oEmbed | [Feeds and embeds](feeds-and-embeds.md) |
| Smart App Banner, app link files | [Native app links](native-app-links.md) |
| `rel="me"`, `fediverse:creator`, verification tags and files | [Identity and verification](identity-and-verification.md) |
| `llms.txt`, ARD manifests, `ads.txt`, TDMRep, GPC | [Agent discovery files](agent-discovery-files.md), [ads.txt](ads-txt.md), [AI usage preferences](ai-usage-preferences.md) |

## Running it

It runs as the fifth step of `run-previews.ts`, after the gallery, share cards, icons and site files; see [Preview gallery](preview-gallery.md). To rerun it alone on an existing output folder:

```powershell
node scripts/share-previews/check-metadata.ts --config <work>/preview.config.json --out <work>/previews
```

The site is only read. Nothing is fetched from the network.

## Two states

- **Source:** the configured pages and every file in the site root, as they are now.
- **Proposed:** each page's head after the proposed metadata is merged in, as `apply-proposals.ts` would write it, with the files in `proposed-files/` laid over the site's.
- **Why both:** the source state shows what is wrong today; the proposed state proves the proposal fixes it without adding new errors.

## Reading the findings

| Level | Gallery label | Meaning |
| --- | --- | --- |
| `error` | Error | Breaks a standard or a platform's stated rule; the tag or file will be ignored or misread. |
| `warn` | Check | Likely wrong, or makes the page ineligible for a feature; decide it with the owner. |
| `info` | Note | Context: a platform's behavior, a retired feature, or a choice worth knowing about. |
| `ok` | Passes | A rule that was checked and met. |

- **Where they go:** `check/metadata.json` holds every finding of both states, per page and for the site; `metadata-audit.js` feeds the gallery's Audit section.
- **Exit status:** 1 when the proposed state has an error, or the source state when nothing is proposed; 0 otherwise. Warnings never fail it.
- **Fixing a finding:** change the proposed metadata or the `siteFiles` settings in the [preview configuration](preview-config.md), then run the previews again.

## What it cannot see

- **HTTP headers:** `Content-Type`, `X-Robots-Tag`, `Link` headers, redirects and status codes come from the server, not the files. Request the deployed URLs to check them, especially for files without an extension.
- **The deployed site:** a CDN, image optimizer or build step can change files after they leave the repository.
- **Script-built tags:** only the HTML files are read, so tags added by JavaScript are invisible to it, as they are to link previews that run no JavaScript, such as Apple Messages ([Apple platforms](apple-platforms.md)).
- **Unconfigured pages:** only the pages in the configuration are audited.
- **Meaning:** it checks that markup is well formed and complete, not that it matches what the page shows, which Google's structured data rules require.
- **Live platforms:** what a platform shows today needs its own tools after deployment; see [Platform previews](platform-previews.md).

## Testing the rules

`test-metadata-rules.ts` runs each rule against small in-memory sites, with negative controls that must be caught, and `test-share-previews.ts` runs it after the end-to-end build of the bundled fixture site.

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/metadata-audit.md). Written for this skill from the bundled scripts and their tests.
