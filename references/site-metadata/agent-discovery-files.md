# Agent discovery files

Open when deciding whether to publish llms.txt, Markdown versions of pages or an ARD manifest for AI agents, writing them, or reading what Lighthouse's agentic browsing audits check.

## What they are and what they are not

- **Proposals:** llms.txt (version 2) and Agentic Resource Discovery (ARD, version 0.91) are proposals, not standards [1, 2].
- **Not for search:** Google says a site needs no new machine-readable files, AI text files or markup to appear in AI Overviews or AI Mode [3]. They are not crawl rules either: robots.txt still decides what crawlers may fetch ([AI crawlers](ai-crawlers.md)).
- **Who reads them:** agents that fetch a site while working, such as coding agents reading a library's documentation, and Chrome's experimental Lighthouse agentic browsing audits [1, 4].

## llms.txt

```markdown
# Example Tide Tables

> Tide times and heights for coastal stations, updated daily.

Times are local; heights are in metres above chart datum.

## Docs

- [Station list](https://example.com/stations.md): every station and its ID
- [Using the tables](https://example.com/help.md)

## Optional

- [Changelog](https://example.com/changes.md)
```

- **Where:** `/llms.txt` at the site root, or at any path, such as `/docs/llms.txt`, covering the pages under it; an agent uses the most specific one [1].
- **Required:** only the H1 with the site or project name [1].
- **Then, in order:** a blockquote summary, any paragraphs or lists without headings, then H2 sections of link lists, each item a `[name](url)` with optional `: notes` [1].
- **The `Optional` section:** links an agent can skip when it needs a shorter context [1].
- **Keep it small:** agents read or search it, then follow its links, so the file should fit in a model's context [1].

## Markdown versions of pages

- **Same URL plus `.md`:** `page.html.md`, or `page.md` in place of the extension; a URL without a file name uses `index.html.md` [1].
- **Linking them:** `<link rel="alternate" type="text/markdown" href="...">` points to a page's Markdown version, and `rel="describedby"` to the llms.txt that covers it; the same links work as an HTTP `Link` header [1].

## Agentic Resource Discovery

ARD describes a site's agentic resources, such as MCP servers, A2A agents and agent skills, so that agents and registries can find them [2].

- **Where:** `/.well-known/ard.json`, a JSON document with an `entries` array [2]. Consumers must fetch that path and must honor a `<link rel="ard" href="...">` in a page's head; robots.txt can also name entries with an `Agentmap:` line [2].
- **Each entry:** `identifier` (`urn:air:<publisher>:<name>`, anchored on the publisher's domain), `displayName`, `type` (a media type, such as `application/mcp-server-card+json`), and exactly one of `url` or inline `data` [2]. `representativeQueries` help registries match it in search [2].
- **The old name:** ARD replaced `/.well-known/ai-catalog.json` and `rel="ai-catalog"`; publishers need only the new path [2].
- **A site with no agentic resources** has no entries to list and needs no manifest.

## Lighthouse agentic browsing

- **Experimental:** the category needs Chrome 150 or later and reports a ratio of passed checks, not a 0 to 100 score [4].
- **llms.txt audit:** a server error fails it; a missing file (404) is marked not applicable, since the file is optional [5].
- **ARD audit:** looks for the manifest through `Agentmap:`, `rel="ard"`, the HTTP `Link` header and the well-known path, warns on the old `ai-catalog` routes, and validates what it finds against the ARD 0.91 conformance rules [6].

## In the bundled scripts

- **Writing llms.txt:** `siteFiles.llmsTxt` in the [preview configuration](preview-config.md) builds it from the configured pages and the proposed titles and descriptions, or from an options object.
- **Checking them:** the [metadata audit](metadata-audit.md) checks an llms.txt's H1, summary and links, an ARD manifest's entries, the old `ai-catalog.json` name, `rel="ard"` links and `Agentmap:` lines.

## Sources

1. [The /llms.txt file, v2](https://llmstxt.org/)
2. [Agentic Resource Discovery specification v0.91](https://agenticresourcediscovery.org/spec/)
3. Google Search Central, [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
4. Chrome for Developers, [Lighthouse agentic browsing scoring](https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring)
5. Chrome for Developers, Lighthouse, [llms.txt](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt)
6. Chrome for Developers, Lighthouse, [ard.json](https://developer.chrome.com/docs/lighthouse/agentic-browsing/ard)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/agent-discovery-files.md). Written for this skill from the primary sources listed above.
