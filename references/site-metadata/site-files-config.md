# Site files configuration

Open when writing the `siteFiles` part of `preview.config.json`: which robots.txt, sitemap, security.txt, IndexNow, llms.txt, ads.txt, manifest and `.well-known` files the scripts propose, and their options.

`build-site-files.ts` writes each file at its path in the site's repository under `proposed-files/`. An existing robots.txt or sitemap is the starting point and every existing line or entry is kept. Leave a key out to propose no such file. A value the standard does not allow is refused with a message naming the key.

## Crawl files

- **`robots`:** see [Crawl files](crawl-files.md), [AI usage preferences](ai-usage-preferences.md) and [AI crawlers](ai-crawlers.md).
  - **`contentSignal`:** a Content Signals line for the `*` group, such as `"search=yes, ai-input=yes, ai-train=yes"`.
  - **`contentUsage`:** an IETF usage line for the `*` group, such as `"train-ai=n"`.
  - **`aiTraining`:** `"allow"` or `"disallow"` for the shared `__usage_ai-training` token.
  - **`crawlers`:** `{ "<token>": "allow" | "disallow" }`, one group per crawler. A token that shares a group with others is refused; edit that group by hand.
- **`sitemap`:** `{ "lastmod": { "<page key>": "YYYY-MM-DD" }, "images": true }`. `images` adds each page's share image as `image:image`. Existing entries keep their order and extra elements; a sitemap index or more than 50,000 URLs is refused.
- **`indexNow`:** see [Crawl files](crawl-files.md).
  - **`keyFile`:** the key file's name; `indexnow.txt` by default. The key is generated once and kept on later runs.
  - **`workflow`:** `{ "path", "branch", "waitSeconds", "pullRequestEvent", "setupNode" }`, or `false` for no workflow.
  - **`setupNode`:** the repository's own pinned `actions/setup-node` reference, with its version comment.

## Contact, policy and preference files

- **`securityTxt`:** see [security.txt](security-txt.md).
  - **Fields:** `contact` (one or a list), `expires` (a date) or `expiresInDays`, `policy`, `preferredLanguages`, `encryption`, `acknowledgments`, `hiring` and `comment` lines.
  - **`canonical: false`** leaves out the Canonical line.
- **`tdmRep`:** `{ "reservation": 0 | 1, "policy": "<https URL>" }` for the whole site, or `"rules": [{ "location", "reservation", "policy" }]`; writes `/.well-known/tdmrep.json`. See [AI usage preferences](ai-usage-preferences.md).
- **`gpc`:** `{ "gpc": true | false, "lastUpdate": "YYYY-MM-DD" }`; writes `/.well-known/gpc.json`. State `true` only if the site honors the signal. See [Well-known files](well-known-files.md).
- **`llmsTxt`:** `true` builds llms.txt from the configured pages and the proposed titles and descriptions. An object can set `title`, `summary`, `details`, `pagesHeading`, `pages: false` and extra `sections` of `{ "heading", "links": [{ "title", "url", "notes" }] }`. See [Agent discovery files](agent-discovery-files.md).

## Advertising and app files

- **`adsTxt`, `appAdsTxt`:** see [ads.txt](ads-txt.md).
  - **`records`:** `[["<system domain>", "<account ID>", "DIRECT" | "RESELLER", "<certification ID>"]]`, the last item optional.
  - **`noSellers: true`:** the placeholder record for a site that authorizes no seller.
  - **Variables:** `contact`, `ownerDomain`, `managerDomain`, `inventoryPartnerDomain`, and for ads.txt only `subdomains`; each takes one value or a list.
  - **`comment`:** lines written as `#` comments at the top.
- **`appLinks`:** see [Native app links](native-app-links.md).
  - **`apple`:** `{ "appIDs": ["<Team ID>.<bundle ID>"], "components": [{ "/": "/*" }], "webcredentials": [], "appclips": [] }`; writes `/.well-known/apple-app-site-association`.
  - **`android`:** `{ "package": "com.example.app", "sha256": ["<fingerprint>"], "relations": [] }`, or a list of them; writes `/.well-known/assetlinks.json`.
- **`manifest`:** the manifest's members, passed through as given, plus `path` (`manifest.webmanifest` by default). `icons` defaults to the rendered PNG icons of 144 px and larger without the Apple icon, `start_url` to the site root and `display` to `standalone`. See [Web app manifest](../installed-web-apps/web-app-manifest.md).

## Placement

- **A site below its host's root:** robots.txt, ads.txt and every `.well-known` file only work at the root of the host, so the proposal notes say when the site's address has a path; the [metadata audit](metadata-audit.md) reports it as an error.
- **GitHub Pages:** when the site has no `.nojekyll` file, the notes for `.well-known` files say that Jekyll may leave the folder out; see [Well-known files](well-known-files.md). `"githubPages": false` in `siteFiles` stops that note for a site on another host.

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/site-files-config.md). Written for this skill from the bundled scripts and their tests.
