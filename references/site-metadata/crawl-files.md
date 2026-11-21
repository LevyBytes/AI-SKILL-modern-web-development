# Crawl files

Open when writing or changing robots.txt, a sitemap, or an IndexNow key file and its submissions.

## robots.txt

- **Place and form:** `/robots.txt` at the root of each host; it covers only that host, protocol and port [2]. It is a list of groups: one or more `User-agent` lines, then `Allow` and `Disallow` rules [1].
- **Google's fields:** Google reads `user-agent`, `allow`, `disallow` and `sitemap` and ignores every other field [2]. A crawler that does not know a line skips it.
- **Crawling, not indexing:** a `Disallow` stops crawling, not indexing. Google can still list a blocked address without a snippet. Use `noindex` on a crawlable page to keep it out of results [2].
- **Not access control:** the rules are not a form of access authorization, and any client can still fetch a disallowed address [1]. Protect private content with authentication.
- **Which group applies:** a crawler follows the group with the most specific user agent that matches it, and groups that name the same crawler are combined; a crawler named in its own group ignores the `*` group [2]. Crawler tokens are in [AI crawlers](ai-crawlers.md).
- **Which rule wins:** the longest matching path; when an `Allow` and a `Disallow` match equally, the less restrictive `Allow` wins [2]. Paths are case-sensitive and support `*` (any characters) and `$` (end of the URL) [2].
- **Size and encoding:** UTF-8 plain text of at most 500 KiB; Google ignores what follows that limit, and invalid lines [2].
- **Fetch results:** a 4xx other than 429 means no restrictions. A 5xx stops Google crawling for 12 hours, then it uses the last good copy for up to 30 days. Redirects are followed for at least five hops [2].
- **Caching:** Google usually caches the file for up to 24 hours, so changes take up to a day [2].
- **Sitemap lines:** `Sitemap:` takes an absolute URL, belongs to no group and can appear anywhere in the file [2].
- **Changing an existing file:** keep every existing line and add to it. Lines for AI use are covered in [AI usage preferences](ai-usage-preferences.md).

## Sitemaps

- **Format:** a UTF-8 `urlset` of `url` entries, each with a required `loc` and an optional `lastmod` in W3C date format, such as `2026-11-19` [3]. Entity-escape `&`, `<`, `>`, `'` and `"` in URLs [3].
- **Limits:** at most 50,000 URLs and 50 MB (52,428,800 bytes) uncompressed per file; split larger sites with a sitemap index file that lists the sitemaps [3]. A file may be gzip-compressed [3].
- **One host:** every URL in a sitemap must be on the same host [3].
- **`lastmod` must be true:** Google uses `lastmod` only when it is consistently and verifiably accurate, and ignores `priority` and `changefreq` [4]. Bing uses `lastmod` to decide what to recrawl and asks for real change dates, not build times [5].
- **Dating pages:** take the date the content last changed, as the page shows it. A build or deploy time is not a content date, and a policy's effective date is one only when the text changed on that date.
- **Discovery:** name the sitemap in robots.txt, and submit it in Search Console and Bing Webmaster Tools [4, 5].
- **Extensions:** images add `<image:image>` with `<image:loc>`, up to 1,000 per page [9]; videos add `<video:video>` with a thumbnail, title and description [10]; news sitemaps list only articles from the last two days, up to 1,000 [11]. hreflang alternates use `<xhtml:link>` ([Localized versions](localized-versions.md)).

## IndexNow

IndexNow tells participating search engines which addresses changed, and the engines share each submission with one another [6]. Google is not among the participating engines [7].

- **Key:** 8 to 128 characters from `a-z`, `A-Z`, `0-9` and `-` [6].
- **Key file:** a UTF-8 text file holding the key, on the same host [6].
  - **Default:** `/{key}.txt` at the root.
  - **Other names:** any other path or name, such as `/indexnow.txt`, works when every request names it as `keyLocation`.
  - **Scope:** a key file covers the addresses at and below its own folder, so a file at the root covers every page.
- **Request:** POST JSON to `https://api.indexnow.org/indexnow` with `host`, `key`, `keyLocation` and `urlList`, at most 10,000 addresses [6]. Submit addresses that were added, changed or deleted, after the new version is live.
- **Responses:** `200` or `202` accepted, `400` bad request, `403` key not valid, `422` addresses that do not belong to the host, `429` too many requests [6].
- **Bing:** its guidelines ask sites to report changes through IndexNow [8].
- **A deploy workflow:** on GitHub Pages, a job after each push to the publishing branch can read the changed pages from the push event, wait for Pages to publish, then submit them. The [preview scripts](preview-gallery.md) write such a workflow and dry-run it against a sample push.
  - **Repository rules:** before adding a workflow, read the repository's workflow rules and contract tests. They can fix the allowed events, token permissions and how actions are pinned.

## In the bundled scripts

- **Writing them:** `siteFiles.robots` and `siteFiles.sitemap` in the [preview configuration](preview-config.md) keep every existing line and entry. The sitemap builder adds `lastmod` dates and, with `images: true`, an `image:image` for each page's share image; it refuses a sitemap index or more than 50,000 URLs.
- **Checking them:** the [metadata audit](metadata-audit.md) parses robots.txt by Google's rules and checks the sitemap's namespace, size, URLs, hosts, escaping, dates, image, video and news entries, and hreflang alternates.

## Sources

1. IETF, [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
2. Google Search Central, [How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
3. sitemaps.org, [Sitemaps XML format](https://www.sitemaps.org/protocol.html)
4. Google Search Central, [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
5. Bing Webmaster Blog (2025), [Keeping content discoverable with sitemaps in AI powered search](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/)
6. IndexNow, [Documentation](https://www.indexnow.org/documentation)
7. IndexNow, [FAQ](https://www.indexnow.org/faq)
8. Bing, [Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
9. Google Search Central, [Image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
10. Google Search Central, [Video sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps)
11. Google Search Central, [News sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/crawl-files.md). Written for this skill from the primary sources listed above.
