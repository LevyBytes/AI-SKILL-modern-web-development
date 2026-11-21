# AI crawlers

Open when writing robots.txt groups for AI companies' crawlers, deciding which ones to allow, or reading which crawler in a log fetched a page and why.

Each company names its crawlers in robots.txt `User-agent` lines. A crawler that is not named follows the `User-agent: *` group, so a site that allows every crawler needs no lines here. What the shared AI-training token and other site-wide preferences do is in [AI usage preferences](ai-usage-preferences.md); robots.txt syntax is in [Crawl files](crawl-files.md).

## Tokens by purpose

| Token | Company | Purpose | What to know |
| --- | --- | --- | --- |
| `Google-Extended` | Google | Training Gemini models and grounding Gemini answers [1] | Keeps the content out of that training and grounding; Search inclusion and ranking do not change [1]. |
| `Applebot-Extended` | Apple | Training Apple's foundation models [2] | Keeps the content out of that training; search results do not change [2]. |
| `GPTBot` | OpenAI | Crawling for training OpenAI's foundation models [3] | Says the content should not be used for that training [3]. |
| `OAI-SearchBot` | OpenAI | Surfacing sites in ChatGPT search [3] | Removes the site from ChatGPT search answers, though it can still appear as a navigation link [3]. |
| `OAI-AdsBot` | OpenAI | Checking pages submitted as ChatGPT ads [3] | Visits only submitted ad pages; its data does not train models [3]. |
| `ChatGPT-User` | OpenAI | Pages fetched while answering a ChatGPT user [3] | robots.txt rules may not apply, because a user started the fetch [3]. |
| `ClaudeBot` | Anthropic | Collecting content that may train Anthropic's models [4] | Excludes the site's future content from training data [4]. |
| `Claude-SearchBot` | Anthropic | Indexing for Claude's search results [4] | Removes the site from that index, which may reduce its visibility in answers [4]. |
| `Claude-User` | Anthropic | Pages fetched when a person asks Claude a question [4] | Stops those fetches [4]. |
| `PerplexityBot` | Perplexity | Surfacing and linking sites in Perplexity search; not training [5] | Removes the site from Perplexity search [5]. |
| `Perplexity-User` | Perplexity | Pages fetched while answering a user; not training [5] | Generally ignores robots.txt, because a user requested the fetch [5]. |
| `meta-externalagent` | Meta | Training foundation AI models, or indexing content directly [6] | Stops those crawls [6]. |
| `meta-webindexer` | Meta | Citing and linking content in Meta AI answers [6] | Stops those crawls [6]. |
| `meta-externalfetcher` | Meta | Links fetched at a user's request, including AI agents doing tasks [6] | May bypass robots.txt [6]. |
| `CCBot` | Common Crawl | An open web dataset anyone can use [7] | Stops Common Crawl's crawling [7]. |

- **Search crawlers are separate:** `Googlebot`, `Bingbot` and `Applebot` crawl for search, so disallowing them takes the site out of that search. Their AI answers follow snippet rules ([Indexing controls](indexing-controls.md)) and, for Bing, page-level tags rather than robots.txt groups [8].
- **Link preview fetchers:** `facebookexternalhit` builds link cards in Facebook, Instagram and Messenger and may bypass robots.txt for security checks [6]; `Twitterbot` builds X cards ([X cards](x-cards.md)). Blocking either one removes the card.

## Rules that change the result

- **Each setting is independent:** OpenAI lets a site allow `OAI-SearchBot` for search and disallow `GPTBot` for training; when both are allowed it may use one crawl for both [3].
- **Named rules win at Anthropic:** from 30 October 2026, Anthropic recognizes a machine-readable "no AI training" preference based on the IETF aipref drafts. A robots.txt rule that names `ClaudeBot` takes priority over that general preference for its paths [4].
- **Google reads the shared token from 2027:** Google plans to support `User-agent: __usage_ai-training` in early 2027 [1]; see [AI usage preferences](ai-usage-preferences.md).
- **Applebot without its own group** follows the rules for `Googlebot` [2].
- **Crawl-delay:** Anthropic supports it [4]; Applebot does not [2], and Google's parser does not read it [9].
- **Every host:** Anthropic asks for the rules in the robots.txt of each subdomain to be covered [4]; that holds for every crawler, since a robots.txt file covers only its own host, protocol and port [9].
- **Timing:** OpenAI's search systems take about 24 hours to follow a robots.txt change [3], and Meta's crawlers may cache the file for up to 24 hours [6].
- **Blocking by IP instead:** Anthropic warns that IP blocks may not give a lasting opt-out, because they also stop it reading robots.txt [4].

## Verifying a crawler

- **Published IP ranges:** OpenAI (`openai.com/gptbot.json`, `searchbot.json`, `adsbot.json`, `chatgpt-user.json`) [3], Perplexity (`perplexity.ai/perplexitybot.json`, `perplexity-user.json`) [5], Common Crawl (`index.commoncrawl.org/ccbot.json`) [7] and Apple [2].
- **Reverse DNS:** Applebot resolves under `*.applebot.apple.com` [2] and CCBot under `crawl.commoncrawl.org` [7]; check that the forward lookup returns the same address.
- **User-agent strings alone prove nothing:** Common Crawl notes crawlers that falsely call themselves CCBot [7].

## Example groups

```text
# Search and answers: allowed. Model training: not allowed.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: meta-externalagent
User-agent: CCBot
Disallow: /

User-agent: *
Allow: /
```

## In the bundled scripts

- **Writing groups:** `siteFiles.robots.crawlers` in the [preview configuration](preview-config.md) adds or replaces one group per token, set to `allow` or `disallow`; the shared token has its own `aiTraining` setting.
- **Checking them:** the [metadata audit](metadata-audit.md) reports what every documented token above may fetch on the home page, and that `Crawl-delay` is read only by some crawlers.

## Sources

1. Google, [Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
2. Apple Support, [About Applebot](https://support.apple.com/en-us/119829)
3. OpenAI, [Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots)
4. Anthropic, [Does Anthropic crawl data from the web, and how can site owners block the crawler?](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
5. Perplexity, [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
6. Meta for Developers, [Meta Web Crawlers](https://developers.facebook.com/documentation/sharing/webmasters/web-crawlers)
7. Common Crawl, [CCBot](https://commoncrawl.org/ccbot)
8. Bing Webmaster Tools, [New AI preferences](https://www.bing.com/webmasters/help/new-ai-preferences-2t1cc16d)
9. Google Search Central, [How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/ai-crawlers.md). Written for this skill from the primary sources listed above.
