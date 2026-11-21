# AI usage preferences

Open when stating whether AI systems may train on a site or use it to answer questions, or when a request mentions Content Signals, Google-Extended, the shared training token, IETF Content-Usage, TDMRep or Bing's grounding preference. Each company's crawler tokens are in [AI crawlers](ai-crawlers.md).

These controls change quickly. Check each source's date before relying on it, and record the site owner's choice in their own words.

## What each control does

| Control | Where | Effect | Status |
| --- | --- | --- | --- |
| Snippet controls | `nosnippet`, `max-snippet` and `noindex` robots values, the `data-nosnippet` attribute; see [Head tags](head-tags.md) | Google applies them to AI Overviews and AI Mode as to ordinary snippets [1]. | In force |
| Search generative AI control | A Search Console setting for the whole site | Manages the site's inclusion in generative AI features on Google Search, including AI Overviews and AI Mode [10]. | In force |
| `Google-Extended` | robots.txt user-agent | Covers use of the site to train Gemini models and to ground Gemini answers. It does not change inclusion or ranking in Google Search [2]. | In force |
| Shared training token | robots.txt group `User-agent: __usage_ai-training` | `Disallow` states a preference against AI training on those paths; `Allow` states one in favor. A `User-agent: *` group does not match it [3]. | Internet-Draft; Google [4] and Bing [5] say they will read it from 2027, and Anthropic recognizes an IETF-based no-training signal from 30 October 2026 [11] |
| Bing AI grounding | Page meta tag, or `X-Robots-Tag` header | `Allow` is the default. `DisallowExtended` allows grounding only in Microsoft's own experiences, and `Disallow` stops it. It cannot be set in robots.txt [5]. | From 1 February 2027 |
| Content Signals | `Content-Signal:` line in a robots.txt group | `search`, `ai-input` and `ai-train`, each `yes` or `no` [6]. | Cloudflare's policy; Google ignores the line, which is outside its robots.txt fields [7] |
| IETF AI preferences | A `Content-Usage:` line in a robots.txt group, optionally with a path, or a `Content-Usage` HTTP header | `train-ai` (training generative models), `ai-use` (input to a generative model) and `search`, each `y` or `n`, such as `Content-Usage: train-ai=n` [8, 12]. | Working group drafts |
| TDMRep | `/.well-known/tdmrep.json`, a `tdm-reservation` HTTP header or `<meta name="tdm-reservation" content="1">` | `1` reserves text and data mining rights, the opt-out of Article 4 of the EU copyright directive 2019/790; `tdm-policy` links the terms for licensing them [13]. | W3C Community Group report |
| `llms.txt` | A file at the site root | Guidance for agents, not a usage preference; Google says AI features need no new machine-readable files [1]. See [Agent discovery files](agent-discovery-files.md). | Not a standard |

## Details that change the choice

- **Google reads the shared token as Google-Extended:** if a site disallows training with the shared token and names no `Google-Extended` group, Google plans to treat it as a `Google-Extended` disallow. That also takes the site out of grounding in Gemini apps [4].
- **Bing's old controls change meaning:** Bing's grounding and training preferences replace `noarchive` and `nocache` as its AI controls. Sites that rely on those tags have until 1 March 2027 to set the new preferences [5].
- **Training is not search:** opting out of training does not remove a site from Google or Bing search results [2, 5].
- **IETF rules apply only to crawlable paths:** a `Content-Usage` line says how fetched content may be used; `Allow` and `Disallow` still decide what is fetched, and a disallowed path carries no preference [12].
- **TDMRep layers:** a header overrides the well-known file, and HTML metadata overrides both; use one channel where possible [13].
- **Named crawlers win at Anthropic:** a robots.txt rule naming `ClaudeBot` takes priority over the general no-training signal for its paths [11].
- **CDN defaults:** Cloudflare's managed robots.txt can add Content Signals with `ai-train=no` for a site [9]. A site that wants AI use can state `yes` in its own file, so a default does not speak for it.

## Lines for a site that allows AI use

```text
# Every crawler may read every page.
# Content signals: search indexing, use in AI answers and AI model training are allowed.
# IETF AI preferences (Internet-Draft): AI training is allowed.
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Content-Usage: train-ai=y
Allow: /

# The shared AI-training preference token: training on this site's content is allowed.
User-agent: __usage_ai-training
Allow: /

Sitemap: https://example.com/sitemap.xml
```

- **Opting out instead:** use `Disallow: /` under `__usage_ai-training`, `ai-train=no` in the Content Signals line and `train-ai=n` in the `Content-Usage` line.
- **Not stating anything:** without these lines, each scheme treats AI use as allowed [3, 5, 6], unless a CDN adds its own lines, as Cloudflare's managed robots.txt can [9].
- **The rest of the file:** groups, fields and sitemap lines are in [Crawl files](crawl-files.md).

## Sources

1. Google Search Central, [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
2. Google, [Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
3. IETF, [draft-kelley-aipref-training-preference-signal: Machine-Readable Training Preference Signal](https://datatracker.ietf.org/doc/draft-kelley-aipref-training-preference-signal/)
4. Google Search Central blog (2026), [Supporting a shared AI training control for websites](https://developers.google.com/search/blog/2026/10/ai-training-control)
5. Bing Webmaster Tools, [New AI preferences](https://www.bing.com/webmasters/help/new-ai-preferences-2t1cc16d); Bing blog (2026), [Your content, your choice: clearer preferences for training and grounding](https://blogs.bing.com/search/2026/10/your-content-your-choice-clearer-preferences-for-training-and-grounding/)
6. Cloudflare blog (2025), [Giving users choice with Cloudflare's new Content Signals Policy](https://blog.cloudflare.com/content-signals-policy/)
7. Google Search Central, [How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
8. IETF, [draft-ietf-aipref-attach: Associating AI Usage Preferences with Content in HTTP](https://datatracker.ietf.org/doc/draft-ietf-aipref-attach/); [AI Preferences working group](https://datatracker.ietf.org/wg/aipref/about/)
9. Cloudflare Docs, [Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
10. Google Search Central, [Control what you share with Google Search](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share)
11. Anthropic, [Does Anthropic crawl data from the web, and how can site owners block the crawler?](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
12. IETF, [draft-ietf-aipref-vocab: A Vocabulary For Expressing AI Usage Preferences](https://datatracker.ietf.org/doc/draft-ietf-aipref-vocab/)
13. W3C Community Group report, [TDM Reservation Protocol (TDMRep)](https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240202/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/ai-usage-preferences.md). Written for this skill from the primary sources listed above.
